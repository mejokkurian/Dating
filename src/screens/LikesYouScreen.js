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
  const [activeTab, setActiveTab] = useState('likes'); // 'likes' or 'waiting'

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
      // Keep all pending matches
      const pendingMatches = data.filter(match => match.status === 'pending');
      setMatches(pendingMatches);
    } catch (error) {
      console.error('Load matches error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMatches();
    updateBadgeCounts();
    setRefreshing(false);
  };

  const handleMatchPress = (match) => {
    if (activeTab === 'likes') {
      if (match.isSuperLike) {
        // Super Like -> Chat screen (Accept/Decline flow)
        navigation.navigate('Chat', { 
          user: match.user,
          matchStatus: match.status,
          isInitiator: match.isInitiator,
          isSuperLike: match.isSuperLike,
          matchId: match.matchId || match._id,
          superLikeMessage: match.lastMessage?.content
        });
      } else {
        // Normal Like -> View Profile (LikeProfileScreen)
        navigation.navigate('LikeProfileScreen', { 
            user: match.user,
            matchId: match.matchId || match._id // Pass matchId needed for accept/decline actions
        });
      }
    } else {
        // For waiting tab
        navigation.navigate('LikeProfileScreen', { user: match.user });
    }
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

  // Filter matches based on active tab
  const displayedMatches = matches.filter(match => {
    if (activeTab === 'likes') {
        // Likes You: pending AND !isInitiator
        return !match.isInitiator;
    } else {
        // Waiting: pending AND isInitiator
        return match.isInitiator;
    }
  });

  const renderMatchItem = ({ item: match }) => {
    // Debug log for Super Like message
    if (match.isSuperLike) {
      console.log('Rendering Super Like Match:', JSON.stringify(match, null, 2));
    }
    return (
    <TouchableOpacity 
      style={[styles.matchItem, match.isSuperLike && styles.superLikeItem]} 
      onPress={() => handleMatchPress(match)}
    >
      <View style={styles.avatarContainer}>
          <Image 
            source={{ 
              uri: match.user.image || (match.user.photos && match.user.photos.length > 0
                ? (match.user.photos[match.user.mainPhotoIndex ?? 0] || match.user.photos[0])
                : null) || 'https://via.placeholder.com/60'
            }} 
            style={[styles.matchAvatar, match.isSuperLike && styles.superLikeAvatar]} 
          />
          {match.isSuperLike && (
              <View style={styles.superLikeStarBadge}>
                  <Ionicons name="star" size={12} color="#FFF" />
              </View>
          )}
      </View>
      <View style={styles.matchContent}>
        <View style={styles.matchHeader}>
          <Text style={styles.matchName}>{match.user.name || match.user.displayName}</Text>
          <Text style={styles.matchTime}>
            {formatTime(match.lastMessageAt || match.createdAt)}
          </Text>
        </View>
        <View style={styles.likesYouContainer}>
            {activeTab === 'likes' ? (
                <>
                    <Ionicons name={match.isSuperLike ? "star" : "heart"} size={14} color="#D4AF37" />
                    <Text style={styles.likesYouText}>
                        {match.isSuperLike ? 'Super Liked you!' : 'Liked you'}
                    </Text>
                </>
            ) : (
                <>
                    <Ionicons name="time-outline" size={14} color="#999" />
                    <Text style={styles.waitingText}>Waiting for response...</Text>
                </>
            )}
        </View>
        {match.lastMessage && (
            <Text style={styles.messagePreview} numberOfLines={1}>
                {match.lastMessage.content}
            </Text>
        )}
      </View>
      {activeTab === 'likes' && (
        <View style={[styles.heartBadge, match.isSuperLike && styles.superLikeBadge]}>
            <Ionicons name={match.isSuperLike ? "star" : "heart"} size={18} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'likes' && styles.tabActive]}
          onPress={() => setActiveTab('likes')}
        >
            <View style={styles.tabContent}>
                <Text style={[styles.tabText, activeTab === 'likes' && styles.tabTextActive]}>
                    Likes You
                </Text>
                {matches.filter(m => !m.isInitiator).length > 0 && (
                    <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>
                            {matches.filter(m => !m.isInitiator).length}
                        </Text>
                    </View>
                )}
            </View>
            {activeTab === 'likes' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'waiting' && styles.tabActive]}
          onPress={() => setActiveTab('waiting')}
        >
             <View style={styles.tabContent}>
                <Text style={[styles.tabText, activeTab === 'waiting' && styles.tabTextActive]}>
                    Waiting
                </Text>
                {matches.filter(m => m.isInitiator).length > 0 && (
                    <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>
                            {matches.filter(m => m.isInitiator).length}
                        </Text>
                    </View>
                )}
            </View>
            {activeTab === 'waiting' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {displayedMatches.length === 0 ? (
        <ScrollView 
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
           <Ionicons 
            name={activeTab === 'likes' ? "heart-outline" : "hourglass-outline"} 
            size={80} 
            color="#D4AF37" 
          />
          <Text style={styles.emptyTitle}>
            {activeTab === 'likes' ? 'No Likes Yet' : 'No Pending Requests'}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'likes' 
                ? 'Keep swiping to get more likes!' 
                : 'You haven\'t liked anyone yet. Start swiping!'}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={displayedMatches}
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
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabActive: {
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999999',
  },
  tabTextActive: {
    color: '#D4AF37',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#D4AF37',
  },
  tabBadge: {
    backgroundColor: '#D4AF37',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
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
    color: '#757575',
    fontWeight: '500',
  },
  waitingText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  heartBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D4AF37', // Gold
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  superLikeItem: {
      backgroundColor: '#FFF9E6', // Light gold bg
  },
  avatarContainer: {
      position: 'relative',
      marginRight: 16,
  },
  superLikeAvatar: {
      borderWidth: 2,
      borderColor: '#D4AF37',
  },
  superLikeStarBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: '#D4AF37',
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#FFF',
  },
  superLikeBadge: {
      backgroundColor: '#D4AF37',
      // Maybe add a glow effect or different shadow
      shadowColor: "#B8860B",
      shadowOpacity: 0.5,
  },
  messagePreview: {
      fontSize: 13,
      color: '#666',
      marginTop: 2,
      fontStyle: 'italic',
  },
});

export default LikesYouScreen;

