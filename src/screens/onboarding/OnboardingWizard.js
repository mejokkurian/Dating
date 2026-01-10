import React, { useState, useEffect, useRef } from "react";
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
  Dimensions,
  Modal,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";
import { FontAwesome5, FontAwesome, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext";
import {
  saveOnboardingProgress,
  createUserDocument,
} from "../../services/api/user";
import { uploadImage } from "../../services/api/upload";
import GlassCard from "../../components/GlassCard";
import theme from "../../theme/theme";
import CustomAlert from "../../components/CustomAlert";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// For onboarding: step container has padding: 24, no margin
// Available width: SCREEN_WIDTH - 48 (24px padding on each side)
const ONBOARDING_PADDING = 48; // 24px on each side
const ONBOARDING_CONTAINER_WIDTH = SCREEN_WIDTH - ONBOARDING_PADDING;
// Photo gap between photos in the grid
const PHOTO_GAP_VALUE = 10;
// For 3 columns with gaps: (SCREEN_WIDTH - 48 - 2 * 10) / 3
const ONBOARDING_PHOTO_SIZE = (ONBOARDING_CONTAINER_WIDTH - 20) / 3;
const TOTAL_PHOTOS = 6;
const MANDATORY_PHOTOS = 4;

// Reusable animated wrapper for input fields
const AnimatedInputWrapper = ({ children, delay = 0, style, stepKey }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(20);

    // Animate in with delay
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepKey]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const OnboardingWizard = ({ route, navigation }) => {
  const { user, setOnboardingComplete } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState("next");
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [formData, setFormData] = useState({
    age: route.params?.age || null,
    birthDate: route.params?.birthDate || null,
    gender: "",
    preferences: "",
    relationshipExpectations: "",
    // New Fields
    displayName: "",
    location: "",
    photos: [],
    bio: "",
    dealBreakers: "",
    budget: "",
    height: "",
    ethnicity: "",
    occupation: "",
    zodiac: "",
    interests: [],
    // Extended Profile Fields
    children: "",
    education: "",
    religion: "",
    politics: "",
    drinking: "",
    smoking: "",
    drugs: "",
    // Additional Details
    relationshipType: "",
    schoolUniversity: "",
    // Visibility Settings
    visibility: {
      basicInfo: true, // Step 1 - Identity
      gender: true, // Step 2 - Identity
      preferences: true, // Step 3 - Identity
      budget: true, // Step 4 - Identity
      relationshipType: true, // Step 5 - Identity
      occupationInterests: true, // Step 6 - Virtues
      education: true, // Step 7 - Virtues
      bio: true, // Step 8 - Virtues
      physical: true, // Step 9 - Vitals
      background: true, // Step 10 - Vitals
      religionPolitics: true, // Step 11 - Vitals
      habits: true, // Step 12 - Vices
      dealBreakers: true, // Step 13 - Vices
      photos: true, // Step 14 - Photos (LAST)
    },
  });

  // Helper function to calculate zodiac sign from birthdate
  const calculateZodiacSign = (birthDate) => {
    if (!birthDate) return "";
    const date = new Date(birthDate);
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
      return "Aries";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
      return "Taurus";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
      return "Gemini";
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
      return "Cancer";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
      return "Virgo";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
      return "Libra";
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
      return "Scorpio";
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
      return "Sagittarius";
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
      return "Capricorn";
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
      return "Aquarius";
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20))
      return "Pisces";
    return "";
  };

  // Auto-calculate zodiac from birthDate if available
  useEffect(() => {
    if (formData.birthDate && !formData.zodiac) {
      const zodiac = calculateZodiacSign(formData.birthDate);
      if (zodiac) {
        updateFormData("zodiac", zodiac);
      }
    }
  }, [formData.birthDate]);

  const totalSteps = 14; // 5 Identity + 3 Virtues + 3 Vitals + 2 Vices + 1 Photos

  useEffect(() => {
    // Age is passed from previous screen, so we just ensure it's in state (already handled by useState init)
  }, []);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error",
  });

  const showAlert = (title, message, type = "error") => {
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
    displayName: "",
    location: "",
    gender: "",
    preferences: "",

    budget: "",
    bio: "",
  });
  const [photosError, setPhotosError] = useState("");

  const validateStep = () => {
    let isValid = true;
    const newErrors = { ...errors };
    setPhotosError("");

    switch (currentStep) {
      case 1: // Basic Info
        if (!formData.displayName) {
          newErrors.displayName = "Name is required";
          isValid = false;
        } else {
          newErrors.displayName = "";
        }
        if (!formData.location) {
          newErrors.location = "Location is required";
          isValid = false;
        } else {
          newErrors.location = "";
        }
        break;
      case 2: // Gender
        if (!formData.gender) {
          newErrors.gender = "Please select your gender";
          isValid = false;
        } else {
          newErrors.gender = "";
        }
        break;
      case 3: // Preferences (Who you'd like to date)
        if (!formData.preferences) {
          newErrors.preferences = "Please select who you are looking for";
          isValid = false;
        } else {
          newErrors.preferences = "";
        }
        break;
      case 4: // Relationship Goals (Budget)
        if (!formData.budget) {
          newErrors.budget = "Please select your relationship goal";
          isValid = false;
        } else {
          newErrors.budget = "";
        }
        break;
      case 8: // Bio
        if (!formData.bio || !formData.bio.trim()) {
          newErrors.bio = "Please write something about yourself";
          isValid = false;
        } else {
          newErrors.bio = "";
        }
        break;
      case 14: // Photos
        if (!formData.photos || formData.photos.length < MANDATORY_PHOTOS) {
          setPhotosError(
            `Please upload at least ${MANDATORY_PHOTOS} photos to continue.`
          );
          isValid = false;
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
        setTransitionDirection("next");
        setCurrentStep((prev) => prev + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setTransitionDirection("back");
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = async () => {
    // Steps 1, 2, 3, and 4 are mandatory and cannot be skipped
    if (
      currentStep === 1 ||
      currentStep === 2 ||

      currentStep === 3 ||
      currentStep === 4 ||
      currentStep === 8
    ) {
      // Trigger validation to show inline errors
      validateStep();
      return;
    }

    // Prevent skipping the photo step without required photos
    if (
      currentStep === 14 &&
      (!formData.photos || formData.photos.length < MANDATORY_PHOTOS)
    ) {
      setPhotosError(
        `Please upload at least ${MANDATORY_PHOTOS} photos before finishing onboarding.`
      );
      return;
    }

    if (currentStep < totalSteps) {
      setTransitionDirection("next");
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  // Clear photo error once requirement is met
  useEffect(() => {
    if (formData.photos && formData.photos.length >= MANDATORY_PHOTOS) {
      setPhotosError("");
    }
  }, [formData.photos]);

  // Animate slide-in when step changes
  useEffect(() => {
    const startOffset =
      transitionDirection === "next" ? SCREEN_WIDTH : -SCREEN_WIDTH;
    slideAnim.setValue(startOffset);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [currentStep, transitionDirection, slideAnim]);

  const calculateCompletion = () => {
    const fields = [
      "displayName",
      "location",
      "gender",
      "preferences", // Required (4)
      "relationshipExpectations",
      "bio",
      "dealBreakers",
      "budget", // Details (4)
      "height",
      "ethnicity",
      "occupation", // Physical/Background (3)
      "children",
      "education",
      "religion",
      "politics",
      "drinking",
      "smoking",
      "drugs", // Habits/Background (7)
    ];

    let filled = 0;
    fields.forEach((field) => {
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
    // Validate ONLY strictly required fields (Steps 1-2, and 4 for preferences)
    if (
      !formData.displayName ||
      !formData.location ||
      !formData.gender ||
      !formData.preferences
    ) {
      showAlert(
        "Error",
        "Please complete the basic information steps (1-2, and 4)"
      );
      return;
    }

    // Enforce minimum photos before completion
    if (!formData.photos || formData.photos.length < MANDATORY_PHOTOS) {
      setPhotosError(
        `Please upload at least ${MANDATORY_PHOTOS} photos to finish.`
      );
      setCurrentStep(14);
      return;
    }

    // ... rest of function

    try {
      setLoading(true);
      console.log("Starting onboarding completion...");

      // Upload photos if they are local URIs
      console.log("Uploading photos...");
      const uploadedPhotos = await Promise.all(
        formData.photos.map(async (photoUri, index) => {
          if (
            photoUri &&
            (photoUri.startsWith("file://") ||
              photoUri.startsWith("content://"))
          ) {
            console.log(`Uploading photo ${index + 1}...`);
            const downloadUrl = await uploadImage(photoUri);
            console.log(
              `Photo ${index + 1} uploaded successfully:`,
              downloadUrl
            );
            return downloadUrl;
          }
          return photoUri;
        })
      );

      // Save onboarding progress
      console.log("Saving onboarding progress...");
      await saveOnboardingProgress(user._id, {
        ...formData,
        photos: uploadedPhotos,
        isComplete: true,
      });
      console.log("Onboarding progress saved");

      // Create or update user document
      console.log("Creating user document...");
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
        ethnicity: formData.ethnicity,
        occupation: formData.occupation,
        zodiac: formData.zodiac,
        interests: formData.interests,
        onboardingCompleted: true,
        isPremium: false,
        isVerified: false,
        // Extended Fields
        children: formData.children,
        education: formData.education,
        religion: formData.religion,
        politics: formData.politics,
        relationshipType: formData.relationshipType,
        schoolUniversity: formData.schoolUniversity,
        drinking: formData.drinking,
        smoking: formData.smoking,
        drugs: formData.drugs,
        visibility: formData.visibility,
      });
      console.log("User document created");

      // Navigate to VerifyAccount screen (Standard flow now requires verification after photos)
      navigation.reset({
        index: 0,
        routes: [{ name: "VerifyAccount" }],
      });
    } catch (error) {
      console.error("Onboarding completion error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      let errorMessage = "Failed to save onboarding data";
      if (error.code === "permission-denied") {
        errorMessage =
          "Permission denied. Please check Firestore security rules.";
      } else if (error.code === "unavailable") {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      showAlert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      // IDENTITY (Steps 1-5)
      case 1:
        return (
          <OnboardingStepBasicInfo
            displayName={formData.displayName}
            location={formData.location}
            isVisible={formData.visibility.basicInfo}
            errors={errors}
            onUpdate={(field, value) => {
              updateFormData(field, value);
              setErrors((prev) => ({ ...prev, [field]: "" }));
            }}
            onToggleVisibility={() =>
              updateFormData("visibility", {
                ...formData.visibility,
                basicInfo: !formData.visibility.basicInfo,
              })
            }
          />
        );
      case 2:
        return (
          <OnboardingStep2
            gender={formData.gender}
            isVisible={formData.visibility.gender}
            errors={errors}
            onUpdate={(gender) => {
              updateFormData("gender", gender);
              setErrors((prev) => ({ ...prev, gender: "" }));
            }}
            onToggleVisibility={() =>
              updateFormData("visibility", {
                ...formData.visibility,
                gender: !formData.visibility.gender,
              })
            }
          />
        );
      case 3:
        return (
          <OnboardingStep3
            preferences={formData.preferences}
            isVisible={formData.visibility.preferences}
            errors={errors}
            onUpdate={(preferences) => {
              updateFormData("preferences", preferences);
              setErrors((prev) => ({ ...prev, preferences: "" }));
            }}
            onToggleVisibility={() =>
              updateFormData("visibility", {
                ...formData.visibility,
                preferences: !formData.visibility.preferences,
              })
            }
          />
        );
      case 4:
        return (
          <OnboardingStepBudget
            budget={formData.budget}
            isVisible={formData.visibility.budget}
            errors={errors}
            currentStep={currentStep}
            onUpdate={(budget) => {
              updateFormData("budget", budget);
              setErrors((prev) => ({ ...prev, budget: "" }));
            }}
            onToggleVisibility={() =>
              updateFormData("visibility", {
                ...formData.visibility,
                budget: !formData.visibility.budget,
              })
            }
          />
        );
      case 5:
        return (
          <OnboardingStepRelationshipType
            relationshipType={formData.relationshipType}
            isVisible={formData.visibility.relationshipType}
            currentStep={currentStep}
            onUpdate={(field, value) => updateFormData(field, value)}
            onToggleVisibility={() =>
              updateFormData("visibility", {
                ...formData.visibility,
                relationshipType: !formData.visibility.relationshipType,
              })
            }
          />
        );
      // VIRTUES (Steps 6-8)
      case 6:
        return (
          <AnimatedInputWrapper delay={100} stepKey={currentStep}>
            <OnboardingStepOccupationInterests
              occupation={formData.occupation}
              interests={formData.interests}
              isVisible={formData.visibility.occupationInterests}
              currentStep={currentStep}
              onUpdate={(field, value) => updateFormData(field, value)}
              onShowAlert={showAlert}
              onToggleVisibility={() =>
                updateFormData("visibility", {
                  ...formData.visibility,
                  occupationInterests: !formData.visibility.occupationInterests,
                })
              }
            />
          </AnimatedInputWrapper>
        );
      case 7:
        return (
          <AnimatedInputWrapper delay={100} stepKey={currentStep}>
            <OnboardingStepEducation
              education={formData.education}
              schoolUniversity={formData.schoolUniversity}
              isVisible={formData.visibility.education}
              currentStep={currentStep}
              onUpdate={(field, value) => updateFormData(field, value)}
              onToggleVisibility={() =>
                updateFormData("visibility", {
                  ...formData.visibility,
                  education: !formData.visibility.education,
                })
              }
            />
          </AnimatedInputWrapper>
        );
      case 8:
        return (
          <AnimatedInputWrapper delay={100} stepKey={currentStep}>
            <OnboardingStepBio
              bio={formData.bio}
              isVisible={formData.visibility.bio}
              currentStep={currentStep}
              errors={errors}
              onUpdate={(field, value) => updateFormData(field, value)}
              onToggleVisibility={() =>
                updateFormData("visibility", {
                  ...formData.visibility,
                  bio: !formData.visibility.bio,
                })
              }
            />
          </AnimatedInputWrapper>
        );
      // VITALS (Steps 9-11)
      case 9:
        return (
          <AnimatedInputWrapper delay={100} stepKey={currentStep}>
            <OnboardingStepPhysical
              height={formData.height}
              zodiac={formData.zodiac}
              isVisible={formData.visibility.physical}
              currentStep={currentStep}
              onUpdate={(field, value) => updateFormData(field, value)}
              onToggleVisibility={() =>
                updateFormData("visibility", {
                  ...formData.visibility,
                  physical: !formData.visibility.physical,
                })
              }
            />
          </AnimatedInputWrapper>
        );
      case 10:
        return (
          <AnimatedInputWrapper delay={100} stepKey={currentStep}>
            <OnboardingStepBackground
              ethnicity={formData.ethnicity}
              children={formData.children}
              isVisible={formData.visibility.background}
              currentStep={currentStep}
              onUpdate={(field, value) => updateFormData(field, value)}
              onToggleVisibility={() =>
                updateFormData("visibility", {
                  ...formData.visibility,
                  background: !formData.visibility.background,
                })
              }
            />
          </AnimatedInputWrapper>
        );
      case 11:
        return (
          <AnimatedInputWrapper delay={100} stepKey={currentStep}>
            <OnboardingStepReligionPolitics
              religion={formData.religion}
              politics={formData.politics}
              isVisible={formData.visibility.religionPolitics}
              currentStep={currentStep}
              onUpdate={(field, value) => updateFormData(field, value)}
              onToggleVisibility={() =>
                updateFormData("visibility", {
                  ...formData.visibility,
                  religionPolitics: !formData.visibility.religionPolitics,
                })
              }
            />
          </AnimatedInputWrapper>
        );
      // VICES (Steps 12-13)
      case 12:
        return (
          <AnimatedInputWrapper delay={100} stepKey={currentStep}>
            <OnboardingStepHabits
              drinking={formData.drinking}
              smoking={formData.smoking}
              drugs={formData.drugs}
              isVisible={formData.visibility.habits}
              currentStep={currentStep}
              onUpdate={(field, value) => updateFormData(field, value)}
              onToggleVisibility={() =>
                updateFormData("visibility", {
                  ...formData.visibility,
                  habits: !formData.visibility.habits,
                })
              }
            />
          </AnimatedInputWrapper>
        );
      case 13:
        return (
          <AnimatedInputWrapper delay={100} stepKey={currentStep}>
            <OnboardingStepDealBreakers
              dealBreakers={formData.dealBreakers}
              isVisible={formData.visibility.dealBreakers}
              currentStep={currentStep}
              onUpdate={(field, value) => updateFormData(field, value)}
              onToggleVisibility={() =>
                updateFormData("visibility", {
                  ...formData.visibility,
                  dealBreakers: !formData.visibility.dealBreakers,
                })
              }
            />
          </AnimatedInputWrapper>
        );
      // PHOTOS (Step 14 - LAST)
      case 14:
        return (
          <AnimatedInputWrapper delay={100} stepKey={currentStep}>
            <OnboardingStepPhotos
              photos={formData.photos}
              isVisible={formData.visibility.photos}
              currentStep={currentStep}
              photosError={photosError}
              onUpdate={(photos) => updateFormData("photos", photos)}
              onShowAlert={showAlert}
              onToggleVisibility={() =>
                updateFormData("visibility", {
                  ...formData.visibility,
                  photos: !formData.visibility.photos,
                })
              }
            />
          </AnimatedInputWrapper>
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
              colors={["#D4AF37", "#F2D06B"]} // Gold gradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { width: `${(currentStep / totalSteps) * 100}%` },
              ]}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            <Text style={[styles.progressText, { color: "#D4AF37" }]}>
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
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <Animated.View
            style={[
              styles.stepWrapper,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {renderStep()}
          </Animated.View>
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
                  {currentStep === totalSteps ? "✓ Complete" : "Next →"}
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
const OnboardingStepBasicInfo = ({
  displayName,
  location,
  isVisible,
  errors,
  onUpdate,
  onToggleVisibility,
  currentStep,
}) => {
  const [loadingLocation, setLoadingLocation] = useState(false);

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Permission to access location was denied"
        );
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
        const formattedLocation = region
          ? `${city}, ${region}`
          : `${city}, ${country}`;
        onUpdate("location", formattedLocation);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Could not fetch location");
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>Let's start with the basics</Text>
        <Text style={styles.stepDescription}>
          How should we call you and where are you from?
        </Text>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={200} stepKey={currentStep}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            style={[
              styles.simpleInput,
              errors?.displayName && styles.inputError,
            ]}
            placeholder="e.g. Alex"
            placeholderTextColor="#999999"
            value={displayName}
            onChangeText={(text) => onUpdate("displayName", text)}
            autoCapitalize="words"
          />
          {errors?.displayName ? (
            <Text style={styles.errorText}>{errors.displayName}</Text>
          ) : null}
        </View>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={300} stepKey={currentStep}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Location</Text>
          <View style={styles.locationInputContainer}>
            <TextInput
              style={[
                styles.simpleInput,
                { flex: 1 },
                errors?.location && styles.inputError,
              ]}
              placeholder="e.g. New York, NY"
              placeholderTextColor="#999999"
              value={location}
              onChangeText={(text) => onUpdate("location", text)}
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
          {errors?.location ? (
            <Text style={styles.errorText}>{errors.location}</Text>
          ) : null}
        </View>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={400} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? "#000000" : "#999999"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

// Step 10: Photos
const OnboardingStepPhotos = ({
  photos,
  isVisible,
  onUpdate,
  onShowAlert,
  onToggleVisibility,
  photosError = "",
}) => {
  // Initialize photos array with 6 slots (fill existing photos into array)
  const initializePhotosArray = () => {
    const photosArray = Array(TOTAL_PHOTOS).fill(null);
    photos.slice(0, TOTAL_PHOTOS).forEach((photo, index) => {
      photosArray[index] = photo;
    });
    return photosArray;
  };

  const [photosArray, setPhotosArray] = useState(initializePhotosArray);
  const [uploadingPosition, setUploadingPosition] = useState(null);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [selectedPhotoPosition, setSelectedPhotoPosition] = useState(null);

  // Update parent when photosArray changes
  useEffect(() => {
    const validPhotos = photosArray.filter((p) => p !== null);
    onUpdate(validPhotos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photosArray]);

  const handleAddPhoto = async (position) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingPosition(position);
        const newPhotos = [...photosArray];
        newPhotos[position] = result.assets[0].uri;
        setPhotosArray(newPhotos);
        setUploadingPosition(null);
      }
    } catch (error) {
      console.error("Photo selection error:", error);
      setUploadingPosition(null);
      onShowAlert("Error", "Failed to select photo", "error");
    }
  };

  const handleRemovePhoto = (position) => {
    setSelectedPhotoPosition(position);
    setShowReplaceModal(true);
  };

  const handleReplacePhoto = async (position) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled) {
        setShowReplaceModal(false);
        setUploadingPosition(position);
        const newPhotos = [...photosArray];
        newPhotos[position] = result.assets[0].uri;
        setPhotosArray(newPhotos);
        setUploadingPosition(null);
        setSelectedPhotoPosition(null);
      }
    } catch (error) {
      console.error("Photo replacement error:", error);
      setUploadingPosition(null);
      onShowAlert("Error", "Failed to replace photo", "error");
    }
  };

  const handleSetToMain = (position) => {
    if (position === 0) return;

    setPhotosArray((prevPhotos) => {
      const newPhotos = [...prevPhotos];
      const photoToMove = newPhotos[position];
      const currentMainPhoto = newPhotos[0];

      newPhotos[0] = photoToMove;
      newPhotos[position] = currentMainPhoto;

      return newPhotos;
    });
  };

  const handleReplace = async () => {
    if (selectedPhotoPosition !== null) {
      await handleReplacePhoto(selectedPhotoPosition);
    }
  };

  const handleRemove = () => {
    if (selectedPhotoPosition !== null) {
      const newPhotos = [...photosArray];
      newPhotos[selectedPhotoPosition] = null;
      setPhotosArray(newPhotos);
      setShowReplaceModal(false);
      setSelectedPhotoPosition(null);
    }
  };

  const PhotoItem = ({ photo, position, isMain }) => {
    const isUploading = uploadingPosition === position;

    if (!photo) {
      const isRequired = position < MANDATORY_PHOTOS;
      const iconColor = isRequired ? "#6E6E73" : "rgba(0,0,0,0.35)";
      const labelColor = isRequired ? "#4A4A4A" : "rgba(0,0,0,0.45)";

      return (
        <TouchableOpacity
          style={[
            styles.onboardingPhotoSlot,
            { width: ONBOARDING_PHOTO_SIZE, height: ONBOARDING_PHOTO_SIZE },
            isMain && styles.onboardingMainPhotoSlot,
            isRequired
              ? styles.onboardingRequiredSlot
              : styles.onboardingOptionalSlot,
          ]}
          onPress={() => handleAddPhoto(position)}
          disabled={isUploading}
        >
          {isUploading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={styles.uploadingText}>Loading...</Text>
            </View>
          ) : (
            <>
              <Ionicons name="add" size={32} color={iconColor} />
              <Text style={[styles.addPhotoText, { color: labelColor }]}>
                {isMain ? "Main" : isRequired ? "Required" : "Optional"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <View
        style={[
          styles.onboardingPhotoContainer,
          { width: ONBOARDING_PHOTO_SIZE, height: ONBOARDING_PHOTO_SIZE },
          isMain && styles.onboardingMainPhotoContainer,
        ]}
      >
        <Image
          source={{ uri: photo }}
          style={[
            styles.onboardingPhoto,
            { width: ONBOARDING_PHOTO_SIZE, height: ONBOARDING_PHOTO_SIZE },
          ]}
        />

        {isUploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.uploadingText}>Loading...</Text>
          </View>
        )}

        {isMain && (
          <View style={styles.mainPhotoBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.mainPhotoText}>Main</Text>
          </View>
        )}

        {!isUploading && (
          <>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemovePhoto(position)}
            >
              <Ionicons name="close-circle" size={16} color="#fff" />
            </TouchableOpacity>
            {!isMain && (
              <TouchableOpacity
                style={styles.setToMainButton}
                onPress={() => handleSetToMain(position)}
              >
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.setToMainText}>Set to Main</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Add your best photos</Text>
      <Text style={styles.stepDescription}>
        Start with your best main photo. A minimum of {MANDATORY_PHOTOS} photos
        are required to complete your profile.
      </Text>
      {photosError ? (
        <Text style={[styles.errorText, { textAlign: "center", marginTop: 3 }]}>
          {photosError}
        </Text>
      ) : null}

      <View style={styles.onboardingPhotosGrid}>
        {Array.from({ length: TOTAL_PHOTOS }).map((_, index) => (
          <PhotoItem
            key={`photo-${index}-${photosArray[index] ? "filled" : "empty"}`}
            photo={photosArray[index]}
            position={index}
            isMain={index === 0}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.visibilityToggle}
        onPress={onToggleVisibility}
      >
        <Ionicons
          name={isVisible ? "eye" : "eye-off"}
          size={24}
          color={isVisible ? "#000000" : "#999999"}
        />
        <Text
          style={[
            styles.visibilityText,
            isVisible && styles.visibilityTextActive,
          ]}
        >
          {isVisible ? "Visible on Profile" : "Hidden from Profile"}
        </Text>
      </TouchableOpacity>

      {/* Replace Photo Modal */}
      <Modal
        visible={showReplaceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowReplaceModal(false);
          setSelectedPhotoPosition(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowReplaceModal(false);
            setSelectedPhotoPosition(null);
          }}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Replace Photo</Text>
            <Text style={styles.modalSubtitle}>
              Choose an option for this photo.
            </Text>

            <TouchableOpacity
              style={[styles.modalButton, styles.replaceButton]}
              onPress={handleReplace}
            >
              <Ionicons name="sync-outline" size={24} color="#fff" />
              <Text style={styles.modalButtonText}>Replace</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.cameraRollButton]}
              onPress={handleRemove}
            >
              <Ionicons name="trash-outline" size={24} color="#000" />
              <Text
                style={[styles.modalButtonText, styles.cameraRollButtonText]}
              >
                Remove
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowReplaceModal(false);
                setSelectedPhotoPosition(null);
              }}
            >
              <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// Step 2: Gender
const OnboardingStep2 = ({
  gender,
  isVisible,
  errors,
  onUpdate,
  onToggleVisibility,
  currentStep,
}) => {
  const genders = ["Male", "Female", "Non-binary", "Prefer not to say"];

  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>What's your gender?</Text>
        <Text style={styles.stepDescription}>
          Select the option that best describes you
        </Text>
      </AnimatedInputWrapper>
      <AnimatedInputWrapper delay={200} stepKey={currentStep}>
        <View style={styles.optionsContainer}>
          {genders.map((option, index) => (
            <AnimatedInputWrapper
              key={option}
              delay={250 + index * 50}
              stepKey={currentStep}
            >
              <TouchableOpacity
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
            </AnimatedInputWrapper>
          ))}
          {errors?.gender ? (
            <Text
              style={[styles.errorText, { textAlign: "center", width: "100%" }]}
            >
              {errors.gender}
            </Text>
          ) : null}
        </View>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={500} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

// Step 3: Dating Preferences
const OnboardingStep3 = ({
  preferences,
  isVisible,
  errors,
  onUpdate,
  onToggleVisibility,
  currentStep,
}) => {
  const preferenceOptions = ["Men", "Women", "Everyone"];

  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>Who would you like to date?</Text>
        <Text style={styles.stepDescription}>
          This helps us show you the right people
        </Text>
      </AnimatedInputWrapper>
      <AnimatedInputWrapper delay={200} stepKey={currentStep}>
        <View style={styles.optionsContainer}>
          {preferenceOptions.map((option, index) => (
            <AnimatedInputWrapper
              key={option}
              delay={250 + index * 50}
              stepKey={currentStep}
            >
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  preferences === option && styles.optionButtonSelected,
                  errors?.preferences &&
                    !preferences &&
                    styles.optionButtonError,
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
            </AnimatedInputWrapper>
          ))}
          {errors?.preferences ? (
            <Text
              style={[styles.errorText, { textAlign: "center", width: "100%" }]}
            >
              {errors.preferences}
            </Text>
          ) : null}
        </View>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={400} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

// Step 4: Relationship Goals
const OnboardingStepBudget = ({
  budget,
  isVisible,
  errors,
  onUpdate,
  onToggleVisibility,
  currentStep,
}) => {
  const relationshipGoals = [
    "Long-term relationship",
    "Short-term fun",
    "Casual dating",
    "Friendship",
    "Marriage",
    "Still figuring it out",
  ];

  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>What are you looking for?</Text>
        <Text style={styles.stepDescription}>
          Select your relationship goals
        </Text>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={200} stepKey={currentStep}>
        <View style={styles.optionsContainer}>
          {relationshipGoals.map((option, index) => (
            <AnimatedInputWrapper
              key={option}
              delay={250 + index * 50}
              stepKey={currentStep}
            >
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  budget === option && styles.optionButtonSelected,
                  errors?.budget && !budget && styles.optionButtonError,
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
            </AnimatedInputWrapper>
          ))}
          {errors?.budget ? (
            <Text
              style={[
                styles.errorText,
                { textAlign: "center", width: "100%", marginTop: 8 },
              ]}
            >
              {errors.budget}
            </Text>
          ) : null}
        </View>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={500} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

// Step 5: Identity - Relationship Type
const OnboardingStepRelationshipType = ({
  relationshipType,
  isVisible,
  onUpdate,
  onToggleVisibility,
  currentStep,
}) => {
  const relationshipTypes = ["Monogamy", "Non-monogamy", "Figuring out"];

  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>Relationship Type</Text>
        <Text style={styles.stepDescription}>
          What type of relationship are you looking for?
        </Text>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={200} stepKey={currentStep}>
        <View style={styles.chipContainer}>
          {relationshipTypes.map((type, index) => (
            <AnimatedInputWrapper
              key={type}
              delay={250 + index * 50}
              stepKey={currentStep}
            >
              <TouchableOpacity
                style={[
                  styles.chip,
                  relationshipType === type && styles.chipSelected,
                ]}
                onPress={() => onUpdate("relationshipType", type)}
              >
                <Text
                  style={[
                    styles.chipText,
                    relationshipType === type && styles.chipTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            </AnimatedInputWrapper>
          ))}
        </View>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={400} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

// Step 6: Virtues - Occupation & Interests
const OnboardingStepOccupationInterests = ({
  occupation,
  interests = [],
  isVisible,
  onUpdate,
  onShowAlert,
  onToggleVisibility,
  currentStep,
}) => {
  const allInterests = [
    "Fine Dining",
    "Luxury Travel",
    "Art & Culture",
    "Fitness",
    "Nightlife",
    "Business",
    "Fashion",
    "Music",
    "Wine & Spirits",
    "Golf",
    "Yachting",
    "Spa & Wellness",
    "Photography",
    "Cooking",
    "Tech",
    "Outdoors",
  ];

  const toggleInterest = (interest) => {
    if (interests.includes(interest)) {
      onUpdate(
        "interests",
        interests.filter((i) => i !== interest)
      );
    } else {
      if (interests.length < 5) {
        onUpdate("interests", [...interests, interest]);
      } else {
        onShowAlert(
          "Limit Reached",
          "You can select up to 5 interests",
          "warning"
        );
      }
    }
  };

  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>Occupation & Interests</Text>
        <Text style={styles.stepDescription}>
          Tell us about your career and what you enjoy
        </Text>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={200} stepKey={currentStep}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Occupation</Text>
          <TextInput
            style={styles.simpleInput}
            placeholder="e.g. Entrepreneur, Student, Model"
            placeholderTextColor="#999999"
            value={occupation}
            onChangeText={(text) => onUpdate("occupation", text)}
          />
        </View>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={300} stepKey={currentStep}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Interests (Select up to 5)</Text>
          <View style={styles.chipContainer}>
            {allInterests.map((item, index) => (
              <AnimatedInputWrapper
                key={item}
                delay={350 + index * 30}
                stepKey={currentStep}
              >
                <TouchableOpacity
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
              </AnimatedInputWrapper>
            ))}
          </View>
        </View>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={550} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

// Step 7: Virtues - Education
const OnboardingStepEducation = ({
  education,
  schoolUniversity,
  isVisible,
  onUpdate,
  onToggleVisibility,
  currentStep,
}) => {
  const educationLevels = [
    "High School",
    "Undergraduate",
    "Postgraduate",
    "PhD/Doctorate",
    "Trade/Vocational",
  ];

  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>Education</Text>
        <Text style={styles.stepDescription}>
          Share your educational background
        </Text>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={200} stepKey={currentStep}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Education Level</Text>
          <View style={styles.chipContainer}>
            {educationLevels.map((level, index) => (
              <AnimatedInputWrapper
                key={level}
                delay={250 + index * 30}
                stepKey={currentStep}
              >
                <TouchableOpacity
                  style={[
                    styles.chip,
                    education === level && styles.chipSelected,
                  ]}
                  onPress={() => onUpdate("education", level)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      education === level && styles.chipTextSelected,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              </AnimatedInputWrapper>
            ))}
          </View>
        </View>
      </AnimatedInputWrapper>

      {education &&
        education !== "High School" &&
        education !== "Trade/Vocational" && (
          <AnimatedInputWrapper delay={400} stepKey={currentStep}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                School or University (Optional)
              </Text>
              <GlassCard style={styles.inputCard} opacity={0.2}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Harvard University, MIT, etc."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={schoolUniversity}
                  onChangeText={(text) => onUpdate("schoolUniversity", text)}
                />
              </GlassCard>
            </View>
          </AnimatedInputWrapper>
        )}

      <AnimatedInputWrapper delay={500} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

const OnboardingStepBio = ({
  bio,
  isVisible,
  onUpdate,
  onToggleVisibility,
  currentStep,
  errors,
}) => {
  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>About You</Text>
        <Text style={styles.stepDescription}>Tell us about yourself</Text>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={200} stepKey={currentStep}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bio</Text>
          <GlassCard style={[styles.inputCard, errors?.bio && { borderColor: '#FF3B30', borderWidth: 1 }]} opacity={0.2}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about yourself..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={bio}
              onChangeText={(text) => onUpdate("bio", text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </GlassCard>
          {errors?.bio ? (
            <Text style={{ color: '#FF3B30', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.bio}</Text>
          ) : null}
        </View>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={400} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

// Step 9: Vitals - Physical
const OnboardingStepPhysical = ({
  height,
  zodiac,
  isVisible,
  onUpdate,
  onToggleVisibility,
  currentStep,
}) => {
  const zodiacSigns = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
  ];

  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>Physical</Text>
        <Text style={styles.stepDescription}>
          Your physical characteristics
        </Text>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={200} stepKey={currentStep}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Height</Text>
          <View style={styles.sliderContainer}>
            <View style={styles.heightDisplayContainer}>
              <FontAwesome5
                name="ruler-vertical"
                size={24}
                color="rgba(255,255,255,0.8)"
                style={{ marginRight: 10 }}
              />
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
                onValueChange={(value) => onUpdate("height", value.toString())}
                minimumTrackTintColor="#000000"
                maximumTrackTintColor="rgba(0, 0, 0, 0.08)"
                thumbTintColor="#FFFFFF"
              />
              <View style={styles.rulerContainer}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.rulerTick,
                      i % 2 === 0
                        ? styles.rulerTickMajor
                        : styles.rulerTickMinor,
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>140cm</Text>
              <Text style={styles.sliderLabel}>220cm</Text>
            </View>
          </View>
        </View>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={360} stepKey={currentStep}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Zodiac Sign</Text>
          <View style={styles.chipContainer}>
            {zodiacSigns.map((sign, index) => (
              <AnimatedInputWrapper
                key={sign}
                delay={400 + index * 30}
                stepKey={currentStep}
              >
                <TouchableOpacity
                  style={[styles.chip, zodiac === sign && styles.chipSelected]}
                  onPress={() => onUpdate("zodiac", sign)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      zodiac === sign && styles.chipTextSelected,
                    ]}
                  >
                    {sign}
                  </Text>
                </TouchableOpacity>
              </AnimatedInputWrapper>
            ))}
          </View>
        </View>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={560} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

// Step 10: Vitals - Background
const OnboardingStepBackground = ({
  ethnicity,
  children,
  isVisible,
  onUpdate,
  onToggleVisibility,
  currentStep,
}) => {
  const ethnicities = [
    "Black/African Descent",
    "East Asian",
    "Hispanic/Latino",
    "Middle Eastern",
    "Native American",
    "Pacific Islander",
    "South Asian",
    "White/Caucasian",
    "Other",
  ];

  const childrenOptions = [
    "Have children",
    "Don't have children",
    "Prefer not to say",
  ];

  const renderSelect = (label, value, options, field, baseDelay = 0) => (
    <AnimatedInputWrapper delay={baseDelay} stepKey={currentStep}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          {options.map((option, index) => (
            <AnimatedInputWrapper
              key={option}
              delay={baseDelay + 50 + index * 30}
              stepKey={currentStep}
            >
              <TouchableOpacity
                style={[
                  styles.chip,
                  value === option && styles.chipSelected,
                  { marginRight: 10 },
                ]}
                onPress={() => onUpdate(field, option)}
              >
                <Text
                  style={[
                    styles.chipText,
                    value === option && styles.chipTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            </AnimatedInputWrapper>
          ))}
        </ScrollView>
      </View>
    </AnimatedInputWrapper>
  );

  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>Background</Text>
        <Text style={styles.stepDescription}>
          Share a bit more about your background
        </Text>
      </AnimatedInputWrapper>

      {renderSelect("Ethnicity", ethnicity, ethnicities, "ethnicity", 200)}
      {renderSelect("Children", children, childrenOptions, "children", 300)}

      <AnimatedInputWrapper delay={500} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

// Step 11: Vitals - Religion & Politics
const OnboardingStepReligionPolitics = ({
  religion,
  politics,
  isVisible,
  onUpdate,
  onToggleVisibility,
  currentStep,
}) => {
  const religionOptions = [
    "Christianity",
    "Islam",
    "Judaism",
    "Hinduism",
    "Buddhism",
    "Spiritual",
    "Agnostic",
    "Atheist",
    "Other",
  ];

  const politicsOptions = [
    "Liberal",
    "Moderate",
    "Conservative",
    "Apolitical",
    "Other",
  ];

  const renderSelect = (label, value, options, field, baseDelay = 0) => (
    <AnimatedInputWrapper delay={baseDelay} stepKey={currentStep}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          {options.map((option, index) => (
            <AnimatedInputWrapper
              key={option}
              delay={baseDelay + 50 + index * 30}
              stepKey={currentStep}
            >
              <TouchableOpacity
                style={[
                  styles.chip,
                  value === option && styles.chipSelected,
                  { marginRight: 10 },
                ]}
                onPress={() => onUpdate(field, option)}
              >
                <Text
                  style={[
                    styles.chipText,
                    value === option && styles.chipTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            </AnimatedInputWrapper>
          ))}
        </ScrollView>
      </View>
    </AnimatedInputWrapper>
  );

  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>Religion & Politics</Text>
        <Text style={styles.stepDescription}>Your beliefs and values</Text>
      </AnimatedInputWrapper>

      {renderSelect(
        "Religious Beliefs",
        religion,
        religionOptions,
        "religion",
        200
      )}
      {renderSelect(
        "Political Beliefs",
        politics,
        politicsOptions,
        "politics",
        300
      )}

      <AnimatedInputWrapper delay={500} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

// Step 12: Vices - Habits
const OnboardingStepHabits = ({
  drinking,
  smoking,
  drugs,
  isVisible,
  onUpdate,
  onToggleVisibility,
  currentStep,
}) => {
  const habitsOptions = ["Yes", "Sometimes", "No", "Prefer not to say"];

  const renderOption = (label, value, field, baseDelay) => (
    <AnimatedInputWrapper delay={baseDelay} stepKey={currentStep}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.chipContainer}>
          {habitsOptions.map((option, index) => (
            <AnimatedInputWrapper
              key={option}
              delay={baseDelay + 50 + index * 30}
              stepKey={currentStep}
            >
              <TouchableOpacity
                style={[styles.chip, value === option && styles.chipSelected]}
                onPress={() => onUpdate(field, option)}
              >
                <Text
                  style={[
                    styles.chipText,
                    value === option && styles.chipTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            </AnimatedInputWrapper>
          ))}
        </View>
      </View>
    </AnimatedInputWrapper>
  );

  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>Lifestyle Habits</Text>
        <Text style={styles.stepDescription}>
          Do you drink, smoke, or use recreational drugs?
        </Text>
      </AnimatedInputWrapper>

      {renderOption("Do you drink?", drinking, "drinking", 200)}
      {renderOption("Do you smoke?", smoking, "smoking", 300)}
      {renderOption("Do you use marijuana?", drugs, "drugs", 400)}

      <AnimatedInputWrapper delay={550} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

// Step 13: Vices - Deal-breakers
const OnboardingStepDealBreakers = ({
  dealBreakers,
  isVisible,
  onUpdate,
  onToggleVisibility,
  currentStep,
}) => {
  return (
    <View style={styles.stepContainer}>
      <AnimatedInputWrapper delay={100} stepKey={currentStep}>
        <Text style={styles.stepTitle}>Deal-breakers</Text>
        <Text style={styles.stepDescription}>
          What are your deal-breakers? (Optional)
        </Text>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={200} stepKey={currentStep}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Deal-breakers</Text>
          <GlassCard style={styles.inputCard} opacity={0.2}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Smoking, dishonesty..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={dealBreakers}
              onChangeText={(text) => onUpdate("dealBreakers", text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </GlassCard>
        </View>
      </AnimatedInputWrapper>

      <AnimatedInputWrapper delay={450} stepKey={currentStep}>
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={onToggleVisibility}
        >
          <Ionicons
            name={isVisible ? "eye" : "eye-off"}
            size={24}
            color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
          />
          <Text
            style={[
              styles.visibilityText,
              isVisible && styles.visibilityTextActive,
            ]}
          >
            {isVisible ? "Visible on Profile" : "Hidden from Profile"}
          </Text>
        </TouchableOpacity>
      </AnimatedInputWrapper>
    </View>
  );
};

// Step 8: Interests
const OnboardingStepInterests = ({
  interests = [],
  isVisible,
  onUpdate,
  onShowAlert,
  onToggleVisibility,
}) => {
  const allInterests = [
    "Fine Dining",
    "Luxury Travel",
    "Art & Culture",
    "Fitness",
    "Nightlife",
    "Business",
    "Fashion",
    "Music",
    "Wine & Spirits",
    "Golf",
    "Yachting",
    "Spa & Wellness",
    "Photography",
    "Cooking",
    "Tech",
    "Outdoors",
  ];

  const toggleInterest = (interest) => {
    if (interests.includes(interest)) {
      onUpdate(interests.filter((i) => i !== interest));
    } else {
      if (interests.length < 5) {
        onUpdate([...interests, interest]);
      } else {
        onShowAlert(
          "Limit Reached",
          "You can select up to 5 interests",
          "warning"
        );
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

      <TouchableOpacity
        style={styles.visibilityToggle}
        onPress={onToggleVisibility}
      >
        <Ionicons
          name={isVisible ? "eye" : "eye-off"}
          size={24}
          color={isVisible ? theme.colors.primary : "rgba(255,255,255,0.5)"}
        />
        <Text
          style={[
            styles.visibilityText,
            isVisible && styles.visibilityTextActive,
          ]}
        >
          {isVisible ? "Visible on Profile" : "Hidden from Profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Step 6: Relationship Expectations
const OnboardingStep4 = ({ relationshipExpectations, onUpdate }) => {
  const [text, setText] = useState(relationshipExpectations || "");

  const handleTextChange = (value) => {
    setText(value);
    onUpdate(value);
  };

  const quickOptions = [
    {
      label: "Mentorship & Guidance",
      icon: "chalkboard-teacher",
      lib: "FontAwesome5",
    },
    { label: "Lifestyle Support", icon: "gem", lib: "FontAwesome5" },
    { label: "Emotional Connection", icon: "heart", lib: "FontAwesome" },
    { label: "Mutual Respect", icon: "handshake", lib: "FontAwesome5" },
    { label: "Long-term Partnership", icon: "infinity", lib: "FontAwesome5" },
  ];

  const toggleOption = (optionLabel) => {
    const newText = text.includes(optionLabel)
      ? text
          .replace(optionLabel + ", ", "")
          .replace(", " + optionLabel, "")
          .replace(optionLabel, "")
      : text
      ? `${text}, ${optionLabel}`
      : optionLabel;
    handleTextChange(newText);
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        What are your relationship expectations?
      </Text>
      <Text style={styles.stepDescription}>
        Select what matters to you or describe it below
      </Text>

      <View style={styles.expectationsGrid}>
        {quickOptions.map((option) => {
          const isSelected = text.includes(option.label);
          const IconLib =
            option.lib === "FontAwesome5" ? FontAwesome5 : FontAwesome;

          return (
            <TouchableOpacity
              key={option.label}
              style={styles.expectationCardWrapper}
              onPress={() => toggleOption(option.label)}
            >
              <GlassCard
                style={[
                  styles.expectationCard,
                  isSelected && styles.expectationCardSelected,
                ]}
                opacity={isSelected ? 0.4 : 0.15}
              >
                <IconLib
                  name={option.icon}
                  size={24}
                  color={isSelected ? "#fff" : "rgba(255,255,255,0.7)"}
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
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#F0F0F0",
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
    width: 60,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#000000", // Elegant black accent
  },
  progressText: {
    color: "#8E8E93",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 220,
    flexGrow: 1,
  },
  stepWrapper: {
    width: "100%",
  },
  stepContainer: {
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#000000",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: 16,
    color: "#666666",
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    // No background color, just clean layout
  },
  inputLabel: {
    fontSize: 14,
    color: "#000000",
    marginBottom: 8,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  simpleInput: {
    backgroundColor: "#FAFAFA", // Very subtle gray
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E5E5EA", // Subtle border
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  optionButtonSelected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#000000",
    borderWidth: 2,
  },
  optionText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#000000",
    fontWeight: "700",
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  cardSelected: {
    borderColor: "#000000",
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  cardIconSelected: {
    backgroundColor: "#000000",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  photoSlot: {
    width: "30%",
    aspectRatio: 0.8,
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  // Onboarding Photo Grid Styles (matching EditProfileScreen)
  onboardingPhotosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  onboardingPhotoSlot: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  onboardingRequiredSlot: {
    borderColor: "rgba(0,0,0,0.2)",
  },
  onboardingOptionalSlot: {
    borderColor: "rgba(0,0,0,0.08)",
  },
  onboardingMainPhotoSlot: {
    borderColor: "#000",
    borderWidth: 2,
  },
  onboardingPhotoContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  onboardingMainPhotoContainer: {
    borderWidth: 2,
    borderColor: "#000",
  },
  onboardingPhoto: {
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
  },
  addPhotoText: {
    fontSize: 10,
    color: "#666666",
    marginTop: 4,
    fontWeight: "500",
  },
  removePhotoButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  // Shared styles for photo items
  mainPhotoBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  mainPhotoText: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "700",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 999,
    padding: 4,
  },
  setToMainButton: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  setToMainText: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "700",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  uploadingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 80,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  replaceButton: {
    backgroundColor: "#000",
  },
  cameraRollButton: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cancelButton: {
    backgroundColor: "transparent",
    marginTop: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  cameraRollButtonText: {
    color: "#000",
  },
  cancelButtonText: {
    color: "#666",
  },
  navigation: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonCard: {
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  backButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  sliderContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  heightDisplayContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  heightDisplay: {
    fontSize: 48,
    fontWeight: "700",
    color: "#000000",
  },
  unitText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#8E8E93",
    marginLeft: 8,
    marginTop: 12,
  },
  sliderWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  rulerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    height: 24,
    marginTop: -12,
    paddingHorizontal: 12,
  },
  rulerTick: {
    width: 1,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    borderRadius: 1,
  },
  rulerTickMajor: {
    height: 16,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  rulerTickMinor: {
    height: 8,
    marginTop: 6,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: "rgba(0, 0, 0, 0.35)",
    fontWeight: "500",
  },
  skipButton: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    color: "#8E8E93",
    fontSize: 16,
    fontWeight: "500",
  },
  nextButton: {
    flex: 1,
    backgroundColor: "#D4AF37",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    overflow: "hidden",
  },
  nextButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  chipSelected: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  chipText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  locationInputContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  locationButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D4AF37",
  },
  horizontalScroll: {
    flexDirection: "row",
    marginBottom: 8,
  },
  visibilityToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#FAFAFA",
    borderRadius: 100,
    gap: 8,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  visibilityText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "600",
  },
  visibilityTextActive: {
    color: "#000000",
  },
  inputError: {
    borderColor: "#FF3B30",
    borderWidth: 1,
  },
  optionButtonError: {
    borderColor: "#FF3B30",
    borderWidth: 1,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,

    marginLeft: 4,
    marginBottom: 16,
  },
  inputSubLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontStyle: "italic",
    marginTop: 8,
  },
});

export default OnboardingWizard;
