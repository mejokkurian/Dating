import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Custom hook for handling image and file picker operations
 * Extracted from ChatScreen to reduce component size and improve reusability
 */
export const useImagePicker = ({
  setSelectedImageUri,
  setIsViewOnce,
  setImageModalVisible,
  uploadAndSendFile,
}) => {
  /**
   * Handle selecting image from library
   */
  const handleSelectImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need photo library permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
        setIsViewOnce(false); // Default to false
        setImageModalVisible(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  /**
   * Handle selecting file from document picker
   */
  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        await uploadAndSendFile(file);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  /**
   * Handle picking image from camera
   */
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
        setIsViewOnce(false); // Default to false
        setImageModalVisible(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  return {
    handleSelectImage,
    handleSelectFile,
    pickImage,
  };
};

