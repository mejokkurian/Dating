import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import theme from '../theme/theme';
import { useAuth } from '../context/AuthContext';

const NearbyUserCard = ({ user, onPress, onSayHello, onViewProfile, onAccept, onDecline, onPendingRequestPress }) => {
  const { userData } = useAuth();
  const currentUserId = userData?._id || userData?.id;
  
  const displayName = user.displayName || user.name || 'Unknown User';
  const mainPhotoIndex = user.mainPhotoIndex ?? 0;
  const profileImage = user.image || (user.photos && user.photos.length > 0 
    ? (user.photos[mainPhotoIndex] || user.photos[0])
    : null) || null;
  const hasMatch = user.hasMatch || false;
  const matchStatus = user.matchStatus || null;
  const isActiveMatch = matchStatus === 'active';
  const isPendingMatch = matchStatus === 'pending';
  
  // Convert both IDs to strings for comparison to avoid type mismatch
  const userInitiatorId = user.initiatorId?.toString();
  const currentUserIdStr = currentUserId?.toString();

  const isIncomingRequest = isPendingMatch && userInitiatorId && userInitiatorId !== currentUserIdStr;
  const isOutgoingRequest = isPendingMatch && userInitiatorId && userInitiatorId === currentUserIdStr;
  console.log('isPendingMatch', isPendingMatch);
  console.log('userInitiatorId', userInitiatorId);
  console.log('currentUserIdStr', currentUserIdStr);
  const handleCardPress = () => {
    if (isOutgoingRequest && onPendingRequestPress) {
      onPendingRequestPress(user);
    } else if (onViewProfile) {
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
            <Image 
              key={profileImage} // Force re-render when image URL changes
              source={{ uri: profileImage }} 
              style={styles.profileImage} 
            />
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
          
          {user.distanceDisplay && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location" size={14} color={theme.colors.primary} />
              <Text style={styles.distance}>{user.distanceDisplay} away</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {isIncomingRequest ? (
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={[styles.actionIconButton, styles.declineButton]}
                onPress={() => onDecline && onDecline(user)}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionIconButton, styles.acceptButton]}
                onPress={() => onAccept && onAccept(user)}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : isOutgoingRequest ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending...</Text>
            </View>
          ) : (
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
          )}
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
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#FF5252',
  },
  pendingBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  pendingText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
});

export default NearbyUserCard;

