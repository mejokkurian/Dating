import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getConversations } from '../../services/api/chat';
import socketService from '../../services/socket';
import { normalizeContent } from '../../utils/messageContent';

const ConversationsScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let messageHandler = null;

    const loadConversations = async () => {
      try {
        const data = await getConversations();
        // Only update state if component is still mounted
        if (isMounted) {
          setConversations(data);
        }
      } catch (error) {
        console.error('Load conversations error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    const initializeSocket = async () => {
      try {
        await socketService.connect();
        
        if (isMounted) {
          // Listen for new messages to update conversation list
          messageHandler = (message) => {
            if (isMounted) {
              loadConversations();
            }
          };
          socketService.onNewMessage(messageHandler);
        }
      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    loadConversations();
    initializeSocket();

    return () => {
      isMounted = false;
      // Properly remove the listener
      try {
        if (messageHandler) {
          socketService.removeListener('new_message');
        }
        // Also disconnect to prevent memory leaks
        socketService.disconnect();
      } catch (error) {
        console.warn('Error during ConversationsScreen cleanup:', error);
      }
    };
  }, []);

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return messageDate.toLocaleDateString();
  };

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => navigation.navigate('Chat', { 
        user: {
          _id: item.otherUser._id,
          name: item.otherUser.displayName,
          image: (item.otherUser.photos && item.otherUser.photos.length > 0
            ? (item.otherUser.photos[item.otherUser.mainPhotoIndex ?? 0] || item.otherUser.photos[0])
            : null) || 'https://via.placeholder.com/150',
        }
      })}
    >
      <Image
        source={{ 
          uri: (item.otherUser.photos && item.otherUser.photos.length > 0
            ? (item.otherUser.photos[item.otherUser.mainPhotoIndex ?? 0] || item.otherUser.photos[0])
            : null) || 'https://via.placeholder.com/150'
        }}
        style={styles.avatar}
      />
      <View style={styles.conversationInfo}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{item.otherUser.displayName}</Text>
          {item.lastMessage && (
            <Text style={styles.time}>{formatTime(item.lastMessage.createdAt)}</Text>
          )}
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage ? normalizeContent(item.lastMessage.content) || 'Start a conversation' : 'Start a conversation'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      
      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start matching to begin chatting!</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.conversationId}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#000',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default ConversationsScreen;
