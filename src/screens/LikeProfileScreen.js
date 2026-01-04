import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../services/api/config';

const { width, height } = Dimensions.get('window');

const LikeProfileScreen = ({ route, navigation }) => {
  const { user, matchId } = route.params;
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const photos = user.photos || [];
  const hasPhotos = photos.length > 0;

  const handleMatch = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/matches/${matchId}/respond`, {
        action: 'accept',
      });

      Alert.alert(
        "It's a Match! 💕",
        `You and ${user.name || user.displayName} liked each other!`,
        [
          {
            text: 'Send Message',
            onPress: () => {
              navigation.navigate('Messages');
            },
          },
          {
            text: 'Keep Browsing',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Match error:', error);
      Alert.alert('Error', 'Failed to create match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePass = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/matches/${matchId}/respond`, {
        action: 'decline',
      });

      navigation.goBack();
    } catch (error) {
      console.error('Pass error:', error);
      Alert.alert('Error', 'Failed to decline. Please try again.');
      setLoading(false);
    }
  };

  const nextPhoto = () => {
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const previousPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photo Carousel */}
        <View style={styles.photoContainer}>
          {hasPhotos ? (
            <>
              <Image
                source={{ uri: photos[currentPhotoIndex] }}
                style={styles.photo}
                resizeMode="cover"
              />
              
              {/* Photo Navigation */}
              {photos.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.photoNav, styles.photoNavLeft]}
                    onPress={previousPhoto}
                    disabled={currentPhotoIndex === 0}
                  >
                    {currentPhotoIndex > 0 && (
                      <Ionicons name="chevron-back" size={32} color="#FFF" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoNav, styles.photoNavRight]}
                    onPress={nextPhoto}
                    disabled={currentPhotoIndex === photos.length - 1}
                  >
                    {currentPhotoIndex < photos.length - 1 && (
                      <Ionicons name="chevron-forward" size={32} color="#FFF" />
                    )}
                  </TouchableOpacity>

                  {/* Photo Indicators */}
                  <View style={styles.photoIndicators}>
                    {photos.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.indicator,
                          index === currentPhotoIndex && styles.indicatorActive,
                        ]}
                      />
                    ))}
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={[styles.photo, styles.noPhoto]}>
              <Ionicons name="person" size={80} color="#CCC" />
            </View>
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {user.name || user.displayName}
              {user.age && <Text style={styles.age}>, {user.age}</Text>}
            </Text>
            {user.isVerified && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </View>

          {user.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.location}>{user.location}</Text>
            </View>
          )}

          {user.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{user.bio}</Text>
            </View>
          )}

          {user.interests && user.interests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.interestsContainer}>
                {user.interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {user.occupation && (
            <View style={styles.infoRow}>
              <Ionicons name="briefcase" size={20} color="#666" />
              <Text style={styles.infoText}>{user.occupation}</Text>
            </View>
          )}

          {user.education && (
            <View style={styles.infoRow}>
              <Ionicons name="school" size={20} color="#666" />
              <Text style={styles.infoText}>{user.education}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={handlePass}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FF4458" />
          ) : (
            <>
              <Ionicons name="close" size={32} color="#FF4458" />
              <Text style={[styles.actionText, styles.passText]}>Pass</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.matchButton]}
          onPress={handleMatch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="heart" size={32} color="#FFF" />
              <Text style={[styles.actionText, styles.matchText]}>Match</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
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
  photoContainer: {
    width: width,
    height: height * 0.5,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  noPhoto: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNav: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -25 }],
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNavLeft: {
    left: 10,
  },
  photoNavRight: {
    right: 10,
  },
  photoIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  indicatorActive: {
    backgroundColor: '#FFF',
    width: 20,
  },
  infoContainer: {
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
  },
  age: {
    fontSize: 28,
    fontWeight: '400',
    color: '#666',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  location: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 30,
  },
  passButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FF4458',
  },
  matchButton: {
    backgroundColor: '#E91E63',
  },
  actionText: {
    fontSize: 18,
    fontWeight: '700',
  },
  passText: {
    color: '#FF4458',
  },
  matchText: {
    color: '#FFF',
  },
});

export default LikeProfileScreen;
