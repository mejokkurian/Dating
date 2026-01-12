import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { recordInteraction } from '../services/api/match';
import { useProfileAnimations } from './useProfileAnimations';

export const useCardInteractions = (
    profiles, 
    currentIndex, 
    setCurrentIndex, 
    isPendingMode, 
    setIsPendingMode,
    loadProfiles
) => {
    const navigation = useNavigation();
    
    // Animation Values
    const swipeY = useSharedValue(0);
    const cardOpacity = useSharedValue(1);

    // Reset animations when index changes
    // This is crucial for the "Blank Screen" fix
    useEffect(() => {
        swipeY.value = 0;
    }, [currentIndex]);

    // Use the central animations hook
    const {
        showPassAnimation,
        isPassLoading,
        passIconScale,
        passOverlayOpacity,
        passSpinnerRotate,
        showLikeAnimation,
        likeHeartScale,
        likeParticleOpacity,
        particles,
        triggerPassAnimation,
        triggerLikeAnimation,
        resetAnimations
    } = useProfileAnimations();

    // Handle Swipe Up (Pass)
    const handleSwipeUp = useCallback(async (profile) => {
        console.log("Rejected:", profile?.name || profile?.displayName);
        
        // Trigger pass animation from hook
        await triggerPassAnimation(async () => {
            try {
                const targetId = profile?._id || profile?.id;
                if (!targetId) {
                    console.error("Profile ID missing for pass interaction");
                    return;
                }
                console.log("Calling recordInteraction PASS:", targetId);
                await recordInteraction(targetId, "PASS");
            } catch (error) {
                console.error("Error recording reject:", error);
            }

            // Prepare next card to be invisible initially (for fade-in effect)
            cardOpacity.value = 0;

            // Move to next card
            if (isPendingMode) {
                setIsPendingMode(false);
                navigation.setParams({ pendingProfile: null });
                setCurrentIndex(0);
                loadProfiles();
            } else {
                setCurrentIndex((prev) => prev + 1);
            }

            // Visual Hold Delay (150ms buffer)
            await new Promise(resolve => setTimeout(resolve, 150));
        });

        // FADE IN New Card
        cardOpacity.value = withTiming(1, { duration: 300 });

    }, [isPendingMode, navigation, setCurrentIndex, setIsPendingMode, loadProfiles, triggerPassAnimation, cardOpacity]);

    // Handle Like (from Bottom Sheet or specific action)
    const handleLike = useCallback(async (profile, setShowBottomSheet) => {
        // 1. Close Sheet immediately to show animation
        if (setShowBottomSheet) setShowBottomSheet(false);

        // 2. Trigger Visual Animation (Hearts)
        // We pass a dummy callback or null because we want to manage timing ourselves for the card switch
        triggerLikeAnimation(null); 

        // 3. Record Interaction (Optimistic)
        try {
            const targetId = profile?._id || profile?.id;
            if (targetId) {
                recordInteraction(targetId, "LIKE");
            }
        } catch (error) {
            console.error("Error recording like:", error);
        }

        // 4. Wait for heart animation to play out (matching Super Like feel)
        await new Promise(resolve => setTimeout(resolve, 3200));

        // 5. Hide Card (Fade Out / vanish behind hearts)
        cardOpacity.value = 0;

        // 6. Advance Index
        if (isPendingMode) {
            setIsPendingMode(false);
            navigation.setParams({ pendingProfile: null });
            setCurrentIndex(0);
            loadProfiles();
        } else {
            setCurrentIndex((prev) => prev + 1);
        }

        // 7. Short visual hold (prevent glitch)
        await new Promise(resolve => setTimeout(resolve, 150));

        // 8. Fade In New Card
        cardOpacity.value = withTiming(1, { duration: 300 });

    }, [isPendingMode, navigation, setCurrentIndex, setIsPendingMode, loadProfiles, triggerLikeAnimation, cardOpacity]);

    // Handle Super Like
    const handleSuperLike = useCallback(async (profile, comment = "", setShowBottomSheet) => {
        console.log("Super Liked:", profile?.name);
        try {
            const targetId = profile?._id || profile?.id;
            if (!targetId) return;

            // 1. Close Sheet immediately
            if (setShowBottomSheet) setShowBottomSheet(false);

            // 2. Trigger Animation
            triggerLikeAnimation(null);

            // 3. Record Interaction
            // 3. Record Interaction (Optimistic - don't await)
            recordInteraction(targetId, "SUPERLIKE", comment);

            // 4. Wait for animation (3.2s)
            await new Promise(resolve => setTimeout(resolve, 3200));

            // 5. Fade Out Card
            cardOpacity.value = 0;

            // 6. Advance Index
            if (isPendingMode) {
                setIsPendingMode(false);
                navigation.setParams({ pendingProfile: null });
                setCurrentIndex(0);
                loadProfiles();
            } else {
                setCurrentIndex((prev) => prev + 1);
            }

            // 7. Short visual hold
            await new Promise(resolve => setTimeout(resolve, 150));

            // 8. Fade In New Card
            cardOpacity.value = withTiming(1, { duration: 300 });

        } catch (error) {
            console.error("Error recording super like:", error);
        }
    }, [triggerLikeAnimation, setCurrentIndex, isPendingMode, navigation, setIsPendingMode, loadProfiles, cardOpacity]);

    return {
        swipeY,
        cardOpacity,
        handleSwipeUp,
        handleSuperLike,
        handleLike,
        // Expose animation states for the Overlay
        animationState: {
            showPassAnimation,
            isPassLoading,
            passIconScale,
            passOverlayOpacity,
            passSpinnerRotate,
            showLikeAnimation,
            likeHeartScale,
            likeParticleOpacity,
            particles
        },
        triggerLikeAnimation // Expose for other manual triggers
    };
};
