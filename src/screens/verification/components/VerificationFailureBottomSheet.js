import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../../../components/BottomSheet'; 

const VerificationFailureBottomSheet = ({ visible, onClose, error, onRetake }) => {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={600}
    >
      <View style={styles.container}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="warning-outline" size={48} color="#FF3B30" />
        </View>

        {/* Title & Error Message */}
        <Text style={styles.title}>Verification Failed</Text>
        <Text style={styles.errorMessage}>
            {error || "We couldn't verify your identity. Please try again."}
        </Text>

        {/* Tips Section */}
        <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Tips for success:</Text>
            
            <View style={styles.tipRow}>
                <Ionicons name="sunny-outline" size={20} color="#666" />
                <Text style={styles.tipText}>Ensure good lighting (no shadows/glare)</Text>
            </View>
            <View style={styles.tipRow}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <Text style={styles.tipText}>Your face must be clearly visible</Text>
            </View>
            <View style={styles.tipRow}>
                <Ionicons name="images-outline" size={20} color="#666" />
                <Text style={styles.tipText}>Remove sunglasses or heavy accessories</Text>
            </View>
            <View style={styles.tipRow}>
                <Ionicons name="crop-outline" size={20} color="#666" />
                <Text style={styles.tipText}>Use a plain background if possible</Text>
            </View>
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.retakeButton} onPress={() => {
                onClose();
                setTimeout(onRetake, 300); // Small delay to allow sheet to close
            }}>
                <Text style={styles.retakeText}>Retake Photo</Text>
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
    paddingBottom: 80, // Greatly increased to avoid bottom notch
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2', // Soft red
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  tipText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  actionContainer: {
    width: '100%',
    marginTop: 'auto',
  },
  retakeButton: {
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
  retakeText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  }
});

export default VerificationFailureBottomSheet;
