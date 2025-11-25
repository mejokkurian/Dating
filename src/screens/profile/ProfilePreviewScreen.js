import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import GlassCard from '../../components/GlassCard';
import theme from '../../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ProfilePreviewScreen = ({ navigation, route }) => {
  const { profileData } = route.params || {};

  if (!profileData) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Preview</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Photo Gallery */}
        <View style={styles.photoGalleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.photoGallery}
            contentContainerStyle={styles.photoGalleryContent}
          >
            {(profileData.photos && profileData.photos.length > 0 
              ? profileData.photos 
              : ['https://via.placeholder.com/400x600']
            ).map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image
                  source={{ uri: photo }}
                  style={styles.photo}
                />
              </View>
            ))}
          </ScrollView>
          
          {/* Photo Indicators */}
          {profileData.photos && profileData.photos.length > 1 && (
            <View style={styles.photoIndicators}>
              {profileData.photos.map((_, index) => (
                <View key={index} style={[styles.indicator, index === 0 && styles.activeIndicator]} />
              ))}
            </View>
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.content}>
          <View style={styles.profileHeader}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {profileData.displayName}, {profileData.age || 0}
              </Text>
              <View style={styles.badgesRow}>
                {profileData.isVerified && (
                  <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
                    <MaterialCommunityIcons name="check-decagram" size={14} color="#fff" />
                    <Text style={styles.badgeText}>Verified</Text>
                  </View>
                )}
                {profileData.isPremium && (
                  <View style={[styles.badge, { backgroundColor: '#FFD700' }]}>
                    <MaterialCommunityIcons name="crown" size={14} color="#000" />
                    <Text style={[styles.badgeText, { color: '#000' }]}>Premium</Text>
                  </View>
                )}
              </View>
            </View>
            
            {profileData.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color={theme.colors.text.secondary} />
                <Text style={styles.location}>{profileData.location}</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {profileData.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <GlassCard style={styles.card} opacity={0.1}>
                <Text style={styles.bioText}>{profileData.bio}</Text>
              </GlassCard>
            </View>
          )}

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            {profileData.occupation && (
              <GlassCard style={styles.statCard} opacity={0.1}>
                <FontAwesome5 name="briefcase" size={16} color={theme.colors.text.secondary} />
                <Text style={styles.statText}>{profileData.occupation}</Text>
              </GlassCard>
            )}
            {profileData.height && (
              <GlassCard style={styles.statCard} opacity={0.1}>
                <FontAwesome5 name="ruler-vertical" size={16} color={theme.colors.text.secondary} />
                <Text style={styles.statText}>{profileData.height} cm</Text>
              </GlassCard>
            )}
            {profileData.education && (
              <GlassCard style={styles.statCard} opacity={0.1}>
                <FontAwesome5 name="graduation-cap" size={16} color={theme.colors.text.secondary} />
                <Text style={styles.statText}>{profileData.education}</Text>
              </GlassCard>
            )}
          </View>

          {/* Interests */}
          {profileData.interests && profileData.interests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.tagsContainer}>
                {profileData.interests.map((interest, index) => (
                  <GlassCard key={index} style={styles.tag} opacity={0.1}>
                    <Text style={styles.tagText}>{interest}</Text>
                  </GlassCard>
                ))}
              </View>
            </View>
          )}

          {/* Lifestyle */}
          {(profileData.drinking || profileData.smoking || profileData.drugs) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lifestyle</Text>
              <View style={styles.lifestyleGrid}>
                {profileData.drinking && (
                  <GlassCard style={styles.lifestyleItem} opacity={0.1}>
                    <FontAwesome5 name="wine-glass-alt" size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.lifestyleText}>Drinks: {profileData.drinking}</Text>
                  </GlassCard>
                )}
                {profileData.smoking && (
                  <GlassCard style={styles.lifestyleItem} opacity={0.1}>
                    <FontAwesome5 name="smoking" size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.lifestyleText}>Smokes: {profileData.smoking}</Text>
                  </GlassCard>
                )}
                {profileData.drugs && (
                  <GlassCard style={styles.lifestyleItem} opacity={0.1}>
                    <FontAwesome5 name="cannabis" size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.lifestyleText}>Weed: {profileData.drugs}</Text>
                  </GlassCard>
                )}
              </View>
            </View>
          )}

          {/* Looking For */}
          {profileData.relationshipExpectations && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Looking For</Text>
              <GlassCard style={styles.card} opacity={0.1}>
                <Text style={styles.bioText}>{profileData.relationshipExpectations}</Text>
              </GlassCard>
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glass.border,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  photoGalleryContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 20,
  },
  photoGallery: {
    height: 450,
  },
  photoGalleryContent: {
    gap: 12,
  },
  photoWrapper: {
    width: SCREEN_WIDTH - 40,
    height: 450,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    ...theme.shadows.lg,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.text.tertiary,
    opacity: 0.3,
  },
  activeIndicator: {
    backgroundColor: theme.colors.primary,
    opacity: 1,
    width: 20,
  },
  content: {
    padding: 20,
  },
  profileHeader: {
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  card: {
    padding: 16,
  },
  bioText: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statText: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    color: theme.colors.text.primary,
    fontSize: 14,
  },
  lifestyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  lifestyleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '45%',
  },
  lifestyleText: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
});

export default ProfilePreviewScreen;
