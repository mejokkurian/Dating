import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getMyMatches } from '../services/api/match';
import { useAuth } from '../context/AuthContext';
import { useBadge } from '../context/BadgeContext';

const MessagesScreen = ({ navigation }) => {
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
      // Don't show loading spinner on subsequent refreshes to avoid flickering
      if (matches.length === 0) setLoading(true);
      const data = await getMyMatches();
      // Only show active matches (chats)
      const activeChats = data.filter(match => match.status === 'active');
      setMatches(activeChats);
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

  const handleChatPress = (match) => {
    // Active match, go to chat
    navigation.navigate('Chat', { 
      user: match.user,
      matchStatus: match.status,
      isInitiator: match.isInitiator
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

  const renderMatchItem = (match) => (
    <TouchableOpacity 
      key={match.matchId} 
      style={styles.chatItem} 
      onPress={() => handleChatPress(match)}
    >
      <Image 
        source={{ 
          uri: match.user.image || (match.user.photos && match.user.photos.length > 0
            ? (match.user.photos[match.user.mainPhotoIndex ?? 0] || match.user.photos[0])
            : null) || 'https://via.placeholder.com/60'
        }} 
        style={styles.chatAvatar} 
      />
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{match.user.name || match.user.displayName}</Text>
          <Text style={styles.chatTime}>
            {formatTime(match.lastMessage?.createdAt || match.lastMessageAt)}
          </Text>
        </View>
        <Text style={styles.chatMessage} numberOfLines={1}>
          {match.lastMessage?.content || 'Start a conversation...'}
        </Text>
      </View>
      {match.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{match.unreadCount}</Text>
        </View>
      )}
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {matches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name="chatbubbles-outline"
              size={80} 
              color="#CCC" 
            />
            <Text style={styles.emptyTitle}>
              No Conversations Yet
            </Text>
            <Text style={styles.emptyText}>
              Start swiping to find your perfect match!
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            {matches.map(renderMatchItem)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
  },
  section: {
    marginBottom: 32,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9',
  },
  chatAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  chatTime: {
    fontSize: 12,
    color: '#999999',
  },
  chatMessage: {
    fontSize: 14,
    color: '#666666',
  },
  unreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default MessagesScreen;
