import { Alert } from 'react-native';
import api from '../../../services/api/config';
import socketService from '../../../services/socket';

/**
 * Custom hook for handling file uploads (audio, image, file)
 * Extracted from ChatScreen to reduce component size and improve reusability
 */
export const useFileUpload = ({
  user,
  userData,
  setMessages,
  scrollToBottom,
  replyToMessage,
}) => {
  /**
   * Upload and send audio message
   */
  const uploadAndSendAudio = async (uri, duration) => {
    try {
      // Create optimistic message immediately
      const tempId = Date.now().toString();
      const optimisticMessage = {
        _id: tempId,
        tempId,
        messageType: 'audio',
        audioUrl: uri, // Use local URI initially
        audioDuration: duration,
        senderId: { _id: userData._id },
        receiverId: user._id,
        createdAt: new Date().toISOString(),
        status: 'uploading', // Show uploading status
        isOptimistic: true, // Flag for optimistic update
      };

      setMessages((prev) => [optimisticMessage, ...prev]);
      if (scrollToBottom && typeof scrollToBottom === 'function') {
        scrollToBottom();
      }

      // Upload in background
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `audio/${match[1]}` : 'audio/m4a';
      
      const fileObject = {
        uri,
        type,
        name: filename,
      };

      formData.append('file', fileObject);

      const response = await api.post('/upload/audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data) => data,
      });

      const audioUrl = response.data.url;

      if (!audioUrl) {
        throw new Error('No audio URL returned from server');
      }

      // Update message with real URL
      setMessages((prev) => 
        prev.map((m) => 
          m.tempId === tempId 
            ? { ...m, audioUrl, status: 'sent', isOptimistic: false }
            : m
        )
      );

      // Send via socket with actual URL
      await socketService.sendMessage(user._id, '', tempId, 'audio', audioUrl, duration);
    } catch (error) {
      console.error('Audio upload failed:', error);
      // Mark message as failed
      setMessages(prev => prev.map(m => 
        m.tempId === tempId ? { ...m, status: 'failed' } : m
      ));
      Alert.alert('Upload Failed', 'Failed to send audio message. Please try again.');
    }
  };

  /**
   * Upload and send image message
   */
  const uploadAndSendImage = async (imageUri, isViewOnce = false) => {
    if (!imageUri) return;

    try {
      // Create optimistic message
      const tempId = Date.now().toString();
      const optimisticMessage = {
        _id: tempId,
        tempId,
        messageType: 'image',
        imageUrl: imageUri,
        isViewOnce: isViewOnce,
        senderId: { _id: userData._id },
        receiverId: user._id,
        createdAt: new Date().toISOString(),
        status: 'uploading',
        isOptimistic: true,
      };

      setMessages((prev) => [optimisticMessage, ...prev]);
      if (scrollToBottom && typeof scrollToBottom === 'function') {
        scrollToBottom();
      }

      // Upload
      const formData = new FormData();
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      const fileObject = {
        uri: imageUri,
        type,
        name: filename,
      };

      formData.append('file', fileObject);

      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (data) => data,
      });

      if (response.data && response.data.url) {
        // Send socket message
        await socketService.sendMessage(
          user._id,
          isViewOnce ? 'Photo' : 'Image', // Content text
          tempId,
          'image',
          response.data.url, // fileUrl
          null, // duration
          replyToMessage?._id,
          { isViewOnce: isViewOnce } // Additional data
        );
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      Alert.alert('Upload Failed', 'Failed to send image. Please try again.');
    }
  };

  /**
   * Upload and send file message
   */
  const uploadAndSendFile = async (file) => {
    try {
      // Create optimistic message
      const tempId = Date.now().toString();
      const optimisticMessage = {
        _id: tempId,
        tempId,
        messageType: 'file',
        fileName: file.name,
        fileSize: file.size,
        fileUrl: file.uri, // Local URI for immediate display
        senderId: { _id: userData._id },
        receiverId: user._id,
        createdAt: new Date().toISOString(),
        status: 'uploading',
        isOptimistic: true,
      };

      setMessages((prev) => [optimisticMessage, ...prev]);
      if (scrollToBottom && typeof scrollToBottom === 'function') {
        scrollToBottom();
      }

      // Upload file
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || 'application/octet-stream',
        name: file.name,
      });

      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (data) => data,
      });

      if (response.data && response.data.url) {
        // Send socket message
        await socketService.sendMessage(
          user._id,
          file.name, // Content text
          tempId,
          'file',
          response.data.url, // fileUrl
          null, // duration
          replyToMessage?._id,
          { 
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.mimeType 
          } // Additional metadata
        );
      }
    } catch (error) {
      console.error('File upload failed:', error);
      Alert.alert('Upload Failed', 'Failed to send file. Please try again.');
    }
  };

  return {
    uploadAndSendAudio,
    uploadAndSendImage,
    uploadAndSendFile,
  };
};

