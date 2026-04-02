import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPotentialMatches, getUserById } from '../services/api/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';

export const useDiscoverProfiles = () => {
    const { user, userData } = useAuth();
    const navigation = useNavigation();
    const route = useRoute();

    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPendingMode, setIsPendingMode] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [showTutorial, setShowTutorial] = useState(false);

    // Cache keys
    const CACHE_KEY = `discover_profiles_${userData?._id || 'anonymous'}`;
    const CACHE_TIMESTAMP_KEY = `discover_profiles_timestamp_${userData?._id || 'anonymous'}`;
    const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

    // Load Verification Status
    const loadVerificationStatus = async () => {
        if (userData?.isVerified) {
            setVerificationStatus("verified");
        }
    };

    // Load cached profiles
    const loadCachedProfiles = useCallback(async () => {
        try {
            const cachedData = await AsyncStorage.getItem(CACHE_KEY);
            const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
            
            if (cachedData && cachedTimestamp) {
                const timestamp = parseInt(cachedTimestamp, 10);
                const now = Date.now();
                
                // Check if cache is still valid (within expiry time)
                if (now - timestamp < CACHE_EXPIRY_MS) {
                    const parsedProfiles = JSON.parse(cachedData);
                    return parsedProfiles;
                }
            }
        } catch (err) {
            if (__DEV__) {
                console.error("Error loading cached profiles:", err);
            }
        }
        return null;
    }, [CACHE_KEY, CACHE_TIMESTAMP_KEY]);

    // Save profiles to cache
    const saveProfilesToCache = useCallback(async (profilesToCache) => {
        try {
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(profilesToCache));
            await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (err) {
            if (__DEV__) {
                console.error("Error saving profiles to cache:", err);
            }
        }
    }, [CACHE_KEY, CACHE_TIMESTAMP_KEY]);

    // Load User Profiles with error recovery
    const loadProfiles = useCallback(async (useCache = true) => {
        try {
            setError(null);
            
            // Try to load from cache first if requested
            if (useCache && profiles.length === 0) {
                const cachedProfiles = await loadCachedProfiles();
                if (cachedProfiles && cachedProfiles.length > 0) {
                    setProfiles(cachedProfiles);
                    // Continue to fetch fresh data in background
                }
            }

            const matches = await getPotentialMatches();

            const normalizedMatches = matches?.map((profile) => {
                if (profile._id && !profile.id) profile.id = profile._id;
                if (profile.id && !profile._id) profile._id = profile.id;
                return profile;
            }) || [];

            setProfiles(normalizedMatches);
            // Save to cache on success
            await saveProfilesToCache(normalizedMatches);
        } catch (err) {
            // Enhanced error handling
            let enhancedError = err;
            if (!err.response) {
                // Network error
                if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                    enhancedError = {
                        ...err,
                        isNetworkError: true,
                        networkErrorType: 'timeout',
                        userMessage: 'The request took too long. Please check your connection and try again.',
                    };
                } else if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
                    enhancedError = {
                        ...err,
                        isNetworkError: true,
                        networkErrorType: 'connection',
                        userMessage: 'Unable to connect to the server. Please check your internet connection.',
                    };
                } else if (err.message?.includes('Network request failed')) {
                    enhancedError = {
                        ...err,
                        isNetworkError: true,
                        networkErrorType: 'network',
                        userMessage: 'Network request failed. Please check your internet connection and try again.',
                    };
                }
            }
            
            // Try to restore from cache on error
            if (profiles.length === 0) {
                const cachedProfiles = await loadCachedProfiles();
                if (cachedProfiles && cachedProfiles.length > 0) {
                    setProfiles(cachedProfiles);
                    // Don't set error if we have cached data
                    return;
                }
            }
            
            if (__DEV__) {
                console.error("Error loading profiles:", enhancedError);
            }
            setError(enhancedError);
        }
    }, [userData, profiles.length, loadCachedProfiles, saveProfilesToCache]);

    // Initial Data Load
    const loadInitialData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            await Promise.all([loadVerificationStatus(), loadProfiles()]);
            
            // Check Tutorial
            if (userData?._id) {
                const tutorialKey = `hasSeenTutorial_${userData._id}`;
                const hasSeenTutorial = await AsyncStorage.getItem(tutorialKey);
                if (!hasSeenTutorial) {
                    setTimeout(() => setShowTutorial(true), 1000);
                }
            }
        } catch (err) {
            if (__DEV__) {
                console.error("Error loading initial data:", err);
            }
            // Error is already set by loadProfiles
        } finally {
            setLoading(false);
        }
    }, [loadProfiles, userData]);

    // Handle Pending Profile Mode (from Route Params)
    useEffect(() => {
        const loadPendingProfile = async () => {
            if (route.params?.pendingProfile) {
                setProfiles([route.params.pendingProfile]);
                setCurrentIndex(0);
                setIsPendingMode(true);
                setLoading(false);
                setError(null);

                try {
                    const profileId = route.params.pendingProfile._id || route.params.pendingProfile.id;
                    if (profileId) {
                        const fullProfile = await getUserById(profileId);
                        if (fullProfile) {
                            if (!fullProfile.id && fullProfile._id) fullProfile.id = fullProfile._id;
                            if (!fullProfile._id && fullProfile.id) fullProfile._id = fullProfile.id;
                            setProfiles([fullProfile]);
                        }
                    }
                } catch (err) {
                    if (__DEV__) {
                        console.error("Error fetching full pending profile:", err);
                    }
                    setError(err);
                }
            } else {
                setIsPendingMode(false);
                loadInitialData();
            }
        };
        loadPendingProfile();
    }, [route.params?.pendingProfile, loadInitialData]);

    // Refresh on Tab Press or Focus
    useEffect(() => {
        const unsubscribeTab = navigation.getParent()?.addListener("tabPress", () => {
            if (navigation.isFocused()) {
                if (isPendingMode) {
                    setIsPendingMode(false);
                    navigation.setParams({ pendingProfile: null });
                }
                loadInitialData();
            }
        });

        const unsubscribeFocus = navigation.addListener('focus', () => {
            if (!isPendingMode && !loading) {
                loadProfiles();
            }
        });

        return () => {
            unsubscribeTab && unsubscribeTab();
            unsubscribeFocus && unsubscribeFocus();
        };
    }, [navigation, isPendingMode, loading, loadInitialData, loadProfiles]);

    // Undo Last Action (Step Back)
    const handleUndo = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    // Mark Tutorial as Complete
    const completeTutorial = async () => {
        if (userData?._id) {
            const tutorialKey = `hasSeenTutorial_${userData._id}`;
            await AsyncStorage.setItem(tutorialKey, 'true');
            setShowTutorial(false);
        }
    };

    return {
        profiles,
        setProfiles,
        loading,
        setLoading,
        error,
        setError,
        currentIndex,
        setCurrentIndex,
        isPendingMode,
        setIsPendingMode,
        verificationStatus,
        showTutorial,
        setShowTutorial,
        completeTutorial,
        handleUndo,
        loadProfiles,
        loadInitialData
    };
};
