import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getMyMatches } from '../services/api/match';
import { useAuth } from '../context/AuthContext';
import { useBadge } from '../context/BadgeContext';
import { useTheme } from '../context/ThemeContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import socketService from '../services/socket';
import { getCachedConversations, cacheConversation } from '../services/MessageCache';

const MessagesScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { updateBadgeCounts } = useBadge();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { isOffline } = useNetworkStatus();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [highlightedUserId, setHighlightedUserId] = useState(null);
  const [error, setError] = useState(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  // Handle highlighted user from navigation params
  useEffect(() => {
    if (route.params?.highlightUserId) {
      setHighlightedUserId(route.params.highlightUserId);
      // Clear highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightedUserId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [route.params?.highlightUserId]);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
      updateBadgeCounts(); // Update badge counts when screen comes into focus
    }, [updateBadgeCounts])
  );

  useEffect(() => {
     const handleUpdate = () => {
         loadMatches();
         updateBadgeCounts();
     };

     const handleMessageEdited = (data) => {
       // When a message is edited, update the conversation list
       // The last message content might have changed
       if (__DEV__) {
         console.log('📝 Message edited in conversation list, refreshing...');
       }
       loadMatches();
     };

     const handleMessageDeleted = (data) => {
       // When a message is deleted, update the conversation list
       // The last message might have changed if the deleted message was the last one
       if (__DEV__) {
         console.log('🗑️ Message deleted in conversation list, refreshing...');
       }
       loadMatches();
     };

     socketService.onNewMessage(handleUpdate);
     socketService.onInteraction(handleUpdate); // For matches/likes
     socketService.onMessageEdited(handleMessageEdited);
     socketService.onMessageDeleted(handleMessageDeleted);
     // Also listen for delivered/read if you want to update ticks, but this list only shows last message content. 
     // We should listen for read updates though to clear unread badges.
     socketService.onMessagesRead(() => {
         loadMatches();
         updateBadgeCounts();
     });

     return () => {
         socketService.removeListener('new_message');
         socketService.removeListener('interaction');
         socketService.removeListener('message_edited');
         socketService.removeListener('message_deleted');
         socketService.removeListener('messages_read');
     };
  }, [updateBadgeCounts]);

  const loadMatches = async () => {
    // Clear previous error
    setError(null);

    // Don't fetch when offline - show cached data
    if (isOffline) {
      const cached = getCachedConversations();
      if (cached.length > 0) {
        setMatches(cached);
      }
      setLoading(false);
      return;
    }

    try {
      // 1. Load from cache FIRST (instant UI)
      const cached = getCachedConversations();
      if (cached.length > 0) {
        if (__DEV__) {
          console.log(`✅ Loaded ${cached.length} conversations from cache`);
        }
        setMatches(cached);
        setLoading(false); // UI shows immediately!
      }

      // 2. Fetch from API in background
      const data = await getMyMatches();
      
      // Only show active matches (chats)
      const activeChats = data.filter(match => match.status === 'active');
      
      // 3. Cache the conversations
      activeChats.forEach(chat => cacheConversation(chat));
      
      // 4. Update UI with fresh data
      setMatches(activeChats);
    } catch (error) {
      if (__DEV__) {
        console.error('Load matches error:', error);
      }
      
      // Set error state with user-friendly message
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to load conversations. Please check your connection and try again.';
      setError({
        message: errorMessage,
        retry: loadMatches
      });
      
      // On error, keep cached conversations visible if available
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshSuccess(false);
    setError(null);
    try {
      await loadMatches();
      updateBadgeCounts(); // Update badge counts on refresh
      setRefreshSuccess(true);
      // Auto-dismiss success banner after 2 seconds
      setTimeout(() => {
        setRefreshSuccess(false);
      }, 2000);
    } catch (error) {
      // Error is handled by loadMatches
    } finally {
      setRefreshing(false);
    }
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

  const renderMatchItem = (match) => {
    const isHighlighted = highlightedUserId === match.user._id;
    
    return (
    <TouchableOpacity 
      key={match.matchId} 
      style={[styles.chatItem, isHighlighted && styles.highlightedChatItem]} 
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
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color="#FFFFFF" />
          <Text style={styles.offlineText}>No Internet Connection</Text>
        </View>
      )}

      {/* Refresh Success Banner */}
      {refreshSuccess && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.successText}>Conversations refreshed</Text>
        </View>
      )}

      {/* Error Banner */}
      {error && matches.length > 0 && (
        <View style={styles.errorBanner}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle" size={20} color="#FF4444" />
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => {
              setError(null);
              if (error.retry) {
                error.retry();
              }
            }}
            style={styles.errorRetryButton}
          >
            <Text style={styles.errorRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && matches.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF4444" />
          <Text style={styles.errorTitle}>Failed to Load Conversations</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          <TouchableOpacity 
            onPress={() => {
              setError(null);
              if (error.retry) {
                error.retry();
              }
            }}
            style={styles.errorRetryButtonLarge}
          >
            <Text style={styles.errorRetryTextLarge}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
              color="#D4AF37" 
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
      )}
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
    color: colors.text.primary,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
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
    color: colors.text.primary,
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
    borderBottomColor: colors.border,
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
    color: colors.text.primary,
  },
  chatTime: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  chatMessage: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  unreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  highlightedChatItem: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  },
  offlineBanner: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  successBanner: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginLeft: 8,
    flex: 1,
  },
  errorRetryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.error,
    borderRadius: 6,
  },
  errorRetryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorRetryButtonLarge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#D4AF37',
    borderRadius: 8,
  },
  errorRetryTextLarge: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MessagesScreen;
