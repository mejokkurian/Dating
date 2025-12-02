import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/theme';
import GlassCard from './GlassCard';

const PrivacyConsentModal = ({
  visible,
  onClose,
  onAccept,
  privacySettings,
  onPrivacySettingsChange,
}) => {
  const [showExactDistance, setShowExactDistance] = useState(
    privacySettings?.showExactDistance !== false
  );
  const [shareLocation, setShareLocation] = useState(
    privacySettings?.shareLocation !== false
  );

  const handleAccept = () => {
    onPrivacySettingsChange({
      showExactDistance,
      shareLocation,
    });
    onAccept();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <GlassCard style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Location Privacy</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Ionicons name="location" size={32} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>How Connect Now Works</Text>
              <Text style={styles.description}>
                Connect Now allows you to discover and connect with compatible people nearby.
                Your location is only shared when you have Connect Now enabled, and only with
                other users who have also opted in.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Privacy Controls</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Show Exact Distance</Text>
                  <Text style={styles.settingDescription}>
                    Display precise distance to nearby users (e.g., "123m away")
                  </Text>
                </View>
                <Switch
                  value={showExactDistance}
                  onValueChange={setShowExactDistance}
                  trackColor={{ false: '#ccc', true: theme.colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Share Location</Text>
                  <Text style={styles.settingDescription}>
                    Allow your location to be visible to nearby users when Connect Now is active
                  </Text>
                </View>
                <Switch
                  value={shareLocation}
                  onValueChange={setShareLocation}
                  trackColor={{ false: '#ccc', true: theme.colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.infoBox}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
                <Text style={styles.infoText}>
                  Your location is only updated when the app is active and Connect Now is enabled.
                  You can disable it at any time.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Text style={styles.acceptButtonText}>Accept & Enable</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 12,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default PrivacyConsentModal;

