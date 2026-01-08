import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  PanResponder,
  Switch,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import theme from "../theme/theme";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const FilterBottomSheet = ({
  visible,
  filterState,
  onClose,
  onUpdateFilter,
}) => {
  // Local state for all filter inputs
  const [distance, setDistance] = useState(50);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(35);
  const [heightMin, setHeightMin] = useState(140);
  const [verified, setVerified] = useState(false);
  const [premium, setPremium] = useState(false);
  
  // Lifestyle Chip Arrays
  const [education, setEducation] = useState([]);
  const [drinking, setDrinking] = useState([]);
  const [smoking, setSmoking] = useState([]);
  const [kids, setKids] = useState([]);
  const [religion, setReligion] = useState([]);

  // Animation values
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // Options Data
  const EDUCATION_OPTIONS = ["High School", "Undergrad", "Postgrad", "PhD"];
  const DRINKING_OPTIONS = ["Socially", "Never", "Often"];
  const SMOKING_OPTIONS = ["Socially", "Never", "Regularly"];
  const KIDS_OPTIONS = ["Have kids", "Want kids", "Don't want", "Not sure"];
  const RELIGION_OPTIONS = ["Christian", "Muslim", "Jewish", "Hindu", "Atheist", "Spiritual", "Other"];

  // Initialize local state from props when visible
  useEffect(() => {
    if (visible) {
      setDistance(filterState.distance || 50);
      setAgeMin(filterState.ageMin || 18);
      setAgeMax(filterState.ageMax || 35);
      setHeightMin(filterState.heightMin || 140);
      setVerified(filterState.verified || false);
      setPremium(filterState.premium || false);
      setEducation(filterState.education || []);
      setDrinking(filterState.drinking || []);
      setSmoking(filterState.smoking || []);
      setKids(filterState.kids || []);
      setReligion(filterState.religion || []);

      // Enter Animation
      panY.setValue(0);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, filterState]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      panY.setValue(0);
      onClose();
    });
  };

  const handleApply = () => {
    onUpdateFilter({
      distance,
      ageMin,
      ageMax,
      heightMin,
      verified,
      premium,
      education,
      drinking,
      smoking,
      kids,
      religion,
    });
    handleClose();
  };

  const handleReset = () => {
    setDistance(50);
    setAgeMin(18);
    setAgeMax(35);
    setHeightMin(140);
    setVerified(false);
    setPremium(false);
    setEducation([]);
    setDrinking([]);
    setSmoking([]);
    setKids([]);
    setReligion([]);
  };

  // Helper for toggle chips
  const toggleChip = (item, currentList, setter) => {
    if (currentList.includes(item)) {
      setter(currentList.filter((i) => i !== item));
    } else {
      setter([...currentList, item]);
    }
  };

  const panResponder = useRef(
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: (_, gestureState) => {
            const isVerticalDrag =
              Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
            const isDraggingDown = gestureState.dy > 0;
            return isVerticalDrag && isDraggingDown;
          },
          onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
              panY.setValue(gestureState.dy);
            }
          },
          onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dy > 150) {
              handleClose();
            } else {
              Animated.spring(panY, {
                toValue: 0,
                useNativeDriver: true,
                friction: 7,
              }).start();
            }
          },
        })
      ).current;

  const combinedTranslateY = Animated.add(slideAnim, panY);

  const renderSectionHeader = (title, icon) => (
    <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
            <Ionicons name={icon} size={16} color="#D4AF37" />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderChips = (options, selected, setter) => (
      <View style={styles.chipsContainer}>
        {options.map((option) => {
            const isActive = selected.includes(option);
            return (
                <TouchableOpacity
                    key={option}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => toggleChip(option, selected, setter)}
                >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{option}</Text>
                </TouchableOpacity>
            )
        })}
      </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
        <View style={styles.overlay}>
             <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
             
             <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: combinedTranslateY }] }]}>
                {/* Drag Handle */}
                <View {...panResponder.panHandlers} style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>
                
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Filters</Text>
                     <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                         <View style={styles.closeIconCircle}>
                            <Ionicons name="close" size={20} color="#000" />
                         </View>
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    
                    {/* --- BASICS --- */}
                    <View style={styles.section}>
                        {renderSectionHeader("Distance Preference", "location-sharp")}
                        <View style={styles.sliderRow}>
                            <Text style={styles.sliderLabel}>Up to {Math.round(distance)} km</Text>
                        </View>
                        <Slider
                            style={styles.slider}
                            minimumValue={1}
                            maximumValue={100}
                            step={1}
                            value={distance}
                            onValueChange={setDistance}
                            minimumTrackTintColor="#D4AF37"
                            maximumTrackTintColor="#E5E5EA"
                            thumbTintColor="#D4AF37"
                        />
                    </View>

                    <View style={styles.section}>
                        {renderSectionHeader("Age Range", "calendar")}
                        <View style={styles.sliderRow}>
                             <Text style={styles.sliderLabel}>Min Age: {Math.round(ageMin)}</Text>
                             <Text style={styles.sliderLabel}>Max Age: {Math.round(ageMax)}</Text>
                        </View>
                        {/* Note: Ideally use a MultiSlider here. For now using two sliders as requested workaround */}
                         <View style={styles.dualSliderContainer}>
                            <Text style={styles.subLabel}>Min</Text>
                            <Slider
                                style={styles.halfSlider}
                                minimumValue={18}
                                maximumValue={50}
                                step={1}
                                value={ageMin}
                                onValueChange={(val) => {
                                    if(val > ageMax) setAgeMax(val);
                                    setAgeMin(val);
                                }}
                                minimumTrackTintColor="#D4AF37"
                                maximumTrackTintColor="#E5E5EA"
                                thumbTintColor="#D4AF37"
                            />
                            <Text style={styles.subLabel}>Max</Text>
                             <Slider
                                style={styles.halfSlider}
                                minimumValue={18}
                                maximumValue={80}
                                step={1}
                                value={ageMax}
                                onValueChange={(val) => {
                                    if(val < ageMin) setAgeMin(val);
                                    setAgeMax(val);
                                }}
                                minimumTrackTintColor="#D4AF37"
                                maximumTrackTintColor="#E5E5EA"
                                thumbTintColor="#D4AF37"
                            />
                         </View>
                    </View>

                    <View style={styles.section}>
                        {renderSectionHeader("Minimum Height", "resize")}
                         <View style={styles.sliderRow}>
                            <Text style={styles.sliderLabel}>{Math.round(heightMin)} cm+</Text>
                        </View>
                        <Slider
                            style={styles.slider}
                            minimumValue={140}
                            maximumValue={220}
                            step={1}
                            value={heightMin}
                            onValueChange={setHeightMin}
                            minimumTrackTintColor="#D4AF37"
                            maximumTrackTintColor="#E5E5EA"
                            thumbTintColor="#D4AF37"
                        />
                    </View>

                     {/* --- STATUS --- */}
                     <View style={styles.divider} />
                     
                     <View style={styles.toggleRow}>
                        <View style={styles.toggleTextContainer}>
                            <View style={styles.toggleIcon}>
                                <Ionicons name="shield-checkmark" size={18} color="#D4AF37" />
                            </View>
                            <Text style={styles.toggleLabel}>Verified Profiles Only</Text>
                        </View>
                        <Switch
                            trackColor={{ false: "#E5E5EA", true: "#D4AF37" }}
                            thumbColor={"#FFF"}
                            ios_backgroundColor="#E5E5EA"
                            onValueChange={setVerified}
                            value={verified}
                        />
                     </View>

                     <View style={styles.toggleRow}>
                         <View style={styles.toggleTextContainer}>
                             <View style={styles.toggleIcon}>
                                 <Ionicons name="star" size={18} color="#D4AF37" />
                             </View>
                             <Text style={styles.toggleLabel}>Premium Members Only</Text>
                        </View>
                        <Switch
                            trackColor={{ false: "#E5E5EA", true: "#D4AF37" }}
                            thumbColor={"#FFF"}
                            ios_backgroundColor="#E5E5EA"
                            onValueChange={setPremium}
                            value={premium}
                        />
                     </View>
                     
                     <View style={styles.divider} />

                    {/* --- LIFESTYLE --- */}
                    <View style={styles.section}>
                        {renderSectionHeader("Education", "school")}
                        {renderChips(EDUCATION_OPTIONS, education, setEducation)}
                    </View>
                    
                    <View style={styles.section}>
                        {renderSectionHeader("Vices", "beer-outline")}
                        <Text style={styles.miniHeader}>Drinking</Text>
                        {renderChips(DRINKING_OPTIONS, drinking, setDrinking)}
                         <View style={{height: 12}}/>
                        <Text style={styles.miniHeader}>Smoking</Text>
                        {renderChips(SMOKING_OPTIONS, smoking, setSmoking)}
                    </View>

                    <View style={styles.section}>
                         {renderSectionHeader("Family Plans", "home")}
                         {renderChips(KIDS_OPTIONS, kids, setKids)}
                    </View>

                     <View style={styles.section}>
                         {renderSectionHeader("Religion", "earth-outline")}
                         {renderChips(RELIGION_OPTIONS, religion, setReligion)}
                    </View>


                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.footer}>
                     <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                        <Text style={styles.resetButtonText}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                        <Text style={styles.applyButtonText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>

             </Animated.View>
        </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
      ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
      backgroundColor: "#fff",
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      height: "90%",
      width: "100%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
  },
  handleContainer: {
      alignItems: "center",
      paddingVertical: 12,
  },
  handle: {
      width: 40,
      height: 4,
      backgroundColor: "#E5E5EA",
      borderRadius: 2,
  },
  header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: "#F2F2F7",
  },
  headerTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: "#000",
  },
  closeButton: {
      padding: 4,
  },
  closeIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#F2F2F7",
      justifyContent: "center",
      alignItems: "center",
  },
  scrollContent: {
      padding: 24,
      paddingBottom: 100, // Space for footer
  },
  section: {
      marginBottom: 28,
  },
  sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 10,
  },
  sectionIconContainer: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: theme.colors.glass.background,
      justifyContent: 'center',
      alignItems: 'center',
  },
  sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#000",
  },
  sliderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
  },
  sliderLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.primary,
  },
  slider: {
      width: '100%',
      height: 40,
  },
  dualSliderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
  },
  halfSlider: {
      flex: 1,
      height: 40,
  },
  subLabel: {
      fontSize: 12,
      color: '#666',
      width: 25,
  },
  // Toggles
  divider: {
      height: 1,
      backgroundColor: '#F2F2F7',
      marginVertical: 16,
  },
  toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
      paddingVertical: 4,
  },
  toggleTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  toggleIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(212, 175, 55, 0.1)", // Gold with opacity
      justifyContent: 'center',
      alignItems: 'center',
  },
  toggleLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
  },
  // Chips
  chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
  },
  chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: "#F8F8FA",
      borderWidth: 1,
      borderColor: "#E5E5EA",
  },
  chipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
  },
  chipText: {
      fontSize: 14,
      fontWeight: '500',
      color: "#666",
  },
  chipTextActive: {
      color: "#FFF",
      fontWeight: '600',
  },
  miniHeader: {
      fontSize: 13,
      fontWeight: '600',
      color: '#999',
      marginBottom: 8,
      marginLeft: 4,
      textTransform: 'uppercase',
  },
  // Footer
  footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FFF',
      borderTopWidth: 1,
      borderTopColor: '#F2F2F7',
      padding: 20,
      paddingBottom: 34,
      flexDirection: 'row',
      gap: 16,
      alignItems: 'center',
  },
  resetButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: '#F2F2F7',
      alignItems: 'center',
  },
  resetButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#666',
  },
  applyButton: {
      flex: 2,
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: '#000',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
  },
  applyButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFF',
  },
});

export default FilterBottomSheet;
