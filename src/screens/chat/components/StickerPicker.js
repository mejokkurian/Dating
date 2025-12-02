import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import StickerGrid from './StickerGrid';
import stickerPacks from '../data/stickerPacks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_HEIGHT = SCREEN_HEIGHT * 0.3;
const MAX_HEIGHT = SCREEN_HEIGHT * 0.9;
const INITIAL_HEIGHT = SCREEN_HEIGHT * 0.5;

const StickerPicker = ({ visible, onClose, onStickerSelect, recentStickers = [], customStickers = [], onCreateSticker }) => {
  const [selectedPackId, setSelectedPackId] = useState('emotions');
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  // Combine default packs with custom pack
  const allPacks = [
    {
      id: 'custom',
      name: 'Custom',
      thumbnail: '⭐',
      stickers: [{ id: 'create', emoji: '➕', name: 'Create' }, ...customStickers],
    },
    ...stickerPacks
  ];

  const selectedPack = allPacks.find(pack => pack.id === selectedPackId);

  const handleStickerPress = (sticker) => {
    if (sticker.id === 'create') {
      onCreateSticker && onCreateSticker();
    } else {
      onStickerSelect(sticker);
    }
  };

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 50 });
    } else {
      translateY.value = SCREEN_HEIGHT;
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      let newTranslateY = context.value.y + event.translationY;
      // Limit upward movement (negative translation)
      if (newTranslateY < -(MAX_HEIGHT - INITIAL_HEIGHT)) {
        newTranslateY = -(MAX_HEIGHT - INITIAL_HEIGHT);
      }
      translateY.value = newTranslateY;
    })
    .onEnd((event) => {
      // Snap points logic
      const currentHeight = INITIAL_HEIGHT - translateY.value;
      
      if (currentHeight < MIN_HEIGHT) {
        // Close if dragged too low
        if (event.velocityY > 500 || currentHeight < MIN_HEIGHT * 0.8) {
          runOnJS(onClose)();
        } else {
          translateY.value = withSpring(0); // Snap back to initial
        }
      } else if (currentHeight > MAX_HEIGHT * 0.8) {
        // Snap to max height
        translateY.value = withSpring(-(MAX_HEIGHT - INITIAL_HEIGHT));
      } else {
        // Snap to initial height
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: INITIAL_HEIGHT - translateY.value,
    };
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.modalContainer, animatedStyle]}>
            <SafeAreaView style={styles.safeArea}>
              {/* Drag Handle */}
              <View style={styles.dragHandleContainer}>
                <View style={styles.dragHandle} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                  <Ionicons name="albums-outline" size={24} color="#000" style={styles.headerIcon} />
                  <Text style={styles.headerTitle}>Stickers</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              {/* Recent Stickers */}
              {recentStickers.length > 0 && selectedPackId !== 'custom' && (
                <View style={styles.recentSection}>
                  <Text style={styles.sectionTitle}>Recent</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recentScroll}
                  >
                    {recentStickers.map((sticker) => (
                      <TouchableOpacity
                        key={sticker.id}
                        style={styles.recentSticker}
                        onPress={() => handleStickerPress(sticker)}
                      >
                        <Text style={styles.recentStickerEmoji}>{sticker.emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Pack Tabs */}
              <View style={styles.tabBar}>
                {allPacks.map((pack) => (
                  <TouchableOpacity
                    key={pack.id}
                    style={[
                      styles.tab,
                      selectedPackId === pack.id && styles.tabActive,
                    ]}
                    onPress={() => setSelectedPackId(pack.id)}
                  >
                    <Text style={styles.tabEmoji}>{pack.thumbnail}</Text>
                    <Text style={[
                      styles.tabText,
                      selectedPackId === pack.id && styles.tabTextActive,
                    ]}>
                      {pack.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sticker Grid */}
              <View style={styles.gridContainer}>
                {selectedPack && (
                  <StickerGrid
                    key={selectedPackId}
                    stickers={selectedPack.stickers}
                    onStickerPress={handleStickerPress}
                  />
                )}
              </View>
            </SafeAreaView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
  },
  safeArea: {
    flex: 1,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  recentSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  recentScroll: {
    paddingHorizontal: 12,
  },
  recentSticker: {
    width: 60,
    height: 60,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  recentStickerEmoji: {
    fontSize: 32,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#000',
  },
  tabEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 11,
    color: '#666',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  gridContainer: {
    flex: 1,
  },
});

export default StickerPicker;
