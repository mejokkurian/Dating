import api from './config';

/**
 * Upload image to Cloudinary via backend
 * @param {string} imageUri - Local file URI (file://) or base64 string
 * @returns {Promise<string>} - Cloudinary URL
 */
export const uploadImage = async (imageUri) => {
  try {
    // Convert image URI to base64 if it's a file URI
    let base64Image = imageUri;
    
    if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
      // For React Native, we need to read the file as base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Convert blob to base64
      base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    const response = await api.post('/upload', {
      image: base64Image
    });

    return response.data.url;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 */
export const deleteImage = async (publicId) => {
  try {
    await api.delete(`/upload/${publicId}`);
  } catch (error) {
    console.error('Image delete error:', error);
    throw error;
  }
};
