import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../../../components/BottomSheet'; 

const VerificationSuccessBottomSheet = ({ visible, onClose, onContinue }) => {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={400}
      backgroundColor="#FFF"
    >
      <View style={styles.container}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="rocket-outline" size={48} color="#22C55E" />
        </View>

        {/* Title */}
        <Text style={styles.title}>You're Ready for Takeoff! 🚀</Text>
        
        {/* Description */}
        <Text style={styles.description}>
            Your profile is fully verified. You can now start matching with trusted users!
        </Text>

        {/* Actions */}
        <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
                <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20, // Reduced as BottomSheet adds safe area padding
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7', // Soft green
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  actionContainer: {
    width: '100%',
    marginTop: 'auto',
  },
  continueButton: {
    width: '100%',
    backgroundColor: '#000',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  continueText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  }
});

export default VerificationSuccessBottomSheet;
