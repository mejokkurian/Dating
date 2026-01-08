import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserById } from '../../services/api/user';
import theme from '../../theme/theme';
import ProfileContent from '../../components/ProfileContent';

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
        <ProfileContent profile={user} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    zIndex: 10,
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

