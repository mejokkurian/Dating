import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTopPicks } from '../services/api/match';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;





import { useFocusEffect } from '@react-navigation/native';

const TopPicksScreen = ({ navigation }) => {
  const [picks, setPicks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  

  useFocusEffect(
    React.useCallback(() => {
      fetchTopPicks();
    }, [])
  );

  const fetchTopPicks = async () => {
    try {
      setLoading(true);
      const data = await getTopPicks();
      setPicks(data);
    } catch (error) {
      console.error('Error fetching top picks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePress = (profile) => {
    navigation.navigate('TopPickProfile', {
      user: profile,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Top Picks</Text>
        <Text style={styles.subtitle}>Curated just for you based on your preferences.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {loading ? (
             <View style={{ width: '100%', height: 200, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>Loading picks...</Text>
             </View>
        ) : (
          picks.map((profile) => (
            <TouchableOpacity 
              key={profile._id || profile.id} 
              style={styles.card}
              onPress={() => handleProfilePress(profile)}
            >
              <Image 
                source={{ uri: (profile.photos && profile.photos.length > 0 ? profile.photos[0] : null) || 'https://via.placeholder.com/400x600' }} 
                style={styles.image} 
              />
              <View style={styles.matchBadge}>
                <Ionicons name="flame" size={12} color="#D4AF37" />
                <Text style={styles.matchText}>{profile.matchPercentage || 95}% Match</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{profile.displayName || profile.name}, {profile.age}</Text>
                  {profile.isOnline && <View style={styles.onlineDot} />}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        
        <TouchableOpacity style={styles.upgradeCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="diamond" size={32} color="#D4AF37" />
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
    elevation: 4,
    borderWidth: 2,
    borderColor: '#D4AF37',
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
