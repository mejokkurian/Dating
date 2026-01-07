import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Note: Using standard Animated here as per the useProfileAnimations hook usage

const PassOverlay = ({ 
    visible, 
    opacity, 
    scale, 
    rotate, 
    loading 
}) => {
    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.passAnimationOverlay,
                { opacity: opacity },
            ]}
            pointerEvents="none"
        >
            <Animated.View style={{ transform: [{ scale: scale }] }}>
                <View style={styles.passAnimationIcon}>
                    <Ionicons name="close" size={32} color="#000" />
                    {loading && (
                        <Animated.View
                            style={{
                                position: 'absolute',
                                transform: [{
                                    rotate: rotate.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0deg', '360deg'],
                                    }),
                                }],
                            }}
                        >
                            <Ionicons name="sync-outline" size={56} color="#666" />
                        </Animated.View>
                    )}
                </View>
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    passAnimationOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    passAnimationIcon: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
});

export default PassOverlay;
