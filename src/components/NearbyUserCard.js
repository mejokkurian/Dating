import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/theme';

const NearbyUserCard = ({ user, onPress, onSayHello, onViewProfile }) => {
  const displayName = user.displayName || user.name || 'Unknown User';
  const mainPhotoIndex = user.mainPhotoIndex ?? 0;
  const profileImage = user.image || (user.photos && user.photos.length > 0 
    ? (user.photos[mainPhotoIndex] || user.photos[0])
    : null) || null;
  const hasMatch = user.hasMatch || false;
  const matchStatus = user.matchStatus || null;
  const isActiveMatch = matchStatus === 'active';

  const handleCardPress = () => {
    if (onViewProfile) {
      onViewProfile(user);
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Profile Image */}
        <View style={styles.imageContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.placeholderImage]}>
              <Ionicons name="person" size={30} color="#ccc" />
            </View>
          )}
          {user.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            </View>
          )}
          {hasMatch && (
            <View style={styles.matchedBadge}>
              <Ionicons name="heart" size={12} color="#fff" />
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {user.age && (
            <Text style={styles.age}>, {user.age}</Text>
          )}
          {user.distanceDisplay && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location" size={14} color={theme.colors.primary} />
              <Text style={styles.distance}>{user.distanceDisplay} away</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.sayHelloButton,
              isActiveMatch && styles.sayHelloButtonMatched
            ]}
            onPress={() => {
              if (onSayHello) {
                onSayHello(user);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isActiveMatch ? "chatbubble" : "chatbubble-ellipses"} 
              size={18} 
              color="#fff" 
            />
            <Text style={styles.sayHelloText}>
              {isActiveMatch ? 'Open Chat' : 'Say Hello'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
  },
  matchedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    padding: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  age: {
    fontSize: 16,
    color: '#666',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  distance: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: '400',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sayHelloButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sayHelloButtonMatched: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
  },
  sayHelloText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NearbyUserCard;

