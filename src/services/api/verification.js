import api from "./config";

/**
 * Create verification request
 * @param {Object} verificationData - { documentType, frontImageUrl, backImageUrl, selfieUrl }
 */
export const createVerification = async (verificationData) => {
  try {
    const response = await api.post("/verification", verificationData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Verification request failed"
    );
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
    throw new Error(
      error.response?.data?.message || "Failed to get verification status"
    );
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
    throw new Error(
      error.response?.data?.message || "Failed to update verification status"
    );
  }
};

/**
 * Verify account with selfie image (face verification)
 * @param {string} imageBase64 - Base64 encoded image (can include data URL prefix)
 * @returns {Promise<Object>} - Verification result
 */
export const verifyAccountWithSelfie = async (imageBase64) => {
  try {
    const response = await api.post("/verification/image-verify", {
      image: imageBase64,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to verify account with selfie"
    );
  }
};

/**
 * Get current image verification status
 * @returns {Promise<Object>} - Image verification status
 */
export const getImageVerificationStatus = async () => {
  try {
    const response = await api.get("/verification/status");
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to get verification status"
    );
  }
};

/**
 * Create AWS Liveness Session
 * @returns {Promise<Object>} - { success: true, sessionId: string }
 */
export const createLivenessSession = async () => {
  try {
    const response = await api.post("/verification/liveness/session");
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to create liveness session"
    );
  }
};

/**
 * Get Liveness Results
 * @param {string} sessionId
 * @returns {Promise<Object>} - Verification Result
 */
export const getLivenessSessionResults = async (sessionId) => {
  try {
    const response = await api.get(`/verification/liveness/results/${sessionId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to get liveness results"
    );
  }
};
