import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const MOCK_PICKS = [
  {
    id: '1',
    name: 'Sophia',
    age: 24,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    matchPercentage: 95,
    isOnline: true,
  },
  {
    id: '2',
    name: 'Alexander',
    age: 29,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    matchPercentage: 92,
    isOnline: false,
  },
  {
    id: '3',
    name: 'Isabella',
    age: 26,
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    matchPercentage: 88,
    isOnline: true,
  },
  {
    id: '4',
    name: 'Lucas',
    age: 31,
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    matchPercentage: 85,
    isOnline: false,
  },
];

const TopPicksScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Top Picks</Text>
        <Text style={styles.subtitle}>Curated just for you based on your preferences.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {MOCK_PICKS.map((profile) => (
          <TouchableOpacity key={profile.id} style={styles.card}>
            <Image source={{ uri: profile.image }} style={styles.image} />
            <View style={styles.matchBadge}>
              <Ionicons name="flame" size={12} color="#FFFFFF" />
              <Text style={styles.matchText}>{profile.matchPercentage}% Match</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profile.name}, {profile.age}</Text>
                {profile.isOnline && <View style={styles.onlineDot} />}
              </View>
            </View>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity style={styles.upgradeCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="diamond" size={32} color="#000" />
          </View>
          <Text style={styles.upgradeTitle}>See More Picks</Text>
          <Text style={styles.upgradeSubtitle}>Upgrade to Premium to unlock unlimited curated matches.</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  matchBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.4)', // Gradient overlay would be better but this works
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  upgradeCard: {
    width: '100%',
    padding: 24,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginTop: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TopPicksScreen;
