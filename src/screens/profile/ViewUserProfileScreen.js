import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserById } from '../../services/api/user';
import GlassCard from '../../components/GlassCard';
import theme from '../../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ViewUserProfileScreen = ({ navigation, route }) => {
  const { userId, user: initialUser } = route.params || {};
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(!initialUser);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!initialUser && userId) {
        try {
          setLoading(true);
          const userData = await getUserById(userId);
          setUser(userData);
        } catch (error) {
          console.error('Error loading user profile:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadUserProfile();
  }, [userId, initialUser]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{user.name || user.displayName || 'Profile'}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ 
              uri: user.image || (user.photos && user.photos.length > 0 
                ? (user.photos[user.mainPhotoIndex ?? 0] || user.photos[0])
                : null)
            }}
            style={styles.profileImage}
            resizeMode="cover"
          />
          {user.isVerified && (
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-decagram" size={24} color="#4CAF50" />
            </View>
          )}
        </View>

        {/* Basic Info */}
        <GlassCard style={styles.card}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.name || user.displayName}</Text>
            {user.age && <Text style={styles.age}>, {user.age}</Text>}
          </View>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
          {user.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.location}>{user.location}</Text>
            </View>
          )}
        </GlassCard>

        {/* Photos */}
        {user.photos && user.photos.length > 0 && (
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
              {user.photos.map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.photo} />
              ))}
            </ScrollView>
          </GlassCard>
        )}

        {/* Details */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Details</Text>
          {user.occupation && (
            <View style={styles.detailRow}>
              <Ionicons name="briefcase" size={20} color={theme.colors.primary} />
              <Text style={styles.detailText}>{user.occupation}</Text>
            </View>
          )}
          {user.education && (
            <View style={styles.detailRow}>
              <Ionicons name="school" size={20} color={theme.colors.primary} />
              <Text style={styles.detailText}>{user.education}</Text>
            </View>
          )}
          {user.height && (
            <View style={styles.detailRow}>
              <Ionicons name="resize" size={20} color={theme.colors.primary} />
              <Text style={styles.detailText}>{user.height}</Text>
            </View>
          )}
        </GlassCard>

        {/* Interests */}
        {user.interests && user.interests.length > 0 && (
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsContainer}>
              {user.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
  },
  card: {
    margin: 16,
    marginTop: 0,
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  age: {
    fontSize: 24,
    color: '#666',
  },
  bio: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  photosContainer: {
    marginTop: 8,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  interestTag: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
});

export default ViewUserProfileScreen;

