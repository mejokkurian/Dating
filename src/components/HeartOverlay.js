import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HeartOverlay = ({ 
    visible, 
    heartScale, 
    particleOpacity, 
    particles 
}) => {
    if (!visible) return null;

    return (
        <View style={styles.likeAnimationOverlay} pointerEvents="none">
             {/* Particles */}
             {particles.map((p) => (
               <Animated.View
                 key={p.id}
                 style={[
                   styles.likeParticle,
                   {
                     opacity: Animated.multiply(particleOpacity, p.opacity),
                     transform: [
                       { translateX: p.x },
                       { translateY: p.y },
                       { scale: p.scale }
                     ]
                   }
                 ]}
               >
                 <Ionicons name="heart" size={24} color="#FF3B30" />
               </Animated.View>
             ))}

             {/* Main Heart */}
             <Animated.View
               style={[
                 styles.likeMainHeart,
                 {
                   transform: [{ scale: heartScale }]
                 }
               ]}
             >
                <Ionicons name="heart" size={120} color="#FF3B30" style={styles.mainHeartShadow} />
             </Animated.View>
          </View>
    );
};

const styles = StyleSheet.create({
  likeAnimationOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  likeMainHeart: {
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  mainHeartShadow: {
    textShadowColor: 'rgba(255, 59, 48, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  likeParticle: {
    position: 'absolute',
  },
});

export default HeartOverlay;
