import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, SafeAreaView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../services/api/auth';

const { width } = Dimensions.get('window');

const UserProfileScreen = ({ navigation }) => {
  const { userData, user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      logout(); // Update context state
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const profileData = userData || {
    displayName: user?.email?.split('@')[0] || 'User',
    age: 0,
    photos: [],
    isVerified: false,
    isPremium: false,
  };

  const renderMenuItem = (icon, title, subtitle, onPress, showChevron = true) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon} size={20} color="#000" />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={20} color="#CCC" />}
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
                  if (Array.isArray(images) && images.length > 0) imageUrl = images[0];
                  else if (typeof images === 'string' && images.length > 0) imageUrl = images;
                  else if (singleImage && typeof singleImage === 'string') imageUrl = singleImage;
                  else imageUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500';
                  
                  console.log('Profile image URL:', imageUrl);
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
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        {/* Premium Banner */}
        {!profileData.isPremium && (
          <TouchableOpacity style={styles.premiumBanner} onPress={() => navigation.navigate('Premium')}>
            <View style={styles.premiumContent}>
              <View style={styles.premiumIconCircle}>
                <Ionicons name="diamond" size={24} color="#FFF" />
              </View>
              <View>
                <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                <Text style={styles.premiumSubtitle}>Get unlimited swipes & more</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* Menu Sections */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionHeader}>Account</Text>
          {renderMenuItem('person-outline', 'Personal Information', null, () => {})}
          {renderMenuItem('shield-checkmark-outline', 'Security', null, () => {})}
          {renderMenuItem('notifications-outline', 'Notifications', null, () => {})}
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionHeader}>Support</Text>
          {renderMenuItem('help-circle-outline', 'Help Center', null, () => {})}
          {renderMenuItem('document-text-outline', 'Terms of Service', null, () => {})}
          {renderMenuItem('lock-closed-outline', 'Privacy Policy', null, () => {})}
        </View>

        <TouchableOpacity style={styles.deleteAccountButton}>
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#F5F5F5',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 2,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  location: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
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
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#DDD',
    marginHorizontal: 16,
  },
  editButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    marginHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  premiumBanner: {
    marginHorizontal: 24,
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  premiumTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  premiumSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  menuSection: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deleteAccountButton: {
    marginHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteAccountText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default UserProfileScreen;
