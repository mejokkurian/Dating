import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ImagePreviewModal = ({ 
  visible, 
  imageUri, 
  isViewOnce, 
  onViewOnceToggle, 
  onClose, 
  onSend 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.previewImageContainer}>
          {imageUri && (
            <Image 
              source={{ uri: imageUri }} 
              style={styles.previewImage} 
              resizeMode="contain"
            />
          )}
        </View>

        <View style={styles.previewFooter}>
          <TouchableOpacity 
            style={[styles.viewOnceButton, isViewOnce && styles.viewOnceActive]}
            onPress={onViewOnceToggle}
          >
            <View style={[styles.viewOnceIcon, isViewOnce && styles.viewOnceIconActive]}>
              <Text style={[styles.viewOnceText, isViewOnce && styles.viewOnceTextActive]}>1</Text>
            </View>
            <Text style={styles.viewOnceLabel}>View Once</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sendImageButton} onPress={onSend}>
            <Ionicons name="send" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 50,
  },
  previewImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  viewOnceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  viewOnceActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  viewOnceIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewOnceIconActive: {
    borderColor: '#4CAF50',
    borderStyle: 'solid',
    backgroundColor: '#4CAF50',
  },
  viewOnceText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  viewOnceTextActive: {
    color: '#FFF',
  },
  viewOnceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFF',
  },
  sendImageButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ImagePreviewModal;
