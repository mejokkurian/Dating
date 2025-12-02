import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getMyMatches } from '../services/api/match';
import { getConversations } from '../services/api/chat';
import socketService from '../services/socket';

const BadgeContext = createContext({});

export const useBadge = () => {
  const context = useContext(BadgeContext);
  if (!context) {
    throw new Error('useBadge must be used within BadgeProvider');
  }
  return context;
};

export const BadgeProvider = ({ children }) => {
  const { user } = useAuth();
  const [likesYouCount, setLikesYouCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const updateBadgeCounts = useCallback(async () => {
    if (!user) {
      setLikesYouCount(0);
      setUnreadMessagesCount(0);
      return;
    }

    try {
      // Fetch likes you count (pending matches where user is not initiator)
      const matches = await getMyMatches();
      const likesYou = matches.filter(match => match.status === 'pending' && !match.isInitiator);
      setLikesYouCount(likesYou.length);

      // Fetch unread messages count (sum of unreadCount from all conversations)
      const conversations = await getConversations();
      const totalUnread = conversations.reduce((sum, conv) => {
        return sum + (conv.unreadCount || 0);
      }, 0);
      setUnreadMessagesCount(totalUnread);
    } catch (error) {
      console.error('Error updating badge counts:', error);
      // Don't set counts to 0 on error, keep previous values
    }
  }, [user]);

  // Update badges when user changes or periodically
  useEffect(() => {
    if (!user) {
      setLikesYouCount(0);
      setUnreadMessagesCount(0);
      return;
    }

    // Initial load
    updateBadgeCounts();

    // Set up interval to refresh badges
    const interval = setInterval(() => {
      updateBadgeCounts();
    }, 30000); // Refresh every 30 seconds

    // Listen for real-time updates via socket
    const handleNewMessage = () => {
      updateBadgeCounts();
    };

    socketService.connect();
    socketService.onNewMessage(handleNewMessage);

    return () => {
      clearInterval(interval);
      socketService.removeListener('new_message');
    };
  }, [user, updateBadgeCounts]);

  return (
    <BadgeContext.Provider
      value={{
        likesYouCount,
        unreadMessagesCount,
        updateBadgeCounts,
        loading,
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
};

