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
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPendingMode, setIsPendingMode] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [showTutorial, setShowTutorial] = useState(false);

    // Load Verification Status
    const loadVerificationStatus = async () => {
        if (userData?.isVerified) {
            setVerificationStatus("verified");
        }
    };

    // Load User Profiles
    const loadProfiles = useCallback(async () => {
        try {
            const matches = await getPotentialMatches();
            console.log("Loaded profiles count:", matches?.length);

            const normalizedMatches = matches?.map((profile) => {
                if (profile._id && !profile.id) profile.id = profile._id;
                if (profile.id && !profile._id) profile._id = profile.id;
                return profile;
            }) || [];

            setProfiles(normalizedMatches);
        } catch (error) {
            console.error("Error loading profiles:", error);
            // Error handling usually happens in UI, simpler here to return or set error state if needed
        }
    }, [userData]);

    // Initial Data Load
    const loadInitialData = useCallback(async () => {
        try {
            setLoading(true);
            await Promise.all([loadVerificationStatus(), loadProfiles()]);
            
            // Check Tutorial
            if (userData?._id) {
                const tutorialKey = `hasSeenTutorial_${userData._id}`;
                const hasSeenTutorial = await AsyncStorage.getItem(tutorialKey);
                if (!hasSeenTutorial) {
                    setTimeout(() => setShowTutorial(true), 1000);
                }
            }
        } catch (error) {
            console.error("Error loading initial data:", error);
        } finally {
            setLoading(false);
        }
    }, [loadProfiles, userData]);

    // Handle Pending Profile Mode (from Route Params)
    useEffect(() => {
        const loadPendingProfile = async () => {
            if (route.params?.pendingProfile) {
                console.log("Loading pending profile:", route.params.pendingProfile.displayName);
                setProfiles([route.params.pendingProfile]);
                setCurrentIndex(0);
                setIsPendingMode(true);
                setLoading(false);

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
                } catch (error) {
                    console.error("Error fetching full pending profile:", error);
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
                console.log("Tab pressed while focused, refreshing...");
                if (isPendingMode) {
                    setIsPendingMode(false);
                    navigation.setParams({ pendingProfile: null });
                }
                loadInitialData();
            }
        });

        const unsubscribeFocus = navigation.addListener('focus', () => {
            if (!isPendingMode && !loading) {
                console.log('Screen focused, refreshing profiles...');
                loadProfiles();
            }
        });

        return () => {
            unsubscribeTab && unsubscribeTab();
            unsubscribeFocus && unsubscribeFocus();
        };
    }, [navigation, isPendingMode, loading, loadInitialData, loadProfiles]);

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
        currentIndex,
        setCurrentIndex,
        isPendingMode,
        setIsPendingMode,
        verificationStatus,
        showTutorial,
        setShowTutorial,
        completeTutorial,
        loadProfiles,
        loadInitialData
    };
};
