import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GradientButton from './GradientButton';
import theme from '../theme/theme';

const { width } = Dimensions.get('window');
const AnimatedIcon = Animated.createAnimatedComponent(MaterialCommunityIcons);

const EmptyCardState = ({ onRefresh, onFilter }) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);

    // Call the original onRefresh and wait for it
    if (onRefresh) {
      await onRefresh();
    }
    
    setIsRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Icon Container with subtle glow */}
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={['rgba(212, 175, 55, 0.2)', 'rgba(212, 175, 55, 0.05)']}
          style={styles.iconBackground}
        >
          {isRefreshing ? (
             <View style={styles.animationContainer}>
               {/* Fixed Person Icon - Static during refresh */}
               <MaterialCommunityIcons 
                 name="account" 
                 size={60} 
                 color={theme.colors.primary} 
               />
             </View>
          ) : (
            <MaterialCommunityIcons name="account-search-outline" size={80} color={theme.colors.primary} />
          )}
        </LinearGradient>
      </View>

      <Text style={styles.title}>
        {isRefreshing ? "Searching nearby..." : "You've seen everyone nearby!"}
      </Text>
      
      <Text style={styles.subtitle}>
        {isRefreshing 
          ? "Looking for new people who match your preferences."
          : "Expand your search filters or check back later to discover more people."}
      </Text>

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
          style={[styles.outlineButton, isRefreshing && styles.disabledButton]}
          activeOpacity={0.7}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
             <ActivityIndicator color={theme.colors.primary} size="small" style={{ marginRight: 8 }} />
          ) : (
             <Ionicons name="refresh" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
          )}
          <Text style={styles.outlineButtonText}>{isRefreshing ? "Searching..." : "Refresh Feed"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    width: width,
  },
  iconContainer: {
    marginBottom: 30,
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
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text.primary,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
    maxWidth: '80%',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    maxWidth: 280,
  },
  outlineButton: {
    width: '100%',
    maxWidth: 280,
    height: 52, // Match medium button height
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  disabledButton: {
    opacity: 0.7,
    backgroundColor: '#F5F5F5',
  },
  outlineButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.primary,
  }
});

export default EmptyCardState;
