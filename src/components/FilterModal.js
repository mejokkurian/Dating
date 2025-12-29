import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import theme from "../theme/theme";

const FilterModal = ({ visible, filterState, onClose, onUpdateFilter }) => {
  const [localFilterState, setLocalFilterState] = useState(filterState);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLocalFilterState(filterState);
      // Entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible, filterState]);

  const handleClose = () => {
    // Exit animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleApply = () => {
    onUpdateFilter(localFilterState);
    handleClose();
  };

  const togglePremium = () => {
    setLocalFilterState((prev) => ({ ...prev, premium: !prev.premium }));
  };

  const lifestyleOptions = ["Yes", "Sometimes", "No", "Prefer not to say"];
  const toggleLifestyle = (option) => {
    setLocalFilterState((prev) => {
      const current = prev.lifestyle || [];
      if (current.includes(option)) {
        return {
          ...prev,
          lifestyle: current.filter((item) => item !== option),
        };
      } else {
        return { ...prev, lifestyle: [...current, option] };
      }
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Blurred Background */}
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Filters</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.text.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Premium Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Premium Members</Text>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  localFilterState.premium && styles.filterOptionActive,
                ]}
                onPress={togglePremium}
              >
                <Ionicons
                  name={localFilterState.premium ? "star" : "star-outline"}
                  size={20}
                  color={
                    localFilterState.premium ? "#FFFFFF" : theme.colors.primary
                  }
                />
                <Text
                  style={[
                    styles.filterOptionText,
                    localFilterState.premium && styles.filterOptionTextActive,
                  ]}
                >
                  Show Premium Only
                </Text>
                {localFilterState.premium && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Lifestyle Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lifestyle</Text>
              <View style={styles.optionsContainer}>
                {lifestyleOptions.map((option) => {
                  const isSelected =
                    localFilterState.lifestyle?.includes(option);
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.lifestyleOption,
                        isSelected && styles.lifestyleOptionActive,
                      ]}
                      onPress={() => toggleLifestyle(option)}
                    >
                      <Ionicons
                        name={isSelected ? "heart" : "heart-outline"}
                        size={16}
                        color={isSelected ? "#FFFFFF" : theme.colors.primary}
                      />
                      <Text
                        style={[
                          styles.lifestyleOptionText,
                          isSelected && styles.lifestyleOptionTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApply}
                activeOpacity={0.8}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setLocalFilterState({
                    ...filterState,
                    premium: false,
                    lifestyle: [],
                  });
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: theme.colors.glass.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  filterOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterOptionText: {
    fontSize: 15,
    color: theme.colors.text.primary,
    fontWeight: "500",
  },
  filterOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  lifestyleOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.glass.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  lifestyleOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  lifestyleOptionText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: "500",
  },
  lifestyleOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  actionsContainer: {
    marginTop: 8,
    gap: 12,
  },
  applyButton: {
    backgroundColor: "#000000",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resetButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  resetButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default FilterModal;
