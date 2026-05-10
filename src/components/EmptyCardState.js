import React, { useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GradientButton from './GradientButton';
import InfoCard from './InfoCard';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const EmptyCardState = ({ onRefresh, onFilter }) => {
  const { colors } = useTheme();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // 0 = Idle, 1 = Refreshing

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    // Animate to Refreshing State
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Call the original onRefresh and wait for it
    if (onRefresh) {
      await onRefresh();
    }
    
    // Animate back to Idle State
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
        setIsRefreshing(false);
    });
  };

  const idleOpacity = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const refreshOpacity = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const idleScale = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.8],
  });

  const refreshScale = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  return (
    <View style={styles.container}>
      {/* Icon Container with subtle glow */}
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={['rgba(212, 175, 55, 0.2)', 'rgba(212, 175, 55, 0.05)']}
          style={styles.iconBackground}
        >
          {/* Idle Icon (Account Search) */}
          <Animated.View style={[
             styles.iconWrapper,
             { opacity: idleOpacity, transform: [{ scale: idleScale }] }
          ]}>
            <MaterialCommunityIcons name="account-search-outline" size={60} color={colors.accent} />
          </Animated.View>

          {/* Refreshing Icon (Person) */}
          <Animated.View style={[
             styles.iconWrapper,
             { opacity: refreshOpacity, transform: [{ scale: refreshScale }] }
          ]}>
            <MaterialCommunityIcons name="account" size={50} color={colors.accent} />
          </Animated.View>
        </LinearGradient>
      </View>

      <Text style={[styles.title, { color: colors.text.primary }]}>
        {isRefreshing ? "Searching nearby..." : "You've seen everyone nearby!"}
      </Text>

      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
        {isRefreshing
          ? "Looking for new people who match your preferences."
          : "Expand your search filters or check back later to discover more people."}
      </Text>

      {!isRefreshing && (
        <View style={styles.infoCardWrapper}>
          <InfoCard
            title="💡 Tips to find more matches"
            items={[
              { icon: 'options-outline', text: 'Adjust your filters to expand your search radius' },
              { icon: 'time-outline', text: 'Check back later - new people join every day' },
              { icon: 'location-outline', text: 'Try visiting different areas to discover more profiles' },
            ]}
          />
        </View>
      )}

      <View style={styles.buttonContainer}>
        {onFilter && !isRefreshing && (
          <GradientButton
            title="Adjust Filters"
            onPress={onFilter}
            variant="primary"
            size="medium"
            icon={<Ionicons name="options-outline" size={20} color="#FFF" />}
            style={styles.button}
          />
        )}
        
        <TouchableOpacity
          onPress={handleRefresh}
          style={[styles.outlineButton, { backgroundColor: colors.surface, borderColor: colors.accent }, isRefreshing && { opacity: 0.7 }]}
          activeOpacity={0.7}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
             <ActivityIndicator color={colors.accent} size="small" style={{ marginRight: 8 }} />
          ) : (
             <Ionicons name="refresh" size={20} color={colors.accent} style={{ marginRight: 8 }} />
          )}
          <Text style={[styles.outlineButtonText, { color: colors.accent }]}>{isRefreshing ? "Searching..." : "Refresh Feed"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 160,
    width: '100%',
  },
  iconContainer: {
    marginTop: 0,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  iconWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 24,
    maxWidth: '80%',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
  },
  outlineButton: {
    width: '100%',
    maxWidth: 280,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoCardWrapper: {
    width: '100%',
    marginTop: 12,
    marginBottom: 20,
  },
});

export default EmptyCardState;
