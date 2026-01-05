import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HeartAnimationOverlay = ({ 
  visible, 
  heartScale, 
  particleOpacity, 
  particles 
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
       {/* Particles */}
       {particles.map((p) => (
         <Animated.View
           key={p.id}
           style={[
             styles.particle,
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
           styles.mainHeart,
           {
             transform: [{ scale: heartScale }]
           }
         ]}
       >
         <Ionicons name="heart" size={100} color="#FF3B30" />
       </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  mainHeart: {
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  particle: {
    position: 'absolute',
  },
});

export default HeartAnimationOverlay;
