import api from './config';

/**
 * Create verification request
 * @param {Object} verificationData - { documentType, frontImageUrl, backImageUrl, selfieUrl }
 */
export const createVerification = async (verificationData) => {
  try {
    const response = await api.post('/verification', verificationData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Verification request failed');
  }
};

/**
 * Get verification status
 * @param {string} userId - User ID
 */
export const getVerificationStatus = async (userId) => {
  try {
    const response = await api.get(`/verification/${userId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to get verification status');
  }
};

/**
 * Update verification status (admin only)
 * @param {string} userId - User ID
 * @param {string} status - 'pending' | 'approved' | 'rejected'
 * @param {string} adminNotes - Optional admin notes
 */
export const updateVerificationStatus = async (userId, status, adminNotes) => {
  try {
    const response = await api.put(`/verification/${userId}`, {
      status,
      adminNotes,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update verification status');
  }
};
