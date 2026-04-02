import { useState, useEffect, useRef } from 'react';
import socketService from '../services/socket';

/**
 * Custom hook for monitoring network connectivity status
 * Uses socket connection status and API connectivity checks
 * @returns {Object} Network status object with isConnected and isOffline
 */
export const useNetworkStatus = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const checkIntervalRef = useRef(null);
  const lastSuccessfulCheckRef = useRef(Date.now());

  useEffect(() => {
    let mounted = true;

    // Check socket connection status
    const checkSocketStatus = () => {
      if (!mounted) return;
      
      const connected = socketService.connected || false;
      setSocketConnected(connected);
      
      // If socket is connected, we're online
      if (connected) {
        setIsOffline(false);
        lastSuccessfulCheckRef.current = Date.now();
      } else {
        // If socket disconnected recently, might be temporary
        // If disconnected for more than 5 seconds, consider offline
        const timeSinceLastSuccess = Date.now() - lastSuccessfulCheckRef.current;
        if (timeSinceLastSuccess > 5000) {
          setIsOffline(true);
        }
      }
    };

    // Initial check
    checkSocketStatus();

    // Poll socket status periodically
    checkIntervalRef.current = setInterval(checkSocketStatus, 2000);

    // Also listen to socket connection events if available
    // Note: This is a fallback - the socket service should handle reconnection
    
    return () => {
      mounted = false;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  return {
    isConnected: !isOffline,
    socketConnected,
    isOffline,
  };
};
