import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CallMessage = ({ message, isMine }) => {
  const { callData } = message;
  
  if (!callData) return null;

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return ` - ${mins}m ${secs}s`;
    }
    return ` - ${secs}s`;
  };

  const getCallIcon = () => {
    return callData.callType === 'video' ? 'videocam' : 'call';
  };

  const getCallText = () => {
    const type = callData.callType === 'video' ? 'Video' : 'Audio';
    const duration = formatDuration(callData.duration);
    
    switch (callData.status) {
      case 'missed':
        return `Missed ${type.toLowerCase()} call`;
      case 'declined':
        return `${type} call declined`;
      case 'cancelled':
        return `${type} call cancelled`;
      default:
        return `${type} call${duration}`;
    }
  };

  const getIconColor = () => {
    if (callData.status === 'missed') return '#FF3B30';
    if (isMine) return '#FFFFFF';
    return '#000000';
  };

  const getTextColor = () => {
    if (isMine) return '#FFFFFF';
    return '#000000';
  };

  return (
    <View style={[styles.container, isMine ? styles.myCall : styles.theirCall]}>
      <Ionicons 
        name={getCallIcon()} 
        size={16} 
        color={getIconColor()} 
        style={styles.icon}
      />
      <Text style={[styles.text, { color: getTextColor() }]}>
        {getCallText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    maxWidth: '70%',
  },
  myCall: {
    backgroundColor: '#000000',
    alignSelf: 'flex-end',
  },
  theirCall: {
    backgroundColor: '#F2F2F7',
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CallMessage;
