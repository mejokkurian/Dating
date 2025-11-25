import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';

const features = [
  { icon: 'infinite', label: 'Unlimited Swipes' },
  { icon: 'heart', label: 'See Who Liked You' },
  { icon: 'star', label: 'Priority Listing' },
  { icon: 'rocket', label: 'Boost Profile Visibility' },
  { icon: 'checkmark-circle', label: 'Verified Badge' },
  { icon: 'airplane', label: 'Travel Mode' },
  { icon: 'chatbubbles', label: 'Message Anyone Directly' },
  { icon: 'refresh', label: 'Rewind Last Swipe' },
  { icon: 'eye-off', label: 'Hide Last Seen' },
  { icon: 'pulse', label: 'View "Active Now" Status' },
];

const PremiumScreen = ({ navigation, route }) => {
  const { setOnboardingComplete } = useAuth();
  const isTab = route?.params?.isTab;

  const handleSubscribe = () => {
    // Mock subscription logic - in real app this would trigger IAP
    if (!isTab) {
      setOnboardingComplete(true);
    } else {
      // If in tab, maybe show success alert
      alert('Subscription successful!');
    }
  };

  const handleSkip = () => {
    setOnboardingComplete(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons name="diamond" size={40} color="#B8860B" />
          </View>
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>Experience the ultimate way to match.</Text>
        </View>

        <View style={styles.featuresList}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.iconContainer}>
                <Ionicons name={feature.icon} size={24} color="#B8860B" />
              </View>
              <Text style={styles.featureText}>{feature.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
            <Text style={styles.subscribeButtonText}>Get Premium</Text>
            <Text style={styles.priceText}>$9.99 / month</Text>
          </TouchableOpacity>
          
          {!isTab && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    paddingBottom: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  featuresList: {
    marginBottom: 40,
    paddingLeft: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  iconContainer: {
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  footer: {
    gap: 12,
  },
  subscribeButton: {
    backgroundColor: '#B8860B',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  subscribeButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  priceText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#B8860B',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PremiumScreen;
