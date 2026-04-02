import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { recordInteraction } from '../services/api/match';
import { useProfileAnimations } from './useProfileAnimations';
import * as discoverAnalytics from '../services/discoverAnalytics';
import { useSwipeLimit } from './useSwipeLimit';
import { useSubscription } from '../context/SubscriptionContext';

// Rate limiting constants
const ACTION_DEBOUNCE_MS = 1000; // 1 second debounce between actions
const SWIPE_RATE_LIMIT = 10; // Max 10 swipes per minute
const SWIPE_RATE_WINDOW = 60000; // 1 minute in milliseconds

export const useCardInteractions = (
    profiles,
    currentIndex,
    setCurrentIndex,
    isPendingMode,
    setIsPendingMode,
    loadProfiles
) => {
    const navigation = useNavigation();
    const { showPaywall } = useSubscription();
    const { isLimitReached, incrementSwipeCount } = useSwipeLimit();

    // Animation Values
    const swipeY = useSharedValue(0);
    const cardOpacity = useSharedValue(1);

    // Rate limiting refs
    const lastActionTime = useRef(0);
    const swipeTimestampsRef = useRef([]);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Daily swipe limit guard — called before every swipe action
    const checkDailyLimit = useCallback(() => {
        if (isLimitReached) {
            showPaywall('swipes');
            return false;
        }
        return true;
    }, [isLimitReached, showPaywall]);

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

    // Check rate limit for swipe actions
    const checkSwipeRateLimit = useCallback(() => {
        const now = Date.now();
        const windowStart = now - SWIPE_RATE_WINDOW;
        
        // Remove timestamps outside the rate limit window
        swipeTimestampsRef.current = swipeTimestampsRef.current.filter(
            timestamp => timestamp > windowStart
        );
        
        // Check if limit exceeded
        if (swipeTimestampsRef.current.length >= SWIPE_RATE_LIMIT) {
            const oldestTimestamp = swipeTimestampsRef.current[0];
            const waitTime = Math.ceil((oldestTimestamp + SWIPE_RATE_WINDOW - now) / 1000);
            return {
                allowed: false,
                waitTime, // seconds to wait
                remaining: 0,
            };
        }
        
        return { 
            allowed: true,
            remaining: SWIPE_RATE_LIMIT - swipeTimestampsRef.current.length,
        };
    }, []);

    // Handle Swipe Up (Pass)
    const handleSwipeUp = useCallback(async (profile) => {
        // Daily swipe limit check (client-side fast path)
        if (!checkDailyLimit()) return;

        // Rate limiting: prevent rapid actions
        const now = Date.now();
        if (now - lastActionTime.current < ACTION_DEBOUNCE_MS) {
            return;
        }

        // Check per-minute rate limit
        const rateLimitCheck = checkSwipeRateLimit();
        if (!rateLimitCheck.allowed) {
            discoverAnalytics.trackRateLimitHit("PASS", rateLimitCheck.waitTime);
            Alert.alert(
                'Too Many Actions',
                `Please wait ${rateLimitCheck.waitTime} seconds before swiping again.`,
                [{ text: 'OK' }]
            );
            return;
        }

        // Input validation
        const targetId = profile?._id || profile?.id;
        if (!targetId || typeof targetId !== 'string' || targetId.trim().length === 0) {
            Alert.alert('Error', 'Invalid profile. Please try again.');
            return;
        }

        lastActionTime.current = now;
        swipeTimestampsRef.current.push(now);
        setIsActionLoading(true);
        incrementSwipeCount();

        // Trigger pass animation from hook
        await triggerPassAnimation(async () => {
            try {
                await recordInteraction(targetId, "PASS");
                discoverAnalytics.trackSwipeAction("PASS", targetId, true);
            } catch (error) {
                if (__DEV__) {
                    console.error("Error recording reject:", error);
                }
                // Backend 429 = daily limit reached — show paywall
                if (error?.response?.status === 429 && error?.response?.data?.limitReached) {
                    showPaywall('swipes');
                    setIsActionLoading(false);
                    return;
                }
                discoverAnalytics.trackSwipeAction("PASS", targetId, false, error);
                Alert.alert('Error', 'Failed to record pass. Please try again.');
            } finally {
                setIsActionLoading(false);
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
        // Daily swipe limit check (client-side fast path)
        if (!checkDailyLimit()) return;

        // Rate limiting: prevent rapid actions
        const now = Date.now();
        if (now - lastActionTime.current < ACTION_DEBOUNCE_MS) {
            return;
        }

        // Check per-minute rate limit
        const rateLimitCheck = checkSwipeRateLimit();
        if (!rateLimitCheck.allowed) {
            discoverAnalytics.trackRateLimitHit("LIKE", rateLimitCheck.waitTime);
            Alert.alert(
                'Too Many Actions',
                `Please wait ${rateLimitCheck.waitTime} seconds before liking again.`,
                [{ text: 'OK' }]
            );
            return;
        }

        // Input validation
        const targetId = profile?._id || profile?.id;
        if (!targetId || typeof targetId !== 'string' || targetId.trim().length === 0) {
            Alert.alert('Error', 'Invalid profile. Please try again.');
            return;
        }

        lastActionTime.current = now;
        swipeTimestampsRef.current.push(now);
        setIsActionLoading(true);
        incrementSwipeCount();

        // 1. Close Sheet immediately to show animation
        if (setShowBottomSheet) setShowBottomSheet(false);

        // 2. Trigger Visual Animation (Hearts)
        triggerLikeAnimation(null);

        // 3. Record Interaction (Optimistic)
        try {
            await recordInteraction(targetId, "LIKE");
            discoverAnalytics.trackSwipeAction("LIKE", targetId, true);
        } catch (error) {
            if (__DEV__) {
                console.error("Error recording like:", error);
            }
            if (error?.response?.status === 429 && error?.response?.data?.limitReached) {
                showPaywall('swipes');
                setIsActionLoading(false);
                return;
            }
            discoverAnalytics.trackSwipeAction("LIKE", targetId, false, error);
            Alert.alert('Error', 'Failed to record like. Please try again.');
            setIsActionLoading(false);
            return;
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
        setIsActionLoading(false);

    }, [isPendingMode, navigation, setCurrentIndex, setIsPendingMode, loadProfiles, triggerLikeAnimation, cardOpacity, checkSwipeRateLimit]);

    // Handle Super Like
    const handleSuperLike = useCallback(async (profile, comment = "", setShowBottomSheet) => {
        // Daily swipe limit check (client-side fast path)
        if (!checkDailyLimit()) return;

        // Rate limiting: prevent rapid actions
        const now = Date.now();
        if (now - lastActionTime.current < ACTION_DEBOUNCE_MS) {
            return;
        }

        // Check per-minute rate limit
        const rateLimitCheck = checkSwipeRateLimit();
        if (!rateLimitCheck.allowed) {
            discoverAnalytics.trackRateLimitHit("SUPERLIKE", rateLimitCheck.waitTime);
            Alert.alert(
                'Too Many Actions',
                `Please wait ${rateLimitCheck.waitTime} seconds before super liking again.`,
                [{ text: 'OK' }]
            );
            return;
        }

        // Input validation
        const targetId = profile?._id || profile?.id;
        if (!targetId || typeof targetId !== 'string' || targetId.trim().length === 0) {
            Alert.alert('Error', 'Invalid profile. Please try again.');
            return;
        }

        lastActionTime.current = now;
        swipeTimestampsRef.current.push(now);
        setIsActionLoading(true);
        incrementSwipeCount();

        try {
            // 1. Close Sheet immediately
            if (setShowBottomSheet) setShowBottomSheet(false);

            // 2. Trigger Animation
            triggerLikeAnimation(null);

            // 3. Record Interaction
            // 3. Record Interaction (Optimistic - don't await)
            recordInteraction(targetId, "SUPERLIKE", comment)
                .then(() => {
                    discoverAnalytics.trackSwipeAction("SUPERLIKE", targetId, true);
                })
                .catch((err) => {
                    discoverAnalytics.trackSwipeAction("SUPERLIKE", targetId, false, err);
                });

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
            setIsActionLoading(false);

        } catch (error) {
            if (__DEV__) {
                console.error("Error recording super like:", error);
            }
            Alert.alert('Error', 'Failed to record super like. Please try again.');
            setIsActionLoading(false);
        }
    }, [triggerLikeAnimation, setCurrentIndex, isPendingMode, navigation, setIsPendingMode, loadProfiles, cardOpacity, checkSwipeRateLimit]);

    return {
        swipeY,
        cardOpacity,
        handleSwipeUp,
        handleSuperLike,
        handleLike,
        isActionLoading,
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
