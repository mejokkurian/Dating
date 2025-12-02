import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AttachmentOptionsModal = ({ visible, onClose, onSelectImage, onSelectFile }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <Text style={styles.title}>Choose an option</Text>
              
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onSelectImage();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="image-outline" size={28} color="#2196F3" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Photo</Text>
                  <Text style={styles.optionSubtitle}>Take a photo or choose from gallery</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onSelectFile();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="document-outline" size={28} color="#9C27B0" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>File</Text>
                  <Text style={styles.optionSubtitle}>Choose a document or file</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default AttachmentOptionsModal;

