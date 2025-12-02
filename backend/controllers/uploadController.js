const cloudinary = require('../config/cloudinary');

// @desc    Upload image to Cloudinary
// @route   POST /api/upload
// @access  Private
exports.uploadImage = async (req, res) => {
  try {
    if (!req.body.image) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    // Upload base64 image to Cloudinary
    const result = await cloudinary.uploader.upload(req.body.image, {
      folder: 'sugar-dating-app/profiles',
      resource_type: 'auto',
      transformation: [
        { width: 1000, height: 1250, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload image', error: error.message });
  }
};

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload/:publicId
// @access  Private
exports.deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;
    
    await cloudinary.uploader.destroy(publicId);
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Failed to delete image', error: error.message });
  }
};

// @desc    Upload audio to Cloudinary
// @route   POST /api/upload/audio
// @access  Private
exports.uploadAudio = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const file = req.files.file;

    // Upload audio to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: 'sugar-dating-app/audio',
      resource_type: 'video', // Cloudinary uses 'video' for audio files
      format: 'm4a',
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({ message: 'Failed to upload audio', error: error.message });
  }
};

// @desc    Upload chat image to Cloudinary
// @route   POST /api/upload/image
// @access  Private
exports.uploadChatImage = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const file = req.files.file;

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: 'sugar-dating-app/chat-images',
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1600, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Chat image upload error:', error);
    res.status(500).json({ message: 'Failed to upload image', error: error.message });
  }
};
