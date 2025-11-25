import { storage } from './config';
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable, uploadString } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';

/**
 * Upload ID verification document
 */
export const uploadVerificationDocument = async (userId, documentId, fileUri, fileType = 'image/jpeg') => {
  try {
    // Read the file as a blob
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    const storageRef = ref(storage, `verifications/${userId}/${documentId}`);
    
    await uploadBytes(storageRef, blob, {
      contentType: fileType,
    });
    
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete verification document
 */
export const deleteVerificationDocument = async (userId, documentId) => {
  try {
    const storageRef = ref(storage, `verifications/${userId}/${documentId}`);
    await deleteObject(storageRef);
  } catch (error) {
    throw error;
  }
};

/**
 * Get verification document URL
 */
export const getVerificationDocumentURL = async (userId, documentId) => {
  try {
    const storageRef = ref(storage, `verifications/${userId}/${documentId}`);
    return await getDownloadURL(storageRef);
  } catch (error) {
    throw error;
  }
};

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = async (userId, photoId, fileUri, fileType = 'image/jpeg') => {
  console.log('Starting upload for:', fileUri);
  try {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        console.log('Blob created successfully. Size:', xhr.response.size, 'Type:', xhr.response.type);
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        console.log('XHR Error creating blob:', e);
        reject(new TypeError('Network request failed'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', fileUri, true);
      xhr.send(null);
    });
    
    const storageRef = ref(storage, `users/${userId}/photos/${photoId}`);
    
    console.log('Uploading bytes to:', storageRef.fullPath);
    
    await uploadBytes(storageRef, blob, {
      contentType: fileType,
    });
    
    console.log('Upload complete');
    
    // Try to get download URL with retries
    let downloadURL;
    let retries = 3;
    
    for (let i = 0; i < retries; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1))); // Increasing delay
        downloadURL = await getDownloadURL(storageRef);
        console.log('Download URL:', downloadURL);
        break;
      } catch (error) {
        console.log(`Attempt ${i + 1} to get download URL failed:`, error.message);
        if (i === retries - 1) {
          // Last attempt failed, construct URL manually
          const bucket = storage.app.options.storageBucket;
          downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storageRef.fullPath)}?alt=media`;
          console.log('Using constructed URL:', downloadURL);
        }
      }
    }
    
    return downloadURL;
  } catch (error) {
    console.error('Upload error details:', error);
    throw error;
  }
};
