import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import socketService from '../../../services/socket';
import api from '../../../services/api/config';  

const useStickers = (user, userData, setMessages, scrollToBottom) => {
  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [recentStickers, setRecentStickers] = useState([]);
  const [customStickers, setCustomStickers] = useState([]);

  useEffect(() => {
    loadStickers();
  }, []);

  const loadStickers = async () => {
    try {
      const savedStickers = await AsyncStorage.getItem('recentStickers');
      if (savedStickers) {
        setRecentStickers(JSON.parse(savedStickers));
      }

      const savedCustomStickers = await AsyncStorage.getItem('customStickers');
      if (savedCustomStickers) {
        setCustomStickers(JSON.parse(savedCustomStickers));
      }
    } catch (error) {
      console.error('Failed to load stickers:', error);
    }
  };

  const handleStickerSelect = async (sticker) => {
    try {
      // Add to recent stickers
      const newRecent = [sticker, ...recentStickers.filter(s => s.id !== sticker.id)].slice(0, 20);
      setRecentStickers(newRecent);
      await AsyncStorage.setItem('recentStickers', JSON.stringify(newRecent));

      setStickerPickerVisible(false);

      // Determine if it's an emoji sticker or custom sticker (with URL)
      const isEmoji = !sticker.url && sticker.emoji && !sticker.emoji.startsWith('http');
      const stickerEmoji = isEmoji ? sticker.emoji : null;
      const stickerId = !isEmoji && sticker.url ? sticker.url : (sticker.id || null);

      const tempId = Date.now().toString();
      const message = {
        _id: tempId,
        tempId,
        content: 'sticker',
        sticker: sticker,
        stickerEmoji: stickerEmoji,
        stickerId: stickerId,
        messageType: 'sticker',
        senderId: { _id: userData._id },
        receiverId: user._id,
        createdAt: new Date().toISOString(),
        status: 'sent',
      };

      setMessages((prev) => [message, ...prev]);
      scrollToBottom();

      await socketService.sendMessage(
        user._id,
        'sticker',
        tempId,
        'sticker',
        null,
        null,
        null,
        {
          stickerEmoji: stickerEmoji,
          stickerId: stickerId,
        }
      );
    } catch (error) {
      console.error('Send sticker error:', error);
      Alert.alert('Error', 'Failed to send sticker');
    }
  };

  const handleCreateSticker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need gallery permissions to create stickers!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        
        // Upload sticker
        const formData = new FormData();
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('file', {
          uri,
          name: filename,
          type,
        });

        const response = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const newSticker = {
          id: Date.now().toString(),
          url: response.data.url,
        };

        const newCustom = [newSticker, ...customStickers];
        setCustomStickers(newCustom);
        await AsyncStorage.setItem('customStickers', JSON.stringify(newCustom));
        
        // Auto-select the new sticker
        handleStickerSelect(newSticker);
      }
    } catch (error) {
      console.error('Create sticker error:', error);
      Alert.alert('Error', 'Failed to create sticker');
    }
  };

  return {
    stickerPickerVisible,
    setStickerPickerVisible,
    recentStickers,
    customStickers,
    handleStickerSelect,
    handleCreateSticker,
  };
};

export default useStickers;
