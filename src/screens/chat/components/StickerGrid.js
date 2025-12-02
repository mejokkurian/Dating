import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';

const StickerGrid = ({ stickers, onStickerPress }) => {
  const renderSticker = ({ item }) => {
    const isEmoji = !item.emoji?.startsWith('http');
    
    return (
      <TouchableOpacity
        style={styles.stickerItem}
        onPress={() => onStickerPress(item)}
        activeOpacity={0.7}
      >
        {isEmoji ? (
          <Text style={styles.stickerEmoji}>{item.emoji}</Text>
        ) : (
          <Image 
            source={{ uri: item.emoji }} 
            style={styles.stickerImage} 
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={stickers}
      renderItem={renderSticker}
      keyExtractor={(item) => item.id}
      numColumns={4}
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  grid: {
    padding: 8,
  },
  stickerItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerEmoji: {
    fontSize: 40,
  },
  stickerImage: {
    width: '80%',
    height: '80%',
  },
});

export default StickerGrid;
