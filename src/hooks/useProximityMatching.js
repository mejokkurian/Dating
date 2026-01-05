import { useState, useEffect, useCallback } from 'react';
import { getNearbyUsers } from '../services/api/connectNow';
import socketService from '../services/socket';
import { formatDistance } from '../constants/location';

/**
 * Custom hook for managing nearby users and proximity matching
 * Handles socket events for real-time proximity updates
 */
export const useProximityMatching = (enabled = false) => {
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load nearby users from API
  const loadNearbyUsers = useCallback(async () => {
    if (!enabled) {
      setNearbyUsers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const users = await getNearbyUsers();
      
      // Format users with distance display, preserving match information
      const formattedUsers = users.map(user => ({
        ...user,
        distanceDisplay: formatDistance(
          user.distance || 0,
          user.showExactDistance !== false
        ),
        // Preserve match information from backend
        hasMatch: user.hasMatch || false,
        matchStatus: user.matchStatus || null,
      }));

      setNearbyUsers(formattedUsers);
    } catch (err) {
      console.error('Error loading nearby users:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Handle nearby user entered event
  const handleNearbyUserEntered = useCallback((data) => {
    const { user } = data;
    
    setNearbyUsers(prev => {
      // Check if user already exists
      const exists = prev.find(u => u._id === user._id);
      if (exists) {
        // Update existing user
        return prev.map(u => 
          u._id === user._id 
            ? { 
                ...u, 
                ...user,
                distanceDisplay: formatDistance(
                  user.distance || 0,
                  user.showExactDistance !== false
                ),
                // Preserve match information
                hasMatch: user.hasMatch !== undefined ? user.hasMatch : u.hasMatch || false,
                matchStatus: user.matchStatus || u.matchStatus || null,
              }
            : u
        );
      } else {
        // Add new user
        return [
          ...prev,
          {
            ...user,
            distanceDisplay: formatDistance(
              user.distance || 0,
              user.showExactDistance !== false
            ),
            // Preserve match information
            hasMatch: user.hasMatch || false,
            matchStatus: user.matchStatus || null,
          }
        ].sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }
    });
  }, []);

  // Handle nearby user left event
  const handleNearbyUserLeft = useCallback((data) => {
    const { userId } = data;
    setNearbyUsers(prev => prev.filter(u => u._id !== userId));
  }, []);

  // Set up socket listeners
  useEffect(() => {
    if (!enabled) {
      return;
    }

    socketService.onNearbyUserEntered(handleNearbyUserEntered);
    socketService.onNearbyUserLeft(handleNearbyUserLeft);

    return () => {
      socketService.removeListener('nearby_user_entered');
      socketService.removeListener('nearby_user_left');
    };
  }, [enabled, handleNearbyUserEntered, handleNearbyUserLeft]);

  // Load nearby users when enabled
  useEffect(() => {
    if (enabled) {
      loadNearbyUsers();
      
      // Refresh nearby users periodically
      const interval = setInterval(loadNearbyUsers, 60000); // Every minute
      
      return () => clearInterval(interval);
    } else {
      setNearbyUsers([]);
    }
  }, [enabled, loadNearbyUsers]);

  return {
    nearbyUsers,
    loading,
    error,
    refreshNearbyUsers: loadNearbyUsers,
  };
};

