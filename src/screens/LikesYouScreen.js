import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getMyMatches } from '../services/api/match';
import { useAuth } from '../context/AuthContext';
import { useBadge } from '../context/BadgeContext';

const LikesYouScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { updateBadgeCounts } = useBadge();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
      updateBadgeCounts(); // Update badge counts when screen comes into focus
    }, [updateBadgeCounts])
  );

  const loadMatches = async () => {
    try {
      if (matches.length === 0) setLoading(true);
      const data = await getMyMatches();
      // Filter only likes you (pending matches where you're not the initiator)
      const likesYou = data.filter(match => match.status === 'pending' && !match.isInitiator);
      setMatches(likesYou);
    } catch (error) {
      console.error('Load matches error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMatches();
    updateBadgeCounts(); // Update badge counts on refresh
    setRefreshing(false);
  };

  const handleMatchPress = (match) => {
    // Navigate to Discover screen to swipe on them
    navigation.navigate('Discover', { 
      pendingProfile: match.user
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return messageDate.toLocaleDateString();
  };

  const renderMatchItem = ({ item: match }) => (
    <TouchableOpacity 
      style={styles.matchItem} 
      onPress={() => handleMatchPress(match)}
    >
      <Image 
        source={{ 
          uri: match.user.image || (match.user.photos && match.user.photos.length > 0
            ? (match.user.photos[match.user.mainPhotoIndex ?? 0] || match.user.photos[0])
            : null) || 'https://via.placeholder.com/60'
        }} 
        style={styles.matchAvatar} 
      />
      <View style={styles.matchContent}>
        <View style={styles.matchHeader}>
          <Text style={styles.matchName}>{match.user.name || match.user.displayName}</Text>
          <Text style={styles.matchTime}>
            {formatTime(match.lastMessageAt || match.createdAt)}
          </Text>
        </View>
        <View style={styles.likesYouContainer}>
          <Ionicons name="heart" size={14} color="#E91E63" />
          <Text style={styles.likesYouText}>Liked you! Swipe right to match</Text>
        </View>
      </View>
      <View style={styles.heartBadge}>
        <Ionicons name="heart" size={20} color="#E91E63" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Likes You</Text>
      </View>

      {matches.length === 0 ? (
        <ScrollView 
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Ionicons name="heart-outline" size={80} color="#CCC" />
          <Text style={styles.emptyTitle}>No Likes Yet</Text>
          <Text style={styles.emptyText}>
            Keep swiping to get more likes!
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => item.matchId || item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    paddingBottom: 32,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9',
  },
  matchAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  matchContent: {
    flex: 1,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  matchTime: {
    fontSize: 12,
    color: '#999999',
  },
  likesYouContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likesYouText: {
    fontSize: 13,
    color: '#E91E63',
    fontStyle: 'italic',
  },
  heartBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCE4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default LikesYouScreen;

