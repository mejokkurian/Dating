import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

const StickerMessage = ({ sticker, onPress }) => {
  if (!sticker) {
    return null;
  }

  const isEmoji = !sticker.startsWith('http');

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.container}
    >
      {isEmoji ? (
        <Text style={styles.sticker}>{sticker}</Text>
      ) : (
        <Image 
          source={{ uri: sticker }} 
          style={styles.stickerImage} 
          resizeMode="contain"
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sticker: {
    fontSize: 120,
    lineHeight: 140,
  },
  stickerImage: {
    width: 150,
    height: 150,
  },
});

export default StickerMessage;
