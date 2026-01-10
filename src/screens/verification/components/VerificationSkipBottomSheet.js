import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../../../components/BottomSheet'; 

const VerificationSkipBottomSheet = ({ visible, onClose, onIgnore, onVerify }) => {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={450}
      backgroundColor="#FFF"
    >
      <View style={styles.container}>
        {/* Warning Icon */}
        <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#FF9500" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Are you sure you want to skip?</Text>
        
        {/* Description */}
        <Text style={styles.description}>
            Without verifying your profile, other users won't trust your account. Please verifying your profile to get better matches!
        </Text>

        {/* Actions */}
        <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.verifyButton} onPress={onVerify}>
                <Text style={styles.verifyText}>Verify Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ignoreButton} onPress={onIgnore}>
                <Text style={styles.ignoreText}>Ignore</Text>
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
    paddingBottom: 50,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF7ED', // Soft orange
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
    gap: 12,
  },
  verifyButton: {
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
  verifyText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  ignoreButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
  },
  ignoreText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  }
});

export default VerificationSkipBottomSheet;
