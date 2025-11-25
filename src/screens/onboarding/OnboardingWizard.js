import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { FontAwesome5, FontAwesome, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingProgress, createUserDocument } from '../../services/api/user';
import { uploadImage } from '../../services/api/upload';
import GlassCard from '../../components/GlassCard';
import theme from '../../theme/theme';
import CustomAlert from '../../components/CustomAlert';

const OnboardingWizard = ({ route, navigation }) => {
  const { user, setOnboardingComplete } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    age: route.params?.age || null,
    birthDate: route.params?.birthDate || null,
    gender: '',
    preferences: '',
    relationshipExpectations: '',
    // New Fields
    displayName: '',
    location: '',
    photos: [],
    bio: '',
    dealBreakers: '',
    budget: '',
    height: '',
    bodyType: '',
    ethnicity: '',
    occupation: '',
    interests: [],
    // Extended Profile Fields
    children: '',
    education: '',
    religion: '',
    politics: '',
    drinking: '',
    smoking: '',
    drugs: '',
    // Visibility Settings
    visibility: {
      basicInfo: true,
      gender: true,
      preferences: true,
      budget: true,
      physical: true,
      background: true,
      habits: true,
      interests: true,
      details: true,
      photos: true,
    },
  });

  const totalSteps = 10;

  useEffect(() => {
    // Age is passed from previous screen, so we just ensure it's in state (already handled by useState init)
  }, []);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error',
  });

  const showAlert = (title, message, type = 'error') => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
    });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const [errors, setErrors] = useState({
    displayName: '',
    location: '',
    gender: '',
    preferences: '',
  });

  const validateStep = () => {
    let isValid = true;
    const newErrors = { ...errors };

    switch (currentStep) {
      case 1: // Basic Info
        if (!formData.displayName) {
          newErrors.displayName = 'Name is required';
          isValid = false;
        } else {
          newErrors.displayName = '';
        }
        if (!formData.location) {
          newErrors.location = 'Location is required';
          isValid = false;
        } else {
          newErrors.location = '';
        }
        break;
      case 2: // Gender
        if (!formData.gender) {
          newErrors.gender = 'Please select your gender';
          isValid = false;
        } else {
          newErrors.gender = '';
        }
        break;
      case 3: // Preferences
        if (!formData.preferences) {
          newErrors.preferences = 'Please select who you are looking for';
          isValid = false;
        } else {
          newErrors.preferences = '';
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    // Steps 1, 2, and 3 are mandatory and cannot be skipped
    if (currentStep <= 3) {
      // Trigger validation to show inline errors
      validateStep();
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const calculateCompletion = () => {
    const fields = [
      'displayName', 'location', 'gender', 'preferences', // Required (4)
      'relationshipExpectations', 'bio', 'dealBreakers', 'budget', // Details (4)
      'height', 'bodyType', 'ethnicity', 'occupation', // Physical/Background (4)
      'children', 'education', 'religion', 'politics', 'drinking', 'smoking', 'drugs', // Habits/Background (7)
    ];
    
    let filled = 0;
    fields.forEach(field => {
      if (formData[field]) filled++;
    });
    
    // Photos count as 1 point if at least 1 is uploaded, or maybe proportional?
    // User said 4 photos are mandatory in step 10, but step 10 is optional?
    // "4, 5 , 6, 7, 8, 9 , 10 thes thing are not requried" -> Step 10 is photos.
    // But in previous turn user said "we need 6 photo fram 4 are mandotroy".
    // This is conflicting. "4 are mandotroy" implies Step 10 IS required.
    // But "4, 5... 10 thes thing are not requried" implies it's optional.
    // I will assume Step 10 is OPTIONAL for the "Complete" action, but IF they are on Step 10, they can't proceed without 4 photos?
    // Or maybe the "4 mandatory" was just visual text?
    // I'll treat photos as bonus for completion %.
    if (formData.photos.length > 0) filled++;
    if (formData.interests.length > 0) filled++;

    const total = fields.length + 2; // +2 for photos and interests
    return Math.round((filled / total) * 100);
  };

  const handleComplete = async () => {
    // Validate ONLY strictly required fields (Steps 1-3)
    if (!formData.displayName || !formData.location || !formData.gender || !formData.preferences) {
      showAlert('Error', 'Please complete the basic information steps (1-3)');
      return;
    }

    // ... rest of function

    try {
      setLoading(true);
      console.log('Starting onboarding completion...');
      
      // Upload photos if they are local URIs
      console.log('Uploading photos...');
      const uploadedPhotos = await Promise.all(
        formData.photos.map(async (photoUri, index) => {
          if (photoUri && (photoUri.startsWith('file://') || photoUri.startsWith('content://'))) {
            console.log(`Uploading photo ${index + 1}...`);
            const downloadUrl = await uploadImage(photoUri);
            console.log(`Photo ${index + 1} uploaded successfully:`, downloadUrl);
            return downloadUrl;
          }
          return photoUri;
        })
      );
      
      // Save onboarding progress
      console.log('Saving onboarding progress...');
      await saveOnboardingProgress(user._id, {
        ...formData,
        photos: uploadedPhotos,
        isComplete: true,
      });
      console.log('Onboarding progress saved');

      // Create or update user document
      console.log('Creating user document...');
      await createUserDocument(user._id, {
        age: formData.age,
        birthDate: formData.birthDate?.toISOString(),
        gender: formData.gender,
        preferences: formData.preferences,
        relationshipExpectations: formData.relationshipExpectations,
        // New Fields
        displayName: formData.displayName,
        location: formData.location,
        photos: uploadedPhotos,
        bio: formData.bio,
        dealBreakers: formData.dealBreakers,
        budget: formData.budget,
        height: formData.height,
        bodyType: formData.bodyType,
        ethnicity: formData.ethnicity,
        occupation: formData.occupation,
        interests: formData.interests,
        onboardingCompleted: true,
        isPremium: false,
        isVerified: false,
        // Extended Fields
        children: formData.children,
        education: formData.education,
        religion: formData.religion,
        politics: formData.politics,
        drinking: formData.drinking,
        smoking: formData.smoking,
        smoking: formData.smoking,
        drugs: formData.drugs,
        visibility: formData.visibility,
      });
      console.log('User document created');

      // Navigate to Premium screen (Onboarding completion happens there)
      navigation.replace('Premium');
    } catch (error) {
      console.error('Onboarding completion error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to save onboarding data';
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check Firestore security rules.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <OnboardingStepBasicInfo
            displayName={formData.displayName}
            location={formData.location}
            isVisible={formData.visibility.basicInfo}
            errors={errors}
            onUpdate={(field, value) => {
              updateFormData(field, value);
              setErrors(prev => ({ ...prev, [field]: '' }));
            }}
            onToggleVisibility={() => updateFormData('visibility', { ...formData.visibility, basicInfo: !formData.visibility.basicInfo })}
          />
        );
      case 2:
        return (
          <OnboardingStep2
            gender={formData.gender}
            isVisible={formData.visibility.gender}
            errors={errors}
            onUpdate={(gender) => {
              updateFormData('gender', gender);
              setErrors(prev => ({ ...prev, gender: '' }));
            }}
            onToggleVisibility={() => updateFormData('visibility', { ...formData.visibility, gender: !formData.visibility.gender })}
          />
        );
      case 3:
        return (
          <OnboardingStep3
            preferences={formData.preferences}
            isVisible={formData.visibility.preferences}
            errors={errors}
            onUpdate={(preferences) => {
              updateFormData('preferences', preferences);
              setErrors(prev => ({ ...prev, preferences: '' }));
            }}
            onToggleVisibility={() => updateFormData('visibility', { ...formData.visibility, preferences: !formData.visibility.preferences })}
          />
        );
      case 4:
        return (
          <OnboardingStepBudget
            role={formData.preferences}
            budget={formData.budget}
            isVisible={formData.visibility.budget}
            onUpdate={(budget) => updateFormData('budget', budget)}
            onToggleVisibility={() => updateFormData('visibility', { ...formData.visibility, budget: !formData.visibility.budget })}
          />
        );
      case 5:
        return (
          <OnboardingStepPhysical
            height={formData.height}
            bodyType={formData.bodyType}
            occupation={formData.occupation}
            isVisible={formData.visibility.physical}
            onUpdate={(field, value) => updateFormData(field, value)}
            onToggleVisibility={() => updateFormData('visibility', { ...formData.visibility, physical: !formData.visibility.physical })}
          />
        );
      case 6:
        return (
          <OnboardingStepBackground
            ethnicity={formData.ethnicity}
            education={formData.education}
            children={formData.children}
            religion={formData.religion}
            politics={formData.politics}
            isVisible={formData.visibility.background}
            onUpdate={(field, value) => updateFormData(field, value)}
            onToggleVisibility={() => updateFormData('visibility', { ...formData.visibility, background: !formData.visibility.background })}
          />
        );
      case 7:
        return (
          <OnboardingStepHabits
            drinking={formData.drinking}
            smoking={formData.smoking}
            drugs={formData.drugs}
            isVisible={formData.visibility.habits}
            onUpdate={(field, value) => updateFormData(field, value)}
            onToggleVisibility={() => updateFormData('visibility', { ...formData.visibility, habits: !formData.visibility.habits })}
          />
        );
      case 8:
        return (
          <OnboardingStepInterests
            interests={formData.interests}
            isVisible={formData.visibility.interests}
            onUpdate={(interests) => updateFormData('interests', interests)}
            onShowAlert={showAlert}
            onToggleVisibility={() => updateFormData('visibility', { ...formData.visibility, interests: !formData.visibility.interests })}
          />
        );
      case 9:
        return (
          <OnboardingStepDetails
            bio={formData.bio}
            dealBreakers={formData.dealBreakers}
            relationshipExpectations={formData.relationshipExpectations}
            isVisible={formData.visibility.details}
            onUpdate={(field, value) => updateFormData(field, value)}
            onToggleVisibility={() => updateFormData('visibility', { ...formData.visibility, details: !formData.visibility.details })}
          />
        );
      case 10:
        return (
          <OnboardingStepPhotos
            photos={formData.photos}
            isVisible={formData.visibility.photos}
            onUpdate={(photos) => updateFormData('photos', photos)}
            onShowAlert={showAlert}
            onToggleVisibility={() => updateFormData('visibility', { ...formData.visibility, photos: !formData.visibility.photos })}
          />
        );
      default:
        return null;
    }
  };

// ... (skip to OnboardingStepInterests)

// Step 6: Interests
  return (
    <View style={styles.gradient}>
      <View style={styles.container}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#D4AF37', '#F2D06B']} // Gold gradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={[styles.progressText, { color: '#D4AF37' }]}>
              STEP {currentStep}/{totalSteps}
            </Text>
            <Text style={styles.progressText}>
              {calculateCompletion()}% COMPLETED
            </Text>
          </View>
        </View>

        {/* Step Content */}
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigation}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              disabled={loading}
            >
              <View style={styles.backButtonCard}>
                <Text style={styles.backButtonText}>← Back</Text>
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.nextButtonText}>
                  {currentStep === totalSteps ? '✓ Complete' : 'Next →'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={hideAlert}
        />
      </View>
    </View>
  );
};



// Step 1: Basic Info
const OnboardingStepBasicInfo = ({ displayName, location, isVisible, errors, onUpdate, onToggleVisibility }) => {
  const [loadingLocation, setLoadingLocation] = useState(false);

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      
      // Reverse geocode to get city/region
      let address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address && address.length > 0) {
        const { city, region, country } = address[0];
        // Format: "New York, NY" or "London, England"
        const formattedLocation = region ? `${city}, ${region}` : `${city}, ${country}`;
        onUpdate('location', formattedLocation);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not fetch location');
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Let's start with the basics</Text>
      <Text style={styles.stepDescription}>
        How should we call you and where are you from?
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Display Name</Text>
        <TextInput
          style={[styles.simpleInput, errors?.displayName && styles.inputError]}
          placeholder="e.g. Alex"
          placeholderTextColor="#999999"
          value={displayName}
          onChangeText={(text) => onUpdate('displayName', text)}
          autoCapitalize="words"
        />
        {errors?.displayName ? <Text style={styles.errorText}>{errors.displayName}</Text> : null}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Location</Text>
        <View style={styles.locationInputContainer}>
          <TextInput
            style={[styles.simpleInput, { flex: 1 }, errors?.location && styles.inputError]}
            placeholder="e.g. New York, NY"
            placeholderTextColor="#999999"
            value={location}
            onChangeText={(text) => onUpdate('location', text)}
            autoCapitalize="words"
          />
          <TouchableOpacity 
            style={styles.locationButton} 
            onPress={getCurrentLocation}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="location-sharp" size={24} color="#D4AF37" />
            )}
          </TouchableOpacity>
        </View>
        {errors?.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
      </View>

      <TouchableOpacity style={styles.visibilityToggle} onPress={onToggleVisibility}>
        <Ionicons 
          name={isVisible ? "eye" : "eye-off"} 
          size={24} 
          color={isVisible ? "#000000" : "#999999"} 
        />
        <Text style={[styles.visibilityText, isVisible && styles.visibilityTextActive]}>
          {isVisible ? "Visible on Profile" : "Hidden from Profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Step 3: Photos
const OnboardingStepPhotos = ({ photos, isVisible, onUpdate, onShowAlert, onToggleVisibility }) => {
  const pickImage = async () => {
    if (photos.length >= 6) {
      onShowAlert('Limit Reached', 'You can upload up to 6 photos', 'warning');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });

    if (!result.canceled) {
      onUpdate([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onUpdate(newPhotos);
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Add your best photos</Text>
      <Text style={styles.stepDescription}>
        Upload at least 4 photos to continue. High quality photos get more matches!
      </Text>
      
      <View style={styles.photoGrid}>
        {[...Array(6)].map((_, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.photoSlot}
            onPress={photos[index] ? null : pickImage}
            disabled={!!photos[index]}
          >
            {photos[index] ? (
              <>
                <Image source={{ uri: photos[index] }} style={styles.photo} />
                <TouchableOpacity 
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#000" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="add" size={32} color="#CCCCCC" />
                <Text style={styles.addPhotoText}>
                  {index < 4 ? 'Add Photo' : 'Optional'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.visibilityToggle} onPress={onToggleVisibility}>
        <Ionicons 
          name={isVisible ? "eye" : "eye-off"} 
          size={24} 
          color={isVisible ? "#000000" : "#999999"} 
        />
        <Text style={[styles.visibilityText, isVisible && styles.visibilityTextActive]}>
          {isVisible ? "Visible on Profile" : "Hidden from Profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Step 9: Details (Bio & Deal-breakers & Expectations)
const OnboardingStepDetails = ({ bio, dealBreakers, relationshipExpectations, isVisible, onUpdate, onToggleVisibility }) => {
  const expectations = [
    'Long-term relationship',
    'Short-term fun',
    'Mentorship',
    'Networking',
    'Travel companion',
    'Still figuring it out',
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Final Details</Text>
      <Text style={styles.stepDescription}>
        Tell us about yourself and what you're looking for.
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Bio</Text>
        <GlassCard style={styles.inputCard} opacity={0.2}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell us about yourself..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={bio}
            onChangeText={(text) => onUpdate('bio', text)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </GlassCard>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Deal-breakers (Optional)</Text>
        <GlassCard style={styles.inputCard} opacity={0.2}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Smoking, dishonesty..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={dealBreakers}
            onChangeText={(text) => onUpdate('dealBreakers', text)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </GlassCard>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>What are you looking for?</Text>
        <View style={styles.chipContainer}>
          {expectations.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.chip,
                relationshipExpectations === item && styles.chipSelected,
              ]}
              onPress={() => onUpdate('relationshipExpectations', item)}
            >
              <Text
                style={[
                  styles.chipText,
                  relationshipExpectations === item && styles.chipTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.visibilityToggle} onPress={onToggleVisibility}>
        <Ionicons 
          name={isVisible ? "eye" : "eye-off"} 
          size={24} 
          color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"} 
        />
        <Text style={[styles.visibilityText, isVisible && styles.visibilityTextActive]}>
          {isVisible ? "Visible on Profile" : "Hidden from Profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Step 2: Gender
const OnboardingStep2 = ({ gender, isVisible, errors, onUpdate, onToggleVisibility }) => {
  const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your gender?</Text>
      <Text style={styles.stepDescription}>
        Select the option that best describes you
      </Text>
      <View style={styles.optionsContainer}>
        {genders.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              gender === option && styles.optionButtonSelected,
              errors?.gender && !gender && styles.optionButtonError,
            ]}
            onPress={() => onUpdate(option)}
          >
            <Text
              style={[
                styles.optionButtonText,
                gender === option && styles.optionButtonTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
        {errors?.gender ? <Text style={[styles.errorText, { textAlign: 'center', width: '100%' }]}>{errors.gender}</Text> : null}
      </View>

      <TouchableOpacity style={styles.visibilityToggle} onPress={onToggleVisibility}>
        <Ionicons 
          name={isVisible ? "eye" : "eye-off"} 
          size={24} 
          color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"} 
        />
        <Text style={[styles.visibilityText, isVisible && styles.visibilityTextActive]}>
          {isVisible ? "Visible on Profile" : "Hidden from Profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Step 3: Preferences
const OnboardingStep3 = ({ preferences, isVisible, errors, onUpdate, onToggleVisibility }) => {
  const preferenceOptions = [
    'Sugar Daddy',
    'Sugar Mummy',
    'Sugar Baby (Male)',
    'Sugar Baby (Female)',
    'Open to all',
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Who are you looking for?</Text>
      <Text style={styles.stepDescription}>
        Select your preferences for matching
      </Text>
      <View style={styles.optionsContainer}>
        {preferenceOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              preferences === option && styles.optionButtonSelected,
              errors?.preferences && !preferences && styles.optionButtonError,
            ]}
            onPress={() => onUpdate(option)}
          >
            <Text
              style={[
                styles.optionButtonText,
                preferences === option && styles.optionButtonTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
        {errors?.preferences ? <Text style={[styles.errorText, { textAlign: 'center', width: '100%' }]}>{errors.preferences}</Text> : null}
      </View>

      <TouchableOpacity style={styles.visibilityToggle} onPress={onToggleVisibility}>
        <Ionicons 
          name={isVisible ? "eye" : "eye-off"} 
          size={24} 
          color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"} 
        />
        <Text style={[styles.visibilityText, isVisible && styles.visibilityTextActive]}>
          {isVisible ? "Visible on Profile" : "Hidden from Profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Step 4: Lifestyle & Budget
const OnboardingStepBudget = ({ role, budget, isVisible, onUpdate, onToggleVisibility }) => {
  const isProvider = role?.includes('Daddy') || role?.includes('Mummy');
  
  const providerOptions = [
    '$1k - $3k / month',
    '$3k - $5k / month',
    '$5k - $10k / month',
    '$10k - $20k / month',
    '$20k+ / month',
    'Flexible / Negotiable',
  ];

  const seekerOptions = [
    'Tuition / Education Support',
    'Luxury Lifestyle & Travel',
    'Monthly Allowance',
    'Shopping & Gifts',
    'Mentorship & Networking',
    'Open to discussion',
  ];

  const options = isProvider ? providerOptions : seekerOptions;
  const title = isProvider ? 'What is your budget range?' : 'What are your lifestyle expectations?';
  const subtitle = isProvider ? 'This helps match you with compatible partners' : 'Select what matters most to you';

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{subtitle}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              budget === option && styles.optionButtonSelected,
            ]}
            onPress={() => onUpdate(option)}
          >
            <Text
              style={[
                styles.optionButtonText,
                budget === option && styles.optionButtonTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.visibilityToggle} onPress={onToggleVisibility}>
        <Ionicons 
          name={isVisible ? "eye" : "eye-off"} 
          size={24} 
          color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"} 
        />
        <Text style={[styles.visibilityText, isVisible && styles.visibilityTextActive]}>
          {isVisible ? "Visible on Profile" : "Hidden from Profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Step 5: Physical
const OnboardingStepPhysical = ({ height, bodyType, occupation, isVisible, onUpdate, onToggleVisibility }) => {
  const bodyTypes = ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Plus Size'];
  
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tell us more about you</Text>
      <Text style={styles.stepDescription}>Details to complete your profile</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Occupation</Text>
        <TextInput
          style={styles.simpleInput}
          placeholder="e.g. Entrepreneur, Student, Model"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={occupation}
          onChangeText={(text) => onUpdate('occupation', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Height</Text>
        <View style={styles.sliderContainer}>
          <View style={styles.heightDisplayContainer}>
            <FontAwesome5 name="ruler-vertical" size={24} color="rgba(255,255,255,0.8)" style={{ marginRight: 10 }} />
            <Text style={styles.heightDisplay}>
              {height ? height : 170} <Text style={styles.unitText}>cm</Text>
            </Text>
          </View>
          
          <View style={styles.sliderWrapper}>
            <Slider
              style={styles.slider}
              minimumValue={140}
              maximumValue={220}
              step={1}
              value={height ? parseInt(height) : 170}
              onValueChange={(value) => onUpdate('height', value.toString())}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
              thumbTintColor="#FFFFFF"
            />
            <View style={styles.rulerContainer}>
              {Array.from({ length: 9 }).map((_, i) => (
                <View key={i} style={[styles.rulerTick, i % 2 === 0 ? styles.rulerTickMajor : styles.rulerTickMinor]} />
              ))}
            </View>
          </View>

          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>140cm</Text>
            <Text style={styles.sliderLabel}>220cm</Text>
          </View>
        </View>
      </View>

      <Text style={styles.inputLabel}>Body Type</Text>
      <View style={styles.chipContainer}>
        {bodyTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.chip,
              bodyType === type && styles.chipSelected,
            ]}
            onPress={() => onUpdate('bodyType', type)}
          >
            <Text
              style={[
                styles.chipText,
                bodyType === type && styles.chipTextSelected,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.visibilityToggle} onPress={onToggleVisibility}>
        <Ionicons 
          name={isVisible ? "eye" : "eye-off"} 
          size={24} 
          color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"} 
        />
        <Text style={[styles.visibilityText, isVisible && styles.visibilityTextActive]}>
          {isVisible ? "Visible on Profile" : "Hidden from Profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Step 6: Background (Ethnicity, Education, etc.)
const OnboardingStepBackground = ({ ethnicity, education, children, religion, politics, isVisible, onUpdate, onToggleVisibility }) => {
  const ethnicities = [
    'Black/African Descent', 'East Asian', 'Hispanic/Latino', 
    'Middle Eastern', 'Native American', 'Pacific Islander', 
    'South Asian', 'White/Caucasian', 'Other'
  ];

  const educationLevels = [
    'High School', 'Undergraduate', 'Postgraduate', 'PhD/Doctorate', 'Trade/Vocational'
  ];

  const childrenOptions = [
    'Have children', 'Don\'t have children', 'Prefer not to say'
  ];

  const religionOptions = [
    'Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Spiritual', 'Agnostic', 'Atheist', 'Other'
  ];

  const politicsOptions = [
    'Liberal', 'Moderate', 'Conservative', 'Apolitical', 'Other'
  ];

  const renderSelect = (label, value, options, field) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.chip,
              value === option && styles.chipSelected,
              { marginRight: 10 }
            ]}
            onPress={() => onUpdate(field, option)}
          >
            <Text style={[styles.chipText, value === option && styles.chipTextSelected]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Background & Values</Text>
      <Text style={styles.stepDescription}>Share a bit more about your background</Text>
      
      {renderSelect('Ethnicity', ethnicity, ethnicities, 'ethnicity')}
      {renderSelect('Education', education, educationLevels, 'education')}
      {renderSelect('Children', children, childrenOptions, 'children')}
      {renderSelect('Religious Beliefs', religion, religionOptions, 'religion')}
      {renderSelect('Political Beliefs', politics, politicsOptions, 'politics')}

      <TouchableOpacity style={styles.visibilityToggle} onPress={onToggleVisibility}>
        <Ionicons 
          name={isVisible ? "eye" : "eye-off"} 
          size={24} 
          color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"} 
        />
        <Text style={[styles.visibilityText, isVisible && styles.visibilityTextActive]}>
          {isVisible ? "Visible on Profile" : "Hidden from Profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Step 7: Habits
const OnboardingStepHabits = ({ drinking, smoking, drugs, isVisible, onUpdate, onToggleVisibility }) => {
  const habitsOptions = ['Yes', 'Sometimes', 'No', 'Prefer not to say'];

  const renderOption = (label, value, field) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.chipContainer}>
        {habitsOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.chip,
              value === option && styles.chipSelected,
            ]}
            onPress={() => onUpdate(field, option)}
          >
            <Text style={[styles.chipText, value === option && styles.chipTextSelected]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Lifestyle Habits</Text>
      <Text style={styles.stepDescription}>Do you drink, smoke, or use recreational drugs?</Text>
      
      {renderOption('Do you drink?', drinking, 'drinking')}
      {renderOption('Do you smoke?', smoking, 'smoking')}
      {renderOption('Do you use marijuana?', drugs, 'drugs')}

      <TouchableOpacity style={styles.visibilityToggle} onPress={onToggleVisibility}>
        <Ionicons 
          name={isVisible ? "eye" : "eye-off"} 
          size={24} 
          color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"} 
        />
        <Text style={[styles.visibilityText, isVisible && styles.visibilityTextActive]}>
          {isVisible ? "Visible on Profile" : "Hidden from Profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Step 8: Interests
const OnboardingStepInterests = ({ interests = [], isVisible, onUpdate, onShowAlert, onToggleVisibility }) => {
  const allInterests = [
    'Fine Dining', 'Luxury Travel', 'Art & Culture', 'Fitness', 
    'Nightlife', 'Business', 'Fashion', 'Music', 
    'Wine & Spirits', 'Golf', 'Yachting', 'Spa & Wellness',
    'Photography', 'Cooking', 'Tech', 'Outdoors'
  ];

  const toggleInterest = (interest) => {
    if (interests.includes(interest)) {
      onUpdate(interests.filter(i => i !== interest));
    } else {
      if (interests.length < 5) {
        onUpdate([...interests, interest]);
      } else {
        onShowAlert('Limit Reached', 'You can select up to 5 interests', 'warning');
      }
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your Interests</Text>
      <Text style={styles.stepDescription}>Select up to 5 interests</Text>
      
      <View style={styles.chipContainer}>
        {allInterests.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.chip,
              interests.includes(item) && styles.chipSelected,
            ]}
            onPress={() => toggleInterest(item)}
          >
            <Text
              style={[
                styles.chipText,
                interests.includes(item) && styles.chipTextSelected,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.visibilityToggle} onPress={onToggleVisibility}>
        <Ionicons 
          name={isVisible ? "eye" : "eye-off"} 
          size={24} 
          color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"} 
        />
        <Text style={[styles.visibilityText, isVisible && styles.visibilityTextActive]}>
          {isVisible ? "Visible on Profile" : "Hidden from Profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};


// Step 6: Relationship Expectations
const OnboardingStep4 = ({ relationshipExpectations, onUpdate }) => {
  const [text, setText] = useState(relationshipExpectations || '');

  const handleTextChange = (value) => {
    setText(value);
    onUpdate(value);
  };

  const quickOptions = [
    { label: 'Mentorship & Guidance', icon: 'chalkboard-teacher', lib: 'FontAwesome5' },
    { label: 'Lifestyle Support', icon: 'gem', lib: 'FontAwesome5' },
    { label: 'Emotional Connection', icon: 'heart', lib: 'FontAwesome' },
    { label: 'Mutual Respect', icon: 'handshake', lib: 'FontAwesome5' },
    { label: 'Long-term Partnership', icon: 'infinity', lib: 'FontAwesome5' },
  ];

  const toggleOption = (optionLabel) => {
    const newText = text.includes(optionLabel)
      ? text.replace(optionLabel + ', ', '').replace(', ' + optionLabel, '').replace(optionLabel, '')
      : text ? `${text}, ${optionLabel}` : optionLabel;
    handleTextChange(newText);
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What are your relationship expectations?</Text>
      <Text style={styles.stepDescription}>
        Select what matters to you or describe it below
      </Text>
      
      <View style={styles.expectationsGrid}>
        {quickOptions.map((option) => {
          const isSelected = text.includes(option.label);
          const IconLib = option.lib === 'FontAwesome5' ? FontAwesome5 : FontAwesome;
          
          return (
            <TouchableOpacity
              key={option.label}
              style={styles.expectationCardWrapper}
              onPress={() => toggleOption(option.label)}
            >
              <GlassCard 
                style={[styles.expectationCard, isSelected && styles.expectationCardSelected]}
                opacity={isSelected ? 0.4 : 0.15}
              >
                <IconLib 
                  name={option.icon} 
                  size={24} 
                  color={isSelected ? '#fff' : 'rgba(255,255,255,0.7)'} 
                  style={styles.expectationIcon}
                />
                <Text
                  style={[
                    styles.expectationText,
                    isSelected && styles.expectationTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Additional Notes</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe your ideal arrangement..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={text}
          onChangeText={handleTextChange}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  progressContainer: {
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
    width: 60,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#000000', // Elegant black accent
  },
  progressText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 180,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    // No background color, just clean layout
  },
  inputLabel: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  simpleInput: {
    backgroundColor: '#FAFAFA', // Very subtle gray
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5EA', // Subtle border
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
    borderWidth: 2,
  },
  optionText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#000000',
    fontWeight: '700',
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardSelected: {
    borderColor: '#000000',
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardIconSelected: {
    backgroundColor: '#000000',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  photoSlot: {
    width: '30%',
    aspectRatio: 0.8,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonCard: {
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sliderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  heightDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heightDisplay: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000000',
  },
  unitText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 8,
    marginTop: 12,
  },
  sliderWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rulerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    height: 24,
    marginTop: -12,
    paddingHorizontal: 12,
  },
  rulerTick: {
    width: 1,
    backgroundColor: '#C7C7CC',
    borderRadius: 1,
  },
  rulerTickMajor: {
    height: 20,
    backgroundColor: '#8E8E93',
  },
  rulerTickMinor: {
    height: 10,
    marginTop: 5,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  skipButton: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    overflow: 'hidden',
  },
  nextButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  chipSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  chipText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  locationInputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  locationButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FAFAFA',
    borderRadius: 100,
    gap: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  visibilityText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  visibilityTextActive: {
    color: '#000000',
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  optionButtonError: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default OnboardingWizard;
