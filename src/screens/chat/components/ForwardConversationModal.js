import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyMatches } from '../../../services/api/match';
import { useAuth } from '../../../context/AuthContext';

const ForwardConversationModal = ({
  visible,
  onClose,
  onSelectConversation,
  currentUserId,
  messageToForward,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      loadConversations();
    } else {
      // Reset state when modal closes
      setConversations([]);
      setError(null);
    }
  }, [visible]);

  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyMatches();
      // Only show active matches (chats), exclude current conversation
      const activeChats = data.filter(
        match => 
          match.status === 'active' && 
          match.user._id !== currentUserId
      );
      setConversations(activeChats);
    } catch (err) {
      if (__DEV__) {
        console.error('Error loading conversations for forward:', err);
      }
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conversation) => {
    onSelectConversation(conversation);
    onClose();
  };

  const formatTime = (date) => {
    if (!date) return '';
    const messageDate = new Date(date);
    const now = new Date();
    const diff = now - messageDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const renderConversation = ({ item }) => {
    const userPhoto = item.user.photos && item.user.photos.length > 0
      ? (item.user.photos[item.user.mainPhotoIndex ?? 0] || item.user.photos[0])
      : null;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleSelectConversation(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: userPhoto || 'https://via.placeholder.com/60' }}
          style={styles.avatar}
        />
        <View style={styles.conversationInfo}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.user.name || item.user.displayName}
            </Text>
            {item.lastMessage && (
              <Text style={styles.time}>
                {formatTime(item.lastMessage.createdAt || item.lastMessageAt)}
              </Text>
            )}
          </View>
          {item.lastMessage && (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage.content || 'Start a conversation...'}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={styles.emptyText}>Loading conversations...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#999" />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadConversations}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color="#999" />
        <Text style={styles.emptyText}>No conversations available</Text>
        <Text style={styles.emptySubtext}>
          You need at least one active match to forward messages
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Forward Message</Text>
            <View style={styles.closeButton} />
          </View>

          {/* Message Preview */}
          {messageToForward && (
            <View style={styles.messagePreview}>
              <View style={styles.previewHeader}>
                <Ionicons name="arrow-forward" size={16} color="#666" />
                <Text style={styles.previewTitle}>Forwarding:</Text>
              </View>
              <View style={styles.previewContent}>
                {messageToForward.messageType === 'audio' ? (
                  <View style={styles.previewAudio}>
                    <Ionicons name="mic" size={16} color="#666" />
                    <Text style={styles.previewText}>Voice message</Text>
                  </View>
                ) : messageToForward.messageType === 'image' ? (
                  <View style={styles.previewImage}>
                    <Ionicons name="image" size={16} color="#666" />
                    <Text style={styles.previewText}>Photo</Text>
                  </View>
                ) : (
                  <Text style={styles.previewText} numberOfLines={2}>
                    {messageToForward.content || 'Message'}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Conversations List */}
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.matchId || item.conversationId}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={
              conversations.length === 0 ? styles.emptyList : null
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  messagePreview: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  previewContent: {
    paddingLeft: 22,
  },
  previewAudio: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewImage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 6,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyList: {
    flexGrow: 1,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#D4AF37',
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ForwardConversationModal;
