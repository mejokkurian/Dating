import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import * as ImagePicker from "expo-image-picker";
import { uploadImage } from "../../services/api/upload";
import { updateUserDocument } from "../../services/api/user";
// Components
import ProfileHeader from "./components/ProfileHeader";
import VerificationBanner from "./components/VerificationBanner";
import ProfileSection from "./components/ProfileSection";
import ProfileTextInput from "./components/ProfileTextInput";
import ProfileOptionChips from "./components/ProfileOptionChips";
import ProfileInterests from "./components/ProfileInterests";
import ProfileViewField from "./components/ProfileViewField";
import TwoColumnRow from "./components/TwoColumnRow";
import PhotoGrid from "./components/PhotoGrid/PhotoGrid";
import ReplacePhotoBottomSheet from "./components/PhotoGrid/ReplacePhotoBottomSheet";
import ProfileContent from "../../components/ProfileContent";
import CustomAlert from "../../components/CustomAlertRef";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Card has marginHorizontal: 20 (40px total) + padding: 20 (40px total) = 80px side spacing
// For 3 columns with space-between: we calculate width that fills the container
const CARD_SIDE_SPACING = 80; // 40px margin + 40px padding
const CONTAINER_WIDTH = SCREEN_WIDTH - CARD_SIDE_SPACING; // Available width inside card
// For 3 columns: divide by 3, then subtract gap spacing (2 gaps / 3 items ≈ 0.667 gap per item)
const PHOTO_SIZE = (CONTAINER_WIDTH - 20) / 3; // 20px for gaps (2 gaps of 10px between 3 items)
const TOTAL_PHOTOS = 6;
const MANDATORY_PHOTOS = 4;

const EditProfileScreen = ({ navigation }) => {
  const { userData, user } = useAuth();

  // Initialize form state with user data
  const [formData, setFormData] = useState({
    // IDENTITY
    displayName: userData?.displayName || "",
    gender: userData?.gender || "",
    preferences: userData?.preferences || "", // Who you're looking for
    budget: userData?.budget || "", // Relationship goals
    relationshipType: userData?.relationshipType || "",
    location: userData?.location || "",
    // VIRTUES
    occupation: userData?.occupation || "",
    interests: userData?.interests || [],
    education: userData?.education || "",
    schoolUniversity: userData?.schoolUniversity || "",
    bio: userData?.bio || "",
    // VITALS
    height: userData?.height?.toString() || "",
    weight: userData?.weight?.toString() || "",
    zodiac: userData?.zodiac || "",
    ethnicity: userData?.ethnicity || "",
    children: userData?.children || "",
    religion: userData?.religion || "",
    politics: userData?.politics || "",
    // VICES
    drinking: userData?.drinking || "Never",
    smoking: userData?.smoking || "Never",
    drugs: userData?.drugs || "Never",
    dealBreakers: userData?.dealBreakers || "",
  });

  // Initialize photos array with 6 slots
  const initializePhotos = () => {
    const existingPhotos = userData?.photos || [];
    const photosArray = Array(TOTAL_PHOTOS).fill(null);
    existingPhotos.slice(0, TOTAL_PHOTOS).forEach((photo, index) => {
      photosArray[index] = photo;
    });
    return photosArray;
  };

  const [photos, setPhotos] = useState(initializePhotos);
  const [uploading, setUploading] = useState(false);
  const [uploadingPosition, setUploadingPosition] = useState(null); // Track which photo is uploading
  const [previousPhotos, setPreviousPhotos] = useState({}); // Store previous photo URLs for error recovery
  const [activeTab, setActiveTab] = useState("edit"); // 'edit' or 'view'
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [selectedPhotoPosition, setSelectedPhotoPosition] = useState(null);
  const alertRef = useRef(null);
  const scrollRef = useRef(null);

  const handleAddPhoto = async (position) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled) {
        // Store previous photo if exists for error recovery
        const previousPhoto = photos[position];
        if (previousPhoto) {
          setPreviousPhotos((prev) => ({ ...prev, [position]: previousPhoto }));
        }

        // Set loading state for this specific position
        setUploadingPosition(position);
        setUploading(true);

        try {
          const url = await uploadImage(result.assets[0].uri);

          const newPhotos = [...photos];
          newPhotos[position] = url;

          setPhotos(newPhotos);
        } catch (uploadError) {
          // Revert to previous photo on error
          console.error("Photo upload error:", uploadError);
          const newPhotos = [...photos];
          if (previousPhoto) {
            newPhotos[position] = previousPhoto;
          } else {
            newPhotos[position] = null;
          }
          setPhotos(newPhotos);

          alertRef.current?.show({
            type: 'error',
            title: 'Upload Failed',
            message: `Failed to upload photo: ${uploadError.message || "Unknown error"}. Photo was not updated.`,
          });
          throw uploadError;
        } finally {
          setUploadingPosition(null);
          setUploading(false);
        }
      }
    } catch (error) {
      // Error already handled in inner try-catch
      setUploadingPosition(null);
      setUploading(false);
    }
  };

  const handleRemovePhoto = (position) => {
    // Show replacement modal
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
        // Store previous photo for error recovery
        const previousPhoto = photos[position];
        setPreviousPhotos((prev) => ({ ...prev, [position]: previousPhoto }));

        // Close modal first
        setShowReplaceModal(false);
        const tempPosition = selectedPhotoPosition;
        setSelectedPhotoPosition(null);

        // Set loading state for this specific position
        setUploadingPosition(tempPosition);
        setUploading(true);

        try {
          const url = await uploadImage(result.assets[0].uri);

          const newPhotos = [...photos];
          newPhotos[position] = url;

          setPhotos(newPhotos);
        } catch (uploadError) {
          // Revert to previous photo on error
          console.error("Photo upload error:", uploadError);
          const newPhotos = [...photos];
          if (previousPhoto) {
            newPhotos[position] = previousPhoto;
          } else {
            newPhotos[position] = null;
          }
          setPhotos(newPhotos);

          alertRef.current?.show({
            type: 'error',
            title: 'Upload Failed',
            message: `Failed to upload photo: ${uploadError.message || "Unknown error"}. Previous photo was restored.`,
          });
          throw uploadError;
        } finally {
          setUploadingPosition(null);
          setUploading(false);
        }
      }
    } catch (error) {
      // Error already handled in inner try-catch
      setUploadingPosition(null);
      setUploading(false);
    }
  };

  const handleCameraRoll = async () => {
    if (selectedPhotoPosition === null) return;
    await handleReplacePhoto(selectedPhotoPosition);
  };

  const handleReplace = async () => {
    if (selectedPhotoPosition === null) return;
    await handleReplacePhoto(selectedPhotoPosition);
  };

  const handleSetToMain = (position) => {
    if (position === 0) return; // Already main photo

    setPhotos((prevPhotos) => {
      const newPhotos = [...prevPhotos];
      const photoToMove = newPhotos[position];
      const currentMainPhoto = newPhotos[0];

      // Swap: Move selected photo to position 0, and current main to selected position
      newPhotos[0] = photoToMove;
      newPhotos[position] = currentMainPhoto;

      return newPhotos;
    });
  };

  const handleSave = async () => {
    try {
      setUploading(true);

      // Check mandatory photos
      const mandatoryPhotos = photos.slice(0, MANDATORY_PHOTOS);
      const missingMandatory = mandatoryPhotos.filter((p) => !p).length;

      if (missingMandatory > 0) {
        alertRef.current?.show({
          type: 'warning',
          title: 'Missing Photos',
          message: `Please add ${missingMandatory} mandatory photo(s) before saving.`,
        });
        return;
      }

      // Filter out null values
      const validPhotos = photos.filter((p) => p !== null);

      // Update user profile
      await updateUserDocument(user._id, {
        ...formData,
        height: formData.height ? parseInt(formData.height) : null,
        weight: formData.weight ? parseInt(formData.weight) : null,
        photos: validPhotos,
        mainPhotoIndex: 0, // Main photo is always at index 0
      });

      alertRef.current?.show({
        type: 'success',
        title: 'Success',
        message: 'Profile updated successfully!',
        onClose: () => {
          setActiveTab('view');
          // Scroll to top when switching to view tab
          setTimeout(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }, 100);
        },
      });
    } catch (error) {
      console.error("Save error:", error);
      alertRef.current?.show({
        type: 'error',
        title: 'Error',
        message: 'Failed to update profile',
      });
    } finally {
      setUploading(false);
    }
  };

  // Get current profile data for view mode
  const getCurrentProfileData = () => {
    return {
      ...userData,
      ...formData,
      photos: photos.filter((p) => p !== null),
      mainPhotoIndex: 0,
    };
  };

  const addInterest = () => {
    Alert.prompt("Add Interest", "Enter an interest", (text) => {
      if (text && text.trim()) {
        setFormData({
          ...formData,
          interests: [...formData.interests, text.trim()],
        });
      }
    });
  };

  const removeInterest = (index) => {
    const newInterests = formData.interests.filter((_, i) => i !== index);
    setFormData({ ...formData, interests: newInterests });
  };



  return (
    <View style={styles.container}>
      <ProfileHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBackPress={() => navigation.navigate("Profile")}
      />

      {activeTab === "edit" ? (
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <VerificationBanner
            isVerified={userData?.isVerified}
            onPress={() => navigation.navigate("VerifyAccount")}
          />

          {/* Photos Section */}
          <ProfileSection
            icon="images-outline"
            title="PHOTOS"
            description={`First photo is your main profile picture. Use "Set to Main" to change. ${MANDATORY_PHOTOS} photos required, up to ${TOTAL_PHOTOS} total.`}
          >
            <PhotoGrid
              photos={photos}
              photoSize={PHOTO_SIZE}
              mandatoryPhotos={MANDATORY_PHOTOS}
              uploadingPosition={uploadingPosition}
              uploading={uploading}
              onAddPhoto={handleAddPhoto}
              onRemovePhoto={handleRemovePhoto}
              onSetToMain={handleSetToMain}
            />
          </ProfileSection>

          {/* IDENTITY */}
          <ProfileSection icon="person-outline" title="IDENTITY">
            <ProfileTextInput
              label="Display Name"
              value={formData.displayName}
              onChangeText={(text) =>
                setFormData({ ...formData, displayName: text })
              }
              placeholder="Enter your name"
            />

            <ProfileTextInput
              label="Location"
              value={formData.location}
              onChangeText={(text) =>
                setFormData({ ...formData, location: text })
              }
              placeholder="Your location"
            />

            <ProfileOptionChips
              label="Gender"
              options={["Male", "Female", "Non-binary", "Prefer not to say"]}
              selectedValue={formData.gender}
              onSelect={(option) =>
                setFormData({ ...formData, gender: option })
              }
            />

            <ProfileOptionChips
              label="Who would you like to date?"
              options={["Men", "Women", "Everyone"]}
              selectedValue={formData.preferences}
              onSelect={(option) =>
                setFormData({ ...formData, preferences: option })
              }
            />

            <ProfileOptionChips
              label="Relationship Goals"
              options={[
                "Long-term relationship",
                "Short-term fun",
                "Casual dating",
                "Friendship",
                "Marriage",
                "Still figuring it out",
              ]}
              selectedValue={formData.budget}
              onSelect={(option) =>
                setFormData({ ...formData, budget: option })
              }
            />

            <ProfileOptionChips
              label="Relationship Type"
              options={["Monogamy", "Non-monogamy", "Figuring out"]}
              selectedValue={formData.relationshipType}
              onSelect={(option) =>
                setFormData({ ...formData, relationshipType: option })
              }
            />
          </ProfileSection>

          {/* VIRTUES */}
          <ProfileSection icon="star-outline" title="VIRTUES">
            <ProfileTextInput
              label="Occupation"
              value={formData.occupation}
              onChangeText={(text) =>
                setFormData({ ...formData, occupation: text })
              }
              placeholder="What do you do?"
            />

            <ProfileInterests
              interests={formData.interests}
              onAdd={addInterest}
              onRemove={removeInterest}
            />

            <ProfileOptionChips
              label="Education Level"
              options={[
                "High School",
                "Undergraduate",
                "Postgraduate",
                "PhD/Doctorate",
                "Trade/Vocational",
              ]}
              selectedValue={formData.education}
              onSelect={(option) =>
                setFormData({ ...formData, education: option })
              }
            />

            {formData.education &&
              formData.education !== "High School" &&
              formData.education !== "Trade/Vocational" && (
                <ProfileTextInput
                  label="School/University (Optional)"
                  value={formData.schoolUniversity}
                  onChangeText={(text) =>
                    setFormData({ ...formData, schoolUniversity: text })
                  }
                  placeholder="e.g. Harvard University, MIT"
                />
              )}

            <ProfileTextInput
              label="Bio"
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              placeholder="Tell us about yourself..."
              multiline
              numberOfLines={4}
            />
          </ProfileSection>

          {/* VITALS */}
          <ProfileSection icon="body-outline" title="VITALS">
            <TwoColumnRow>
              <View style={styles.columnItem}>
                <ProfileTextInput
                  label="Height (cm)"
                  value={formData.height}
                  onChangeText={(text) =>
                    setFormData({ ...formData, height: text })
                  }
                  placeholder="Height"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.columnItem}>
                <ProfileTextInput
                  label="Weight (kg)"
                  value={formData.weight}
                  onChangeText={(text) =>
                    setFormData({ ...formData, weight: text })
                  }
                  placeholder="Weight"
                  keyboardType="numeric"
                />
              </View>
            </TwoColumnRow>

            <ProfileOptionChips
              label="Zodiac Sign"
              options={[
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
              ]}
              selectedValue={formData.zodiac}
              onSelect={(option) =>
                setFormData({ ...formData, zodiac: option })
              }
            />

            <ProfileOptionChips
              label="Ethnicity"
              options={[
                "Black/African Descent",
                "East Asian",
                "Hispanic/Latino",
                "Middle Eastern",
                "Native American",
                "Pacific Islander",
                "South Asian",
                "White/Caucasian",
                "Other",
              ]}
              selectedValue={formData.ethnicity}
              onSelect={(option) =>
                setFormData({ ...formData, ethnicity: option })
              }
            />

            <ProfileOptionChips
              label="Children"
              options={[
                "Yes, living with me",
                "Yes, not living with me",
                "No",
                "Prefer not to say",
              ]}
              selectedValue={formData.children}
              onSelect={(option) =>
                setFormData({ ...formData, children: option })
              }
            />

            <ProfileOptionChips
              label="Religious Beliefs"
              options={[
                "Christianity",
                "Islam",
                "Judaism",
                "Hinduism",
                "Buddhism",
                "Spiritual",
                "Agnostic",
                "Atheist",
                "Other",
              ]}
              selectedValue={formData.religion}
              onSelect={(option) =>
                setFormData({ ...formData, religion: option })
              }
            />

            <ProfileOptionChips
              label="Political Beliefs"
              options={[
                "Liberal",
                "Moderate",
                "Conservative",
                "Apolitical",
                "Other",
              ]}
              selectedValue={formData.politics}
              onSelect={(option) =>
                setFormData({ ...formData, politics: option })
              }
            />
          </ProfileSection>

          {/* VICES */}
          <ProfileSection icon="warning-outline" title="VICES">
            <ProfileOptionChips
              label="Drinking"
              options={["Never", "Rarely", "Socially", "Regularly"]}
              selectedValue={formData.drinking}
              onSelect={(option) =>
                setFormData({ ...formData, drinking: option })
              }
            />

            <ProfileOptionChips
              label="Smoking"
              options={["Never", "Rarely", "Socially", "Regularly"]}
              selectedValue={formData.smoking}
              onSelect={(option) =>
                setFormData({ ...formData, smoking: option })
              }
            />

            <ProfileOptionChips
              label="Weed"
              options={["Never", "Occasionally", "Regularly"]}
              selectedValue={formData.drugs}
              onSelect={(option) => setFormData({ ...formData, drugs: option })}
            />

            <ProfileTextInput
              label="Deal-breakers (Optional)"
              value={formData.dealBreakers}
              onChangeText={(text) =>
                setFormData({ ...formData, dealBreakers: text })
              }
              placeholder="e.g. Smoking, dishonesty..."
              multiline
              numberOfLines={3}
            />
          </ProfileSection>

          {/* Save Button */}
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[
                styles.neuSaveButton,
                uploading && styles.neuSaveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.neuSaveButtonText}>SAVE CHANGES</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <ProfileContent profile={getCurrentProfileData()} />
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Replace Photo Bottom Sheet */}
      <ReplacePhotoBottomSheet
        visible={showReplaceModal}
        onClose={() => {
          setShowReplaceModal(false);
          setSelectedPhotoPosition(null);
        }}
        onReplace={handleReplace}
        onCameraRoll={handleCameraRoll}
        uploading={uploading}
      />

      {/* Custom Alert */}
      <CustomAlert ref={alertRef} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },
  verificationBanner: {
    backgroundColor: "#FFF9E6",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4AF37",
    overflow: "hidden",
  },
  verificationBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  verificationBannerTextContainer: {
    flex: 1,
  },
  verificationBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 4,
  },
  verificationBannerMessage: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 16,
  },
  headerContainer: {
    backgroundColor: "#FFFFFF",
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabActive: {
    // Active tab styling handled by indicator
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999999",
  },
  tabTextActive: {
    color: "#000000",
    fontWeight: "700",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#000000",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionDescription: {
    fontSize: 13,
    color: "#666666",
    marginBottom: 16,
    lineHeight: 18,
  },
  addButton: {
    padding: 4,
  },
  addInterestButton: {
    padding: 4,
    alignSelf: "flex-start",
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-start",
  },
  photoSlot: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D0D0D0",
    borderStyle: "dashed",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    // Neumorphic shadow - inset
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photoSlotTouchable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  mainPhotoSlot: {
    borderColor: "#000",
    borderWidth: 2,
  },
  photoContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    // Neumorphic shadow - raised
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  mainPhotoContainer: {
    borderWidth: 2,
    borderColor: "#000",
    alignItems: "center",
  },
  photo: {
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
  },
  mainPhotoBadge: {
    position: "absolute",
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  mainPhotoBadgeInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D4AF37",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: "center",
  },
  mainPhotoText: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "700",
  },
  removeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#000",
    borderRadius: 10,
  },
  setToMainButton: {
    position: "absolute",
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  setToMainButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D4AF37",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 3,
    alignSelf: "center",
  },
  setToMainText: {
    color: "#000000",
    fontSize: 9,
    fontWeight: "700",
  },
  emptyPhotoContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoText: {
    fontSize: 10,
    color: "#666666",
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center",
  },
  // Neumorphic Card Styles
  neuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    // Neumorphic raised effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    gap: 16,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  columnItem: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Neumorphic Input (Sunken)
  neuInputContainer: {
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    // Inset shadow for sunken effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 0,
  },
  neuInputContainerMultiline: {
    minHeight: 100,
  },
  neuInput: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "400",
    padding: 0,
  },
  neuInputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  // Neumorphic Option Chips
  neuOptionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    // Subtle raised shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  neuOptionChipActive: {
    backgroundColor: "#000000",
    borderColor: "#000000",
    shadowOpacity: 0.2,
  },
  neuOptionText: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },
  neuOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  // Neumorphic Interest Chips
  neuInterestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  neuInterestText: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "500",
  },
  saveButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 40,
  },
  neuSaveButton: {
    backgroundColor: "#D4AF37",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    // Strong shadow for depth
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  neuSaveButtonDisabled: {
    opacity: 0.5,
  },
  neuSaveButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  // View Mode Styles
  viewPhotoContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 20,
  },
  viewMainPhoto: {
    width: "100%",
    height: 450,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  viewProfileHeader: {
    marginBottom: 20,
  },
  viewName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 8,
  },
  viewLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewLocation: {
    fontSize: 14,
    color: "#666666",
  },
  viewCard: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  viewBioText: {
    fontSize: 15,
    color: "#333333",
    lineHeight: 24,
  },
  viewStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  viewStatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  viewStatText: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "500",
  },
  viewFieldWrapper: {
    marginBottom: 20,
  },
  viewFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  viewFieldValue: {
    fontSize: 16,
    color: "#333333",
    fontWeight: "400",
    lineHeight: 24,
  },
  viewPhotosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  viewPhotoWrapper: {
    position: "relative",
    width: "31%",
    aspectRatio: 1,
  },
  viewPhotoCard: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
  },
  viewMainBadge: {
    position: "absolute",
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  viewMainBadgeText: {
    backgroundColor: "#D4AF37",
    color: "#000000",
    fontSize: 9,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  viewTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
  },
  viewTag: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  viewTagText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "500",
  },
  viewLifestyleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
  },
  viewLifestyleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  viewLifestyleText: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "500",
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
  // Loading States
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
  loadingText: {
    color: "#666666",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "500",
  },
});

// Bottom Sheet Styles

export default EditProfileScreen;
