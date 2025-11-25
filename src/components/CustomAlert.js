import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import GradientButton from './GradientButton';
import theme from '../theme/theme';

const { width, height } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, onClose, onConfirm, type = 'error' }) => {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return { name: 'check-circle', color: '#4ADE80' };
      case 'warning':
        return { name: 'exclamation-triangle', color: '#FBBF24' };
      case 'error':
      default:
        return { name: 'exclamation-circle', color: '#F87171' };
    }
  };

  const icon = getIcon();

  const handlePress = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <GlassCard style={styles.alertContainer} opacity={0.95}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name={icon.name} size={40} color={icon.color} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <GradientButton
            title="Got it"
            onPress={handlePress}
            size="medium"
            style={styles.button}
          />
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertContainer: {
    width: width * 0.85,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderRadius: theme.borderRadius.xl,
    backgroundColor: 'rgba(30, 30, 30, 0.9)', // Darker background for contrast
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 50,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#fff',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: theme.typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  button: {
    width: '100%',
  },
});

export default CustomAlert;
