const User = require('../models/User');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Create a simple verification schema (could be moved to models later)
const verifications = new Map(); // In-memory store for now, should use MongoDB collection

// Python verification service URL
const { 
    RekognitionClient, 
    CompareFacesCommand,
    CreateFaceLivenessSessionCommand,
    GetFaceLivenessSessionResultsCommand
} = require("@aws-sdk/client-rekognition");

// Initialize AWS Client
console.log("DEBUG: AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 5) + "..." : "MISSING");
console.log("DEBUG: AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY ? "EXISTS" : "MISSING");
console.log("DEBUG: AWS_REGION:", process.env.AWS_REGION);

// Ensure region is set
const awsRegion = process.env.AWS_REGION || "us-east-1";

const rekognition = new RekognitionClient({
  region: awsRegion,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// @desc    Create Liveness Session
// @route   POST /api/verification/liveness/session
// @access  Private
exports.createLivenessSession = async (req, res) => {
    try {
        const command = new CreateFaceLivenessSessionCommand({
             // ClientRequestToken is optional but good for idempotency
             ClientRequestToken: `${req.user._id}-${Date.now()}`
        });

        const response = await rekognition.send(command);
        
        res.json({
            success: true,
            sessionId: response.SessionId
        });
    } catch (error) {
        console.error("Error creating liveness session:", error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to create liveness session: ${error.message}`,
            errorName: error.name,
            stack: error.stack
        });
    }
};

// @desc    Get Liveness Results & Verify
// @route   GET /api/verification/liveness/results/:sessionId
// @access  Private
// @desc    Get Liveness Results & Verify
// @route   GET /api/verification/liveness/results/:sessionId
// @access  Private
exports.getLivenessSessionResults = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user._id;

        const command = new GetFaceLivenessSessionResultsCommand({
            SessionId: sessionId
        });

        const response = await rekognition.send(command);
        
        // 1. Security Check 1: Is it a real human? (Liveness Check)
        // User requested > 90% confidence
        const isLive = response.Status === "SUCCEEDED" && response.Confidence >= 90;
        
        if (!isLive) {
             console.log(`❌ Liveness Failed for user ${userId}. Confidence: ${response.Confidence}`);
             return res.json({
                 success: false,
                 verified: false,
                 message: "Liveness check failed. Please try again."
             });
        }

        // 2. Security Check 2: Is it the RIGHT human? (Face Match)
        if (response.ReferenceImage) {
             const user = await User.findById(userId).select('photos mainPhotoIndex');
             if (!user || (!user.photos?.length && !user.profilePhotoKey)) {
                 return res.status(400).json({ success: false, message: 'No profile photo to match against.' });
             }

             const targetIndex = user.mainPhotoIndex || 0;
             const profilePhotoUrl = user.photos[targetIndex];
             
             // Prepare Source Image (The Live Reference)
             let sourceImage = {};
             if (response.ReferenceImage.Bytes) {
                 sourceImage = { Bytes: Buffer.from(response.ReferenceImage.Bytes) };
             } else if (response.ReferenceImage.S3Object) {
                 sourceImage = { S3Object: response.ReferenceImage.S3Object };
             } else {
                 return res.json({ success: false, message: "Liveness succeeded but no reference image captured." });
             }

             // Prepare Target Image (The Stored Profile Photo)
             // Ideally use S3 Object if you store keys, but here we fetch the URL as bytes
             let targetImage = {};
             try {
                const imageResponse = await axios.get(profilePhotoUrl, { responseType: 'arraybuffer' });
                targetImage = { Bytes: Buffer.from(imageResponse.data) };
             } catch (err) {
                 return res.status(400).json({ success: false, message: 'Failed to retrieve profile photo.' });
             }

             // Call AWS Rekognition CompareFaces
             const compareCommand = new CompareFacesCommand({
                SourceImage: sourceImage,
                TargetImage: targetImage,
                SimilarityThreshold: 95 // STRICT Security Match
             });

             const compareData = await rekognition.send(compareCommand);
             const matches = compareData.FaceMatches;
             
             if (matches && matches.length > 0 && matches[0].Similarity >= 95) {
                 // Success!
                 await User.findByIdAndUpdate(userId, {
                    isVerified: true,
                    verificationMethod: 'aws-liveness',
                    verificationDate: new Date(),
                    verificationStatus: 'approved'
                 });

                 return res.json({
                     success: true,
                     verified: true,
                     confidence: matches[0].Similarity,
                     message: "Identity verified successfully with Liveness!"
                 });
             } else {
                 console.log(`❌ Face Match Failed for user ${userId}. Best Match: ${matches?.[0]?.Similarity || 0}%`);
                 return res.json({
                     success: false,
                     verified: false,
                     message: "Identity verification failed. Face does not match profile photo."
                 });
             }
        }

        res.json({ success: false, message: "No reference image available from Liveness session." });

    } catch (error) {
        console.error("Error getting liveness results:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify account with selfie image (Legacy/Simple)
// @route   POST /api/verification/image-verify
// @access  Private
exports.verifyAccountWithSelfie = async (req, res) => {
  try {
    // 1. Auth Check
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const userId = req.user._id;

    // 2. Get Selfie Image (Base64 or File)
    let selfieBuffer;
    if (req.body.image) {
       // Handle Base64
       let base64String = req.body.image;
       if (base64String.includes(',')) base64String = base64String.split(',')[1];
       selfieBuffer = Buffer.from(base64String, 'base64');
    } else if (req.files?.image) {
       // Handle File Upload
       selfieBuffer = req.files.image.data;
    } else {
       return res.status(400).json({ success: false, message: 'Selfie image is required' });
    }

    // 3. Get User's Profile Photo
    const user = await User.findById(userId).select('photos mainPhotoIndex');
    if (!user || !user.photos || user.photos.length === 0) {
       return res.status(400).json({ success: false, message: 'No profile photos found to compare against.' });
    }
    
    // Use main photo or first photo (Validate index bounds)
    let targetIndex = user.mainPhotoIndex || 0;
    if (targetIndex < 0 || targetIndex >= user.photos.length) {
        targetIndex = 0;
    }
    const profilePhotoUrl = user.photos[targetIndex];
    
    console.log(`DEBUG: Verifying against Photo Index: ${targetIndex}, URL: ${profilePhotoUrl ? profilePhotoUrl.substring(0, 30) + '...' : 'Invalid'}`);

    // Maximum 5 seconds timeout for fetching image
    const imageController = new AbortController();
    const timeoutId = setTimeout(() => imageController.abort(), 5000);

    // 4. Fetch Profile Photo as Buffer (AWS needs bytes if not in S3)
    let profilePhotoBuffer;
    try {
        const imageResponse = await axios.get(profilePhotoUrl, { 
            responseType: 'arraybuffer',
            signal: imageController.signal
        });
        clearTimeout(timeoutId);
        profilePhotoBuffer = Buffer.from(imageResponse.data);
    } catch (err) {
        clearTimeout(timeoutId);
        console.error("Failed to download profile photo:", err.message);
        return res.status(400).json({ success: false, message: 'Failed to retrieve your profile photo. Please try later.' });
    }

    // 5. Call AWS Rekognition
    const command = new CompareFacesCommand({
      SourceImage: { Bytes: profilePhotoBuffer },
      TargetImage: { Bytes: selfieBuffer },
      SimilarityThreshold: 85 // Strictness
    });

    try {
        const data = await rekognition.send(command);
        const matches = data.FaceMatches;

        // Check for Match
        if (matches && matches.length > 0) {
            const bestMatch = matches.reduce((prev, current) => (prev.Similarity > current.Similarity) ? prev : current);
            
            console.log(`✅ AWS Verification Success: ${bestMatch.Similarity}% match for user ${userId}`);

            if (bestMatch.Similarity >= 85) {
                // Update User
                await User.findByIdAndUpdate(userId, {
                    isVerified: true,
                    verificationMethod: 'aws-rekognition',
                    verificationDate: new Date(),
                    verificationStatus: 'approved'
                });

                return res.json({
                    success: true,
                    verified: true,
                    confidence: bestMatch.Similarity,
                    message: "Identity verified successfully!"
                });
            }
        }

        // No match found
        console.log(`❌ AWS Verification Failed for user ${userId}`);
        return res.json({
            success: false,
            verified: false,
            message: "Verification failed. Face did not match profile photo."
        });

    } catch (awsError) {
        console.error("AWS Rekognition Error:", awsError);
        // Handle common AWS errors (e.g., ImageTooLarge, InvalidImageFormat)
        return res.status(500).json({ 
            success: false, 
            message: "Use a clear, singular face.", 
            error: awsError.name 
        });
    }

  } catch (error) {
    console.error('Image verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get verification status
// @route   GET /api/verification/status
// @access  Private
exports.getVerificationStatusEndpoint = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId).select('isVerified verificationMethod verificationDate verificationStatus photos');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      isVerified: user.isVerified || false,
      verificationMethod: user.verificationMethod || null,
      verificationDate: user.verificationDate || null,
      verificationStatus: user.verificationStatus || null,
      hasProfilePhotos: user.photos && user.photos.length > 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create verification request
// @route   POST /api/verification
// @access  Private
exports.createVerification = async (req, res) => {
  try {
    const { documentType, frontImageUrl, backImageUrl, selfieUrl } = req.body;
    const userId = req.user._id;

    if (!frontImageUrl) {
      return res.status(400).json({ message: 'Front document image is required' });
    }

    const verification = {
      userId,
      documentType: documentType || 'id_card',
      frontImageUrl,
      backImageUrl,
      selfieUrl,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store in memory (in production, save to MongoDB collection)
    verifications.set(userId.toString(), verification);

    // Update user verification status to pending
    await User.findByIdAndUpdate(userId, { 
      verificationStatus: 'pending' 
    });

    res.status(201).json({
      message: 'Verification request submitted successfully',
      verification
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get verification status (by User ID param)
// @route   GET /api/verification/:userId
// @access  Private
exports.getVerificationStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user is requesting their own verification or is admin
    if (req.user._id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this verification' });
    }

    const verification = verifications.get(userId);

    if (!verification) {
      return res.status(404).json({ message: 'No verification request found' });
    }

    res.json(verification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update verification status (admin only)
// @route   PUT /api/verification/:userId
// @access  Private/Admin
exports.updateVerificationStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, adminNotes } = req.body;

    // Check if user is admin (you'll need to add isAdmin field to User model)
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const verification = verifications.get(userId);

    if (!verification) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    // Update verification
    verification.status = status;
    verification.adminNotes = adminNotes;
    verification.reviewedAt = new Date();
    verification.updatedAt = new Date();

    verifications.set(userId, verification);

    // Update user's verification status
    const updateData = {
      isVerified: status === 'approved',
      verificationStatus: status
    };

    await User.findByIdAndUpdate(userId, updateData);

    res.json({
      message: 'Verification status updated successfully',
      verification
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
