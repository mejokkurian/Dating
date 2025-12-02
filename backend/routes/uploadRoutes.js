const express = require('express');
const router = express.Router();
const { uploadImage, deleteImage, uploadAudio, uploadChatImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, uploadImage);
router.post('/audio', protect, uploadAudio);
router.post('/image', protect, uploadChatImage);
router.delete('/:publicId', protect, deleteImage);

module.exports = router;
