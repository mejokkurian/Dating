import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { useAuth } from '../../context/AuthContext';
import { uploadImage } from '../../services/api/upload';
import { createVerification, getVerificationStatus } from '../../services/api/verification';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';

const KYCUploadScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const { alertConfig, showAlert, hideAlert, handleConfirm } = useCustomAlert();

  React.useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    try {
      const verification = await getVerificationStatus(user._id);
      if (verification) {
        setVerificationStatus(verification.status);
        if (verification.frontImageUrl) {
          setFrontImage({ uri: verification.frontImageUrl });
        }
        if (verification.backImageUrl) {
          setBackImage({ uri: verification.backImageUrl });
        }
      }
    } catch (error) {
      console.error('Error loading verification status:', error);
    }
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      showAlert(
        'Permissions Required',
        'We need camera and photo library access to upload your ID documents.',
        'warning'
      );
      return false;
    }
    return true;
  };

  const pickImage = async (type) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    // For simplicity, we'll default to opening the image picker
    // You can enhance this later with a custom action sheet if needed
    openImagePicker(type);
  };

  const openCamera = async (type) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'front') {
          setFrontImage(result.assets[0]);
        } else {
          setBackImage(result.assets[0]);
        }
      }
    } catch (error) {
      showAlert('Error', 'Failed to open camera', 'error');
    }
  };

  const openImagePicker = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'front') {
          setFrontImage(result.assets[0]);
        } else {
          setBackImage(result.assets[0]);
        }
      }
    } catch (error) {
      showAlert('Error', 'Failed to open image picker', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!frontImage || !backImage) {
      showAlert('Error', 'Please upload both front and back of your ID', 'error');
      return;
    }

    try {
      setLoading(true);

      // Upload front image
      const frontImageUrl = await uploadImage(frontImage.uri);

      // Upload back image
      const backImageUrl = await uploadImage(backImage.uri);

      // Create verification document
      await createVerification({
        frontImageUrl,
        backImageUrl,
        documentType: 'id_card', // Defaulting to ID card for now
      });

      showAlert(
        'Success',
        'Your ID verification has been submitted. We will review it and notify you once it\'s approved.',
        'success',
        () => {
          setVerificationStatus('pending');
          navigation.goBack();
        }
      );
    } catch (error) {
      showAlert('Error', error.message || 'Failed to upload verification documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      case 'pending':
        return '#FF9800';
      default:
        return '#666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending Review';
      default:
        return 'Not Submitted';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ID Verification</Text>
        <Text style={styles.subtitle}>
          Upload clear photos of your government-issued ID for verification
        </Text>
      </View>

      {verificationStatus && (
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(verificationStatus) }]}>
          <Text style={styles.statusText}>
            Status: {getStatusText(verificationStatus)}
          </Text>
        </View>
      )}

      {/* Front Image */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Front of ID</Text>
        <Text style={styles.sectionDescription}>
          Take a clear photo of the front of your ID
        </Text>
        {frontImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: frontImage.uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => pickImage('front')}
            >
              <Text style={styles.changeButtonText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickImage('front')}
          >
            <Text style={styles.uploadButtonText}>Upload Front Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Back Image */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Back of ID</Text>
        <Text style={styles.sectionDescription}>
          Take a clear photo of the back of your ID
        </Text>
        {backImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: backImage.uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => pickImage('back')}
            >
              <Text style={styles.changeButtonText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickImage('back')}
          >
            <Text style={styles.uploadButtonText}>Upload Back Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Submit Button */}
      {verificationStatus !== 'approved' && (
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !frontImage || !backImage}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {verificationStatus === 'pending' ? 'Resubmit Verification' : 'Submit for Verification'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Privacy & Security</Text>
        <Text style={styles.infoText}>
          Your ID documents are encrypted and stored securely. They will only be used for verification purposes and will not be shared with other users.
        </Text>
      </View>
      
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={hideAlert}
        onConfirm={handleConfirm}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statusBadge: {
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  imageContainer: {
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: 'contain',
    backgroundColor: '#f5f5f5',
  },
  uploadButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    marginTop: 10,
    padding: 10,
  },
  changeButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    margin: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default KYCUploadScreen;

