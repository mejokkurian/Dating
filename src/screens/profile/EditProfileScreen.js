import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/GlassCard';
import GradientButton from '../../components/GradientButton';
import theme from '../../theme/theme';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../../services/api/upload';
import { updateUserDocument } from '../../services/api/user';

const EditProfileScreen = ({ navigation }) => {
  const { userData, user } = useAuth();
  
  // Initialize form state with user data
  const [formData, setFormData] = useState({
    displayName: userData?.displayName || '',
    bio: userData?.bio || '',
    occupation: userData?.occupation || '',
    height: userData?.height?.toString() || '',
    education: userData?.education || '',
    drinking: userData?.drinking || 'Never',
    smoking: userData?.smoking || 'Never',
    drugs: userData?.drugs || 'Never',
    relationshipExpectations: userData?.relationshipExpectations || '',
    interests: userData?.interests || [],
  });

  const [photos, setPhotos] = useState(userData?.photos || []);
  const [uploading, setUploading] = useState(false);


  console.log('User Data:', userData?.photos?.[0]);
  const handleAddPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        Alert.alert('Uploading...', 'Please wait while we upload your photo');
        
        const url = await uploadImage(result.assets[0].uri);
        
        setPhotos([...photos, url]);
        Alert.alert('Success', 'Photo uploaded successfully!');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      Alert.alert('Error', `Failed to upload photo: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setUploading(true);
      
      // Update user profile with all form data including photos
      await updateUserDocument(user._id, {
        ...formData,
        photos,
      });
      
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setUploading(false);
    }
  };

  const handleViewProfile = () => {
    // Navigate to profile preview
    navigation.navigate('ProfilePreview', { profileData: { ...userData, ...formData, photos } });
  };

  const addInterest = () => {
    Alert.prompt(
      'Add Interest',
      'Enter an interest',
      (text) => {
        if (text && text.trim()) {
          setFormData({ ...formData, interests: [...formData.interests, text.trim()] });
        }
      }
    );
  };

  const removeInterest = (index) => {
    const newInterests = formData.interests.filter((_, i) => i !== index);
    setFormData({ ...formData, interests: newInterests });
  };

  return (
    <LinearGradient
      colors={theme.colors.gradients.background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleViewProfile} style={styles.viewButton}>
          <Ionicons name="eye-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity 
                  style={styles.removePhotoButton}
                  onPress={() => setPhotos(photos.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close-circle" size={24} color="#FF5252" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity 
              style={styles.addPhotoButton}
              onPress={handleAddPhoto}
              disabled={uploading}
            >
              <Ionicons name="add" size={32} color={theme.colors.text.secondary} />
              <Text style={styles.addPhotoText}>
                {uploading ? 'Uploading...' : 'Add Photo'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <GlassCard style={styles.inputCard} opacity={0.1}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={formData.displayName}
              onChangeText={(text) => setFormData({ ...formData, displayName: text })}
              placeholder="Enter your name"
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </GlassCard>

          <GlassCard style={styles.inputCard} opacity={0.1}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.colors.text.tertiary}
              multiline
              numberOfLines={4}
            />
          </GlassCard>
        </View>

        {/* Professional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional</Text>
          
          <GlassCard style={styles.inputCard} opacity={0.1}>
            <Text style={styles.label}>Occupation</Text>
            <TextInput
              style={styles.input}
              value={formData.occupation}
              onChangeText={(text) => setFormData({ ...formData, occupation: text })}
              placeholder="What do you do?"
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </GlassCard>

          <GlassCard style={styles.inputCard} opacity={0.1}>
            <Text style={styles.label}>Education</Text>
            <TextInput
              style={styles.input}
              value={formData.education}
              onChangeText={(text) => setFormData({ ...formData, education: text })}
              placeholder="Your education"
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </GlassCard>
        </View>

        {/* Physical Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical</Text>
          
          <GlassCard style={styles.inputCard} opacity={0.1}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={formData.height}
              onChangeText={(text) => setFormData({ ...formData, height: text })}
              placeholder="Enter height in cm"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="numeric"
            />
          </GlassCard>
        </View>

        {/* Lifestyle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifestyle</Text>
          
          <GlassCard style={styles.inputCard} opacity={0.1}>
            <Text style={styles.label}>Drinking</Text>
            <View style={styles.optionsRow}>
              {['Never', 'Rarely', 'Socially', 'Regularly'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    formData.drinking === option && styles.optionChipActive
                  ]}
                  onPress={() => setFormData({ ...formData, drinking: option })}
                >
                  <Text style={[
                    styles.optionText,
                    formData.drinking === option && styles.optionTextActive
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          <GlassCard style={styles.inputCard} opacity={0.1}>
            <Text style={styles.label}>Smoking</Text>
            <View style={styles.optionsRow}>
              {['Never', 'Rarely', 'Socially', 'Regularly'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    formData.smoking === option && styles.optionChipActive
                  ]}
                  onPress={() => setFormData({ ...formData, smoking: option })}
                >
                  <Text style={[
                    styles.optionText,
                    formData.smoking === option && styles.optionTextActive
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          <GlassCard style={styles.inputCard} opacity={0.1}>
            <Text style={styles.label}>Weed</Text>
            <View style={styles.optionsRow}>
              {['Never', 'Occasionally', 'Regularly'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    formData.drugs === option && styles.optionChipActive
                  ]}
                  onPress={() => setFormData({ ...formData, drugs: option })}
                >
                  <Text style={[
                    styles.optionText,
                    formData.drugs === option && styles.optionTextActive
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>

        {/* Interests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <TouchableOpacity onPress={addInterest} style={styles.addButton}>
              <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.interestsContainer}>
            {formData.interests.map((interest, index) => (
              <GlassCard key={index} style={styles.interestChip} opacity={0.1}>
                <Text style={styles.interestText}>{interest}</Text>
                <TouchableOpacity onPress={() => removeInterest(index)}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </GlassCard>
            ))}
          </View>
        </View>

        {/* Relationship Expectations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Looking For</Text>
          
          <GlassCard style={styles.inputCard} opacity={0.1}>
            <Text style={styles.label}>Relationship Expectations</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.relationshipExpectations}
              onChangeText={(text) => setFormData({ ...formData, relationshipExpectations: text })}
              placeholder="What are you looking for?"
              placeholderTextColor={theme.colors.text.tertiary}
              multiline
              numberOfLines={3}
            />
          </GlassCard>
        </View>

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <GradientButton
            title={uploading ? "Saving..." : "Save Changes"}
            onPress={handleSave}
            variant="primary"
            size="large"
            disabled={uploading}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  viewButton: {
    padding: 8,
  },
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  addButton: {
    padding: 4,
  },
  photosScroll: {
    marginBottom: 12,
  },
  photoItem: {
    marginRight: 12,
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 120,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.glass.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 8,
  },
  inputCard: {
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: theme.colors.text.primary,
    padding: 0,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    backgroundColor: 'transparent',
  },
  optionChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionText: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  saveButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
});

export default EditProfileScreen;
