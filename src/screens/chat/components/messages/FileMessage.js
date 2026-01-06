import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FileMessage = ({ fileName, fileSize, fileUrl, isMine, onPress, onLongPress }) => {
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext)) return 'document-text';
    if (['doc', 'docx'].includes(ext)) return 'document';
    if (['xls', 'xlsx'].includes(ext)) return 'document-attach';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi'].includes(ext)) return 'videocam';
    if (['mp3', 'wav', 'm4a'].includes(ext)) return 'musical-notes';
    return 'document-outline';
  };

  const handlePress = async () => {
    if (fileUrl && onPress) {
      onPress();
    } else if (fileUrl) {
      // Open file URL
      try {
        const canOpen = await Linking.canOpenURL(fileUrl);
        if (canOpen) {
          await Linking.openURL(fileUrl);
        }
      } catch (error) {
        console.error('Error opening file:', error);
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, isMine ? styles.containerMine : styles.containerTheirs]}
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={getFileIcon(fileName)} 
          size={32} 
          color={isMine ? '#FFF' : '#007AFF'} 
        />
      </View>
      <View style={styles.fileInfo}>
        <Text 
          style={[styles.fileName, isMine ? styles.fileNameMine : styles.fileNameTheirs]}
          numberOfLines={2}
        >
          {fileName}
        </Text>
        {fileSize && (
          <Text style={[styles.fileSize, isMine ? styles.fileSizeMine : styles.fileSizeTheirs]}>
            {formatFileSize(fileSize)}
          </Text>
        )}
      </View>
      <Ionicons 
        name="download-outline" 
        size={20} 
        color={isMine ? 'rgba(255,255,255,0.7)' : '#666'} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
    minWidth: 200,
  },
  containerMine: {
    backgroundColor: '#007AFF',
  },
  containerTheirs: {
    backgroundColor: '#F0F0F0',
  },
  iconContainer: {
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileNameMine: {
    color: '#FFF',
  },
  fileNameTheirs: {
    color: '#000',
  },
  fileSize: {
    fontSize: 12,
  },
  fileSizeMine: {
    color: 'rgba(255,255,255,0.7)',
  },
  fileSizeTheirs: {
    color: '#666',
  },
});

export default FileMessage;

