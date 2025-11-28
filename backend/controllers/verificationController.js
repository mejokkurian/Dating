const User = require('../models/User');

// Create a simple verification schema (could be moved to models later)
const verifications = new Map(); // In-memory store for now, should use MongoDB collection

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
