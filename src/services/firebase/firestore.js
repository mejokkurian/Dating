import { firestore } from './config';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';

/**
 * Create or update user document
 */
export const createUserDocument = async (userId, userData) => {
  try {
    await setDoc(
      doc(firestore, 'users', userId),
      {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Get user document
 */
export const getUserDocument = async (userId) => {
  try {
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user document
 */
export const updateUserDocument = async (userId, updates) => {
  try {
    await updateDoc(doc(firestore, 'users', userId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Save onboarding progress
 */
export const saveOnboardingProgress = async (userId, progress) => {
  try {
    await setDoc(
      doc(firestore, 'onboarding_progress', userId),
      {
        ...progress,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Get onboarding progress
 */
export const getOnboardingProgress = async (userId) => {
  try {
    const progressDoc = await getDoc(doc(firestore, 'onboarding_progress', userId));
    
    if (progressDoc.exists()) {
      return progressDoc.data();
    }
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Check if onboarding is complete
 */
export const isOnboardingComplete = async (userId) => {
  try {
    // First check onboarding_progress collection
    const progress = await getOnboardingProgress(userId);
    if (progress?.isComplete === true) {
      return true;
    }
    
    // Fallback: check if user document has required onboarding fields
    const userDoc = await getUserDocument(userId);
    if (userDoc) {
      // Check if user has completed basic onboarding (has displayName, gender, preferences)
      const hasBasicInfo = userDoc.displayName && userDoc.gender && userDoc.preferences;
      return hasBasicInfo === true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Create verification document
 */
export const createVerificationDocument = async (userId, verificationData) => {
  try {
    await setDoc(
      doc(firestore, 'verifications', userId),
      {
        userId,
        ...verificationData,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Get verification document
 */
export const getVerificationDocument = async (userId) => {
  try {
    const verificationDoc = await getDoc(doc(firestore, 'verifications', userId));
    
    if (verificationDoc.exists()) {
      return { id: verificationDoc.id, ...verificationDoc.data() };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Update verification status (admin only)
 */
export const updateVerificationStatus = async (userId, status, adminNotes) => {
  try {
    await updateDoc(doc(firestore, 'verifications', userId), {
      status,
      adminNotes,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};
/**
 * Get potential matches for a user
 */
export const getPotentialMatches = async (currentUserId, preferences = {}) => {
  try {
    // Basic query to get all users
    // In a real app, you would add more complex filtering here (geo, age, etc.)
    // Firestore has limitations on inequality filters on multiple fields, so we might need client-side filtering
    const usersRef = collection(firestore, 'users');
    let q = query(usersRef, limit(50)); // Limit to 50 for now

    // If gender preference is set, we could filter by it
    // if (preferences.genderPreference) {
    //   q = query(usersRef, where('gender', '==', preferences.genderPreference), limit(50));
    // }

    const querySnapshot = await getDocs(q);
    const users = [];

    querySnapshot.forEach((doc) => {
      // Exclude current user
      if (doc.id !== currentUserId) {
        const userData = doc.data();
        // Only include users who have completed onboarding (basic info present)
        if (userData.displayName && userData.age) {
          users.push({
            id: doc.id,
            ...userData,
            // Ensure we have default values for UI if missing
            bio: userData.bio || 'No bio available',
            distance: userData.distance || Math.floor(Math.random() * 20) + 1, // Mock distance if missing
            location: userData.location || 'Unknown Location',
            occupation: userData.occupation || 'Undisclosed',
            relationshipExpectations: userData.relationshipExpectations || 'Open to possibilities',
            isVerified: userData.isVerified || false,
            isPremium: userData.isPremium || false,
            photos: (() => {
              // Try to find any image field
              const images = userData.photos || userData.images;
              const singleImage = userData.photoURL || userData.profilePicture || userData.image || userData.avatar;
              
              if (Array.isArray(images) && images.length > 0) {
                return images;
              } else if (typeof images === 'string' && images.length > 0) {
                return [images];
              } else if (singleImage && typeof singleImage === 'string') {
                return [singleImage];
              } else {
                return ['https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500'];
              }
            })(),
          });
        }
      }
    });

    return users;
  } catch (error) {
    console.error('Error fetching matches:', error);
    throw error;
  }
};
