import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import theme from "../theme/theme";
import { getInterestIcon } from "../constants/interestIcons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ProfileContent = ({ profile }) => {
  if (!profile) return null;

  // Organize photos: primary first, then others
  const organizePhotos = () => {
    if (!profile.photos || profile.photos.length === 0) {
      return [];
    }
    const mainIndex = profile.mainPhotoIndex ?? 0;
    const primaryPhoto = profile.photos[mainIndex] || profile.photos[0];
    const otherPhotos = profile.photos.filter(
      (_, index) => index !== mainIndex
    );
    return [primaryPhoto, ...otherPhotos];
  };

  const organizedPhotos = organizePhotos();

  // Render full-width embedded photo
  const renderFullWidthPhoto = (photoUri, index) => (
    <View key={`photo-${index}`} style={styles.embeddedPhotoContainer}>
      <Image
        source={{ uri: photoUri || "https://via.placeholder.com/400x600" }}
        style={styles.embeddedPhoto}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Primary Photo */}
      {organizedPhotos.length > 0 &&
        renderFullWidthPhoto(organizedPhotos[0], 0)}

      {/* Profile Info */}
      <View style={styles.content}>
        {/* 1. Name, Age, Location */}
        <View style={styles.headerSection}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>
              {profile.displayName || profile.name || 'Unknown'}
            </Text>
            {profile.age && (
              <Text style={styles.ageText}>, {profile.age}</Text>
            )}
            {profile.isVerified && (
              <MaterialCommunityIcons 
                name="check-decagram" 
                size={24} 
                color="#4CAF50" 
                style={styles.verifiedBadge}
              />
            )}
          </View>
          {profile.location && (
            <View style={styles.locationRow}>
              <Ionicons 
                name="location-outline" 
                size={16} 
                color={theme.colors.text.secondary}
              />
              <Text style={styles.locationText}>{profile.location}</Text>
            </View>
          )}
        </View>

        {/* 2. About Me */}
        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <Text style={styles.bioTextPlain}>
              {profile.bio}
            </Text>
          </View>
        )}

        {/* 3. Looking For */}
        {(profile.budget || profile.relationshipType || profile.preferences) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Looking For</Text>
            <View style={styles.statsGridContainer}>
              {profile.budget && (
                <View style={styles.statRow}>
                  <Ionicons name="heart-outline" size={16} color={theme.colors.text.secondary} style={styles.statIcon} />
                  <Text style={styles.bioTextPlain}>{profile.budget}</Text>
                </View>
              )}
              {profile.relationshipType && (
                <View style={styles.statRow}>
                  <Ionicons name="people-circle-outline" size={16} color={theme.colors.text.secondary} style={styles.statIcon} />
                  <Text style={styles.bioTextPlain}>{profile.relationshipType}</Text>
                </View>
              )}
              {profile.preferences && (
                <View style={styles.statRow}>
                  <Ionicons name="male-female" size={16} color={theme.colors.text.secondary} style={styles.statIcon} />
                  <Text style={styles.bioTextPlain}>Interested in {profile.preferences}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 4. Photo 2 */}
        {organizedPhotos.length > 1 &&
          renderFullWidthPhoto(organizedPhotos[1], 1)}

        {/* 5. Essentials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Essentials</Text>
          <View style={styles.statsGridContainer}>
            {profile.height && (
              <View style={styles.statRow}>
                <MaterialCommunityIcons name="ruler" size={18} color={theme.colors.text.secondary} style={styles.statIcon} />
                <Text style={styles.bioTextPlain}>{profile.height} cm</Text>
              </View>
            )}
            {profile.weight && (
              <View style={styles.statRow}>
                <FontAwesome5 name="weight" size={16} color={theme.colors.text.secondary} style={styles.statIcon} />
                <Text style={styles.bioTextPlain}>{profile.weight} kg</Text>
              </View>
            )}
            {profile.occupation && (
              <View style={styles.statRow}>
                <MaterialCommunityIcons name="briefcase-outline" size={18} color={theme.colors.text.secondary} style={styles.statIcon} />
                <Text style={styles.bioTextPlain}>{profile.occupation}</Text>
              </View>
            )}
            {profile.education && (
              <View style={styles.statRow}>
                <MaterialCommunityIcons name="school-outline" size={18} color={theme.colors.text.secondary} style={styles.statIcon} />
                <Text style={styles.bioTextPlain}>{profile.education}</Text>
              </View>
            )}
            {profile.schoolUniversity && (
              <View style={styles.statRow}>
                <FontAwesome5 name="university" size={14} color={theme.colors.text.secondary} style={styles.statIcon} />
                <Text style={styles.bioTextPlain}>{profile.schoolUniversity}</Text>
              </View>
            )}
            {profile.zodiac && (
              <View style={styles.statRow}>
                <Ionicons name="sparkles" size={16} color={theme.colors.text.secondary} style={styles.statIcon} />
                <Text style={styles.bioTextPlain}>{profile.zodiac}</Text>
              </View>
            )}
            {profile.ethnicity && (
              <View style={styles.statRow}>
                <Ionicons name="people" size={16} color={theme.colors.text.secondary} style={styles.statIcon} />
                <Text style={styles.bioTextPlain}>{profile.ethnicity}</Text>
              </View>
            )}
            {profile.children && (
              <View style={styles.statRow}>
                <Ionicons name="person" size={16} color={theme.colors.text.secondary} style={styles.statIcon} />
                <Text style={styles.bioTextPlain}>{profile.children}</Text>
              </View>
            )}
            {profile.religion && (
              <View style={styles.statRow}>
                <Ionicons name="book" size={16} color={theme.colors.text.secondary} style={styles.statIcon} />
                <Text style={styles.bioTextPlain}>{profile.religion}</Text>
              </View>
            )}
            {profile.politics && (
              <View style={styles.statRow}>
                <FontAwesome5 name="landmark" size={14} color={theme.colors.text.secondary} style={styles.statIcon} />
                <Text style={styles.bioTextPlain}>{profile.politics}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 6. Photo 3 */}
        {organizedPhotos.length > 2 &&
          renderFullWidthPhoto(organizedPhotos[2], 2)}

        {/* 7. Lifestyle */}
        {(profile.drinking || profile.smoking || profile.drugs) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lifestyle</Text>
            <View style={styles.statsGridContainer}>
              {profile.drinking && (
                <View style={styles.statRow}>
                  <MaterialCommunityIcons name="glass-wine" size={18} color={theme.colors.text.secondary} style={styles.statIcon} />
                  <Text style={styles.bioTextPlain}>{profile.drinking}</Text>
                </View>
              )}
              {profile.smoking && (
                <View style={styles.statRow}>
                  <MaterialCommunityIcons name="smoking" size={18} color={theme.colors.text.secondary} style={styles.statIcon} />
                  <Text style={styles.bioTextPlain}>{profile.smoking}</Text>
                </View>
              )}
              {profile.drugs && (
                <View style={styles.statRow}>
                  <MaterialCommunityIcons name="leaf" size={18} color={theme.colors.text.secondary} style={styles.statIcon} />
                  <Text style={styles.bioTextPlain}>{profile.drugs}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 8. Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsContainer}>
              {profile.interests.map((interest, index) => {
                let iconConfig = { name: "ellipse", library: "Ionicons" };
                try {
                  if (getInterestIcon) {
                    iconConfig = getInterestIcon(interest);
                  }
                } catch (e) {
                  // fallback
                }
                
                const IconComponent = iconConfig.library === "FontAwesome5" ? FontAwesome5 : Ionicons;
                
                return (
                  <View key={index} style={styles.interestItemWithIcon}>
                    <IconComponent
                      name={iconConfig.name}
                      size={16}
                      color={theme.colors.text.secondary}
                      style={styles.interestIcon}
                    />
                    <Text style={styles.bioTextPlain}>{interest}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 9. Remaining Photos (4+) */}
        {organizedPhotos
          .slice(3)
          .map((photo, index) => renderFullWidthPhoto(photo, index + 3))}

        {/* 10. Deal-breakers */}
        {profile.dealBreakers && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deal-breakers</Text>
            <Text style={styles.bioTextPlain}>
              {profile.dealBreakers}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  embeddedPhotoContainer: {
    width: "100%",
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  embeddedPhoto: {
    width: "100%",
    height: 480,
    resizeMode: "cover",
    backgroundColor: "#f0f0f0",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerSection: {
    marginBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameText: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text.primary,
    letterSpacing: -0.5,
  },
  ageText: {
    fontSize: 32,
    fontWeight: '400',
    color: theme.colors.text.secondary,
    letterSpacing: -0.5,
  },
  verifiedBadge: {
    marginLeft: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text.primary,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  bioTextPlain: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 26,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  lookingForContainer: {
    gap: 12,
  },
  statsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: 10,
  },
  statIcon: {
    width: 20,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestItemWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: 10,
  },
  interestIcon: {
    width: 20,
  },
});

export default ProfileContent;
