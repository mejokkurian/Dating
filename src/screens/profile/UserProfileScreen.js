import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../services/api/auth';
import { deleteUserAccount } from '../../services/api/user';

import DeleteAccountBottomSheet from '../settings/components/DeleteAccountBottomSheet';

const { width } = Dimensions.get('window');

const UserProfileScreen = ({ navigation }) => {
  const { userData, user, logout } = useAuth();
  const [showDeleteSheet, setShowDeleteSheet] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      logout(); // Update context state
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteUserAccount(user._id);
      setShowDeleteSheet(false);
      await handleLogout();
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert("Error", "Failed to delete account");
      setDeleting(false);
    }
  };

  const profileData = userData || {
    displayName: user?.email?.split('@')[0] || 'User',
    age: 0,
    photos: [],
    isVerified: false,
    isPremium: false,
  };
// ... (rest of the file remains similar until the return statement)

  // Helper function to render menu items...
  const renderMenuItem = (icon, title, subtitle, onPress, showChevron = true, isLast = false) => (
    <TouchableOpacity 
      style={[styles.menuItem, isLast && styles.menuItemLast]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon} size={20} color="#000" />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={20} color="#999" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.imageContainer}>
            <Image
              source={{ 
                uri: (() => {
                  const images = profileData.photos || profileData.images;
                  const singleImage = profileData.photoURL || profileData.profilePicture || profileData.image || profileData.avatar;
                  
                  let imageUrl;
                  if (Array.isArray(images) && images.length > 0) {
                    // Use main photo index if available
                    const mainIndex = profileData.mainPhotoIndex ?? 0;
                    imageUrl = images[mainIndex] || images[0];
                  } else if (typeof images === 'string' && images.length > 0) {
                    imageUrl = images;
                  } else if (singleImage && typeof singleImage === 'string') {
                    imageUrl = singleImage;
                  } else {
                    imageUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500';
                  }
                  
                  // console.log('Profile image URL:', imageUrl);
                  return imageUrl;
                })() 
              }}
              style={styles.profileImage}
              onError={(error) => console.log('Profile image load error:', error.nativeEvent.error)}
            />
            {profileData.isVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={20} color="#000" />
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profileData.displayName}, {profileData.age}</Text>
            <Text style={styles.location}>{profileData.location || 'New York, USA'}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>85%</Text>
                <Text style={styles.statLabel}>Complete</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profileData.photos?.length || 0}</Text>
                <Text style={styles.statLabel}>Photos</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={20} color="#FFF" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        {/* Premium Banner */}
        {!profileData.isPremium && (
          <TouchableOpacity style={styles.premiumBanner} onPress={() => navigation.navigate('Premium')}>
            <View style={styles.premiumContent}>
              <View style={styles.premiumIconCircle}>
                <Ionicons name="diamond" size={24} color="#000" />
              </View>
              <View>
                <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                <Text style={styles.premiumSubtitle}>Get unlimited swipes & more</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#000" />
          </TouchableOpacity>
        )}

        {/* Menu Sections */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionHeader}>Account</Text>
          {renderMenuItem('person-outline', 'Personal Information', null, () => {})}
          {renderMenuItem('settings-outline', 'Settings', 'Manage app preferences and security', () => navigation.navigate('Settings'), true, true)}
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionHeader}>Support</Text>
          {renderMenuItem('help-circle-outline', 'Help Center', null, () => {})}
          {renderMenuItem('document-text-outline', 'Terms of Service', null, () => {})}
          {renderMenuItem('lock-closed-outline', 'Privacy Policy', null, () => {}, true, true)}
        </View>

        <TouchableOpacity 
            style={styles.deleteAccountButton} 
            onPress={() => setShowDeleteSheet(true)}
        >
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Delete Account Confirmation Bottom Sheet */}
      <DeleteAccountBottomSheet
        visible={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </SafeAreaView>
  );
};
// ... styles ...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  scrollContent: {
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#DDD',
    marginHorizontal: 16,
  },
  editButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    marginHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: 'row',
    gap: 8,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  premiumBanner: {
    marginHorizontal: 24,
    backgroundColor: '#D4AF37',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  premiumTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  premiumSubtitle: {
    color: 'rgba(0,0,0,0.7)',
    fontSize: 12,
  },
  menuSection: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontWeight: '400',
  },
  deleteAccountButton: {
    marginHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteAccountText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default UserProfileScreen;
