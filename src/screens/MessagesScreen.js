import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getMyMatches } from '../services/api/match';
import { useAuth } from '../context/AuthContext';

const MessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [])
  );

  const loadMatches = async () => {
    try {
      // Don't show loading spinner on subsequent refreshes to avoid flickering
      if (matches.length === 0) setLoading(true);
      const data = await getMyMatches();
      setMatches(data);
    } catch (error) {
      console.error('Load matches error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  };

  const handleChatPress = (match) => {
    // If it's a pending match
    if (match.status === 'pending') {
      if (match.isInitiator) {
        // I liked them, waiting for response
        alert('Waiting for them to like you back!');
      } else {
        // They liked me, go to Main screen to swipe
        navigation.navigate('Discover', { 
          pendingProfile: match.user
        });
      }
    } else {
      // Active match, go to chat
      navigation.navigate('Chat', { 
        user: match.user,
        matchStatus: match.status,
        isInitiator: match.isInitiator
      });
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
            <Ionicons name="chatbubbles-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>No Matches Yet</Text>
            <Text style={styles.emptyText}>
              Start swiping to find your perfect match!
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conversations</Text>
            {matches.map((match) => (
              <TouchableOpacity 
                key={match.matchId} 
                style={styles.chatItem} 
                onPress={() => handleChatPress(match)}
              >
                <Image 
                  source={{ uri: match.user.image || 'https://via.placeholder.com/60' }} 
                  style={styles.chatAvatar} 
                />
                <View style={styles.chatContent}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{match.user.name}</Text>
                    <Text style={styles.chatTime}>
                      {formatTime(match.lastMessage?.createdAt || match.lastMessageAt)}
                    </Text>
                  </View>
                  {match.status === 'pending' ? (
                    <View style={styles.pendingContainer}>
                      <Ionicons name="time-outline" size={14} color="#FF9800" />
                      <Text style={styles.pendingText}>
                        {match.isInitiator 
                          ? 'Waiting for response...' 
                          : 'Liked you! Swipe right to match'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.chatMessage} numberOfLines={1}>
                      {match.lastMessage?.content || 'Start a conversation...'}
                    </Text>
                  )}
                </View>
                {match.status === 'active' && match.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{match.unreadCount}</Text>
                  </View>
                )}
                {match.status === 'pending' && (
                  <View style={styles.pendingBadge}>
                    <Ionicons name="hourglass-outline" size={16} color="#FF9800" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginLeft: 24,
    marginBottom: 16,
  },
  matchesList: {
    paddingLeft: 24,
  },
  matchItem: {
    marginRight: 20,
    alignItems: 'center',
  },
  matchImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#000000',
  },
  matchName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
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
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingText: {
    fontSize: 13,
    color: '#FF9800',
    fontStyle: 'italic',
  },
  pendingBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
