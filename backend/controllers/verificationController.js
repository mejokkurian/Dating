const User = require('../models/User');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Create a simple verification schema (could be moved to models later)
const verifications = new Map(); // In-memory store for now, should use MongoDB collection

// Python verification service URL
const VERIFICATION_SERVICE_URL = process.env.VERIFICATION_SERVICE_URL || 'http://localhost:8001';

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

// @desc    Get verification status
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

// @desc    Verify account with selfie image
// @route   POST /api/verification/image-verify
// @access  Private
exports.verifyAccountWithSelfie = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user || !req.user._id) {
      console.error('Image verification error: User not authenticated');
      return res.status(401).json({ 
        success: false,
        verified: false,
        message: 'User not authenticated',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    const userId = req.user._id;
    console.log(`Image verification request from user: ${userId}`);
    
    // Check if image is provided
    if (!req.body.image && !req.files?.image) {
      console.error('Image verification error: No image provided');
      return res.status(400).json({ 
        success: false,
        verified: false,
        message: 'Selfie image is required',
        error: 'IMAGE_REQUIRED'
      });
    }

    let imageBase64;
    
    // Handle base64 image from request body
    if (req.body.image) {
      imageBase64 = req.body.image;
      // Remove data URL prefix if present
      if (imageBase64.includes(',')) {
        imageBase64 = imageBase64.split(',')[1];
      }
      console.log('Image received as base64 string, length:', imageBase64.length);
    }
    // Handle file upload
    else if (req.files?.image) {
      const imageFile = req.files.image;
      imageBase64 = imageFile.data.toString('base64');
      console.log('Image received as file upload, size:', imageFile.size);
    } else {
      console.error('Image verification error: Invalid image format');
      return res.status(400).json({ 
        success: false,
        verified: false,
        message: 'Invalid image format',
        error: 'INVALID_IMAGE_FORMAT'
      });
    }

    // Check if user has profile photos
    console.log(`Checking profile photos for user: ${userId}`);
    const user = await User.findById(userId).select('photos');
    if (!user) {
      console.error(`Image verification error: User ${userId} not found`);
      return res.status(404).json({ 
        success: false,
        verified: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }
    if (!user.photos || user.photos.length === 0) {
      console.log(`Image verification error: User ${userId} has no profile photos`);
      return res.status(400).json({ 
        success: false,
        verified: false,
        message: 'Please upload at least one profile photo before verifying your account',
        error: 'NO_PROFILE_PHOTOS'
      });
    }
    console.log(`User has ${user.photos.length} profile photo(s)`);

    try {
      // Call Python verification service
      const response = await axios.post(`${VERIFICATION_SERVICE_URL}/api/verify-face`, {
        userId: userId.toString(),
        selfieImageBase64: imageBase64
      }, {
        timeout: 30000 // 30 second timeout
      });

      const verificationResult = response.data;

      // Update user verification status if verified
      if (verificationResult.verified) {
        const updateData = {
          isVerified: true,
          verificationMethod: 'image',
          verificationDate: new Date(),
          verificationStatus: 'approved'
        };
        await User.findByIdAndUpdate(userId, updateData);
      }

      res.json({
        success: verificationResult.verified,
        verified: verificationResult.verified,
        confidence: verificationResult.confidence,
        message: verificationResult.message,
        details: {
          facesFoundInSelfie: verificationResult.faces_found_in_selfie,
          profilePhotosCompared: verificationResult.profile_photos_compared,
          bestMatchConfidence: verificationResult.best_match_confidence,
          threshold: verificationResult.threshold
        }
      });

    } catch (serviceError) {
      console.error('Verification service error:', serviceError.response?.data || serviceError.message);
      
      // Handle service errors
      if (serviceError.response) {
        // Service returned an error response
        const errorData = serviceError.response.data;
        return res.status(serviceError.response.status || 500).json({
          success: false,
          verified: false,
          message: errorData.message || 'Face verification failed',
          error: errorData.error || 'VERIFICATION_SERVICE_ERROR'
        });
      } else {
        // Network or other error
        return res.status(503).json({
          success: false,
          verified: false,
          message: 'Verification service is unavailable. Please try again later.',
          error: 'SERVICE_UNAVAILABLE'
        });
      }
    }

  } catch (error) {
    console.error('Image verification error:', error);
    res.status(500).json({ 
      success: false,
      verified: false,
      message: error.message || 'Failed to verify account',
      error: 'INTERNAL_ERROR'
    });
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
