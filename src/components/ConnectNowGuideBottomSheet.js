import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import NotificationBottomSheet from './NotificationBottomSheet';

const { width } = Dimensions.get('window');

const ConnectNowGuideBottomSheet = ({ visible, onClose }) => {
  const guidePoints = [
    {
      icon: 'navigate-circle',
      text: 'Share your location to find people nearby in real-time.'
    },
    {
      icon: 'map',
      text: 'View users on an interactive map or list view.'
    },
    {
      icon: 'chatbubbles',
      text: 'Send quick "Hellos" to break the ice instantly.'
    }
  ];

  return (
    <NotificationBottomSheet
      visible={visible}
      onClose={onClose}
      title="How Connect Now Works"
      message=""
      listItems={guidePoints}
      buttonText="Got it, let's go!"
      onButtonPress={onClose}
      type="info"
      centerList={true}
    />
  );
};

export default ConnectNowGuideBottomSheet;
