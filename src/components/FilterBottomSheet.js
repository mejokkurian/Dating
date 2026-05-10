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
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const GOLD = "#D4AF37";
const GOLD_LIGHT = "#F0D060";
const CARD = "#1E1E1E";
const TEXT_DIM = "#888";

const FilterBottomSheet = ({
  visible,
  filterState,
  onClose,
  onUpdateFilter,
}) => {
  const [distance, setDistance] = useState(50);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(35);
  const [heightMin, setHeightMin] = useState(140);
  const [verified, setVerified] = useState(false);
  const [premium, setPremium] = useState(false);

  const [education, setEducation] = useState([]);
  const [drinking, setDrinking] = useState([]);
  const [smoking, setSmoking] = useState([]);
  const [kids, setKids] = useState([]);
  const [religion, setReligion] = useState([]);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const EDUCATION_OPTIONS = ["High School", "Undergrad", "Postgrad", "PhD"];
  const DRINKING_OPTIONS = ["Socially", "Never", "Often"];
  const SMOKING_OPTIONS = ["Socially", "Never", "Regularly"];
  const KIDS_OPTIONS = ["Have kids", "Want kids", "Don't want", "Not sure"];
  const RELIGION_OPTIONS = ["Christian", "Muslim", "Jewish", "Hindu", "Atheist", "Spiritual", "Other"];

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
    onUpdateFilter({ distance, ageMin, ageMax, heightMin, verified, premium, education, drinking, smoking, kids, religion });
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
        const isVerticalDrag = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        const isDraggingDown = gestureState.dy > 0;
        return isVerticalDrag && isDraggingDown;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          handleClose();
        } else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
        }
      },
    })
  ).current;

  const combinedTranslateY = Animated.add(slideAnim, panY);

  const renderSectionHeader = (title, icon) => (
    <View style={styles.sectionHeader}>
      <LinearGradient
        colors={["rgba(212,175,55,0.25)", "rgba(212,175,55,0.08)"]}
        style={styles.sectionIconContainer}
      >
        <Ionicons name={icon} size={15} color={GOLD} />
      </LinearGradient>
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
            activeOpacity={0.75}
          >
            {isActive ? (
              <LinearGradient
                colors={[GOLD_LIGHT, GOLD]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
                borderRadius={20}
              />
            ) : null}
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: combinedTranslateY }] }]}>
          {/* Gold top glow line */}
          <LinearGradient
            colors={["rgba(212,175,55,0.5)", "transparent"]}
            style={styles.topGlowLine}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          />

          {/* Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.handleContainer}>
            <LinearGradient
              colors={[GOLD, GOLD_LIGHT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.handle}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerLabel}>DISCOVER</Text>
              <Text style={styles.headerTitle}>Filters</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.8}>
              <LinearGradient
                colors={["#2A2A2A", "#222"]}
                style={styles.closeIconCircle}
              >
                <Ionicons name="close" size={18} color="#DDD" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Distance */}
            <View style={styles.card}>
              {renderSectionHeader("Distance Preference", "location-sharp")}
              <View style={styles.sliderValueRow}>
                <Text style={styles.sliderValue}>Up to</Text>
                <Text style={styles.sliderValueHighlight}>{Math.round(distance)} km</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={100}
                step={1}
                value={distance}
                onValueChange={setDistance}
                minimumTrackTintColor={GOLD}
                maximumTrackTintColor="#2E2E2E"
                thumbTintColor={GOLD}
              />
            </View>

            {/* Age Range */}
            <View style={styles.card}>
              {renderSectionHeader("Age Range", "calendar")}
              <View style={styles.ageValuesRow}>
                <View style={styles.ageValueBox}>
                  <Text style={styles.ageValueLabel}>Min</Text>
                  <Text style={styles.ageValueNumber}>{Math.round(ageMin)}</Text>
                </View>
                <View style={styles.ageDash} />
                <View style={styles.ageValueBox}>
                  <Text style={styles.ageValueLabel}>Max</Text>
                  <Text style={styles.ageValueNumber}>{Math.round(ageMax)}</Text>
                </View>
              </View>
              <View style={styles.dualSliderContainer}>
                <Text style={styles.subLabel}>Min</Text>
                <Slider
                  style={styles.halfSlider}
                  minimumValue={18}
                  maximumValue={50}
                  step={1}
                  value={ageMin}
                  onValueChange={(val) => { if (val > ageMax) setAgeMax(val); setAgeMin(val); }}
                  minimumTrackTintColor={GOLD}
                  maximumTrackTintColor="#2E2E2E"
                  thumbTintColor={GOLD}
                />
                <Text style={styles.subLabel}>Max</Text>
                <Slider
                  style={styles.halfSlider}
                  minimumValue={18}
                  maximumValue={80}
                  step={1}
                  value={ageMax}
                  onValueChange={(val) => { if (val < ageMin) setAgeMin(val); setAgeMax(val); }}
                  minimumTrackTintColor={GOLD}
                  maximumTrackTintColor="#2E2E2E"
                  thumbTintColor={GOLD}
                />
              </View>
            </View>

            {/* Height */}
            <View style={styles.card}>
              {renderSectionHeader("Minimum Height", "resize")}
              <View style={styles.sliderValueRow}>
                <Text style={styles.sliderValue}>At least</Text>
                <Text style={styles.sliderValueHighlight}>{Math.round(heightMin)} cm</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={140}
                maximumValue={220}
                step={1}
                value={heightMin}
                onValueChange={setHeightMin}
                minimumTrackTintColor={GOLD}
                maximumTrackTintColor="#2E2E2E"
                thumbTintColor={GOLD}
              />
            </View>

            {/* Toggles */}
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setVerified(!verified)}
                activeOpacity={0.85}
              >
                <View style={styles.toggleLeft}>
                  <LinearGradient
                    colors={verified ? [GOLD_LIGHT, GOLD] : ["rgba(212,175,55,0.2)", "rgba(212,175,55,0.08)"]}
                    style={styles.toggleIconWrap}
                  >
                    <Ionicons name="shield-checkmark" size={17} color={verified ? "#000" : GOLD} />
                  </LinearGradient>
                  <View>
                    <Text style={styles.toggleLabel}>Verified Profiles Only</Text>
                    <Text style={styles.toggleSub}>Show ID-verified members</Text>
                  </View>
                </View>
                <Switch
                  trackColor={{ false: "#2E2E2E", true: GOLD }}
                  thumbColor={verified ? "#000" : "#888"}
                  ios_backgroundColor="#2E2E2E"
                  onValueChange={setVerified}
                  value={verified}
                />
              </TouchableOpacity>

              <View style={styles.cardDivider} />

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setPremium(!premium)}
                activeOpacity={0.85}
              >
                <View style={styles.toggleLeft}>
                  <LinearGradient
                    colors={premium ? [GOLD_LIGHT, GOLD] : ["rgba(212,175,55,0.2)", "rgba(212,175,55,0.08)"]}
                    style={styles.toggleIconWrap}
                  >
                    <Ionicons name="star" size={17} color={premium ? "#000" : GOLD} />
                  </LinearGradient>
                  <View>
                    <Text style={styles.toggleLabel}>Premium Members Only</Text>
                    <Text style={styles.toggleSub}>Exclusive subscriber profiles</Text>
                  </View>
                </View>
                <Switch
                  trackColor={{ false: "#2E2E2E", true: GOLD }}
                  thumbColor={premium ? "#000" : "#888"}
                  ios_backgroundColor="#2E2E2E"
                  onValueChange={setPremium}
                  value={premium}
                />
              </TouchableOpacity>
            </View>

            {/* Lifestyle */}
            <View style={styles.sectionGroupLabel}>
              <Text style={styles.sectionGroupText}>LIFESTYLE</Text>
              <View style={styles.sectionGroupLine} />
            </View>

            <View style={styles.card}>
              {renderSectionHeader("Education", "school")}
              {renderChips(EDUCATION_OPTIONS, education, setEducation)}
            </View>

            <View style={styles.card}>
              {renderSectionHeader("Vices", "beer-outline")}
              <Text style={styles.miniHeader}>Drinking</Text>
              {renderChips(DRINKING_OPTIONS, drinking, setDrinking)}
              <View style={{ height: 16 }} />
              <Text style={styles.miniHeader}>Smoking</Text>
              {renderChips(SMOKING_OPTIONS, smoking, setSmoking)}
            </View>

            <View style={styles.card}>
              {renderSectionHeader("Family Plans", "home")}
              {renderChips(KIDS_OPTIONS, kids, setKids)}
            </View>

            <View style={styles.card}>
              {renderSectionHeader("Religion", "earth-outline")}
              {renderChips(RELIGION_OPTIONS, religion, setReligion)}
            </View>

          </ScrollView>

          {/* Footer */}
          <LinearGradient
            colors={["rgba(14,14,14,0)", "#0E0E0E"]}
            style={styles.footerGradient}
            pointerEvents="none"
          />
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.8}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButtonWrap} onPress={handleApply} activeOpacity={0.85}>
              <LinearGradient
                colors={[GOLD_LIGHT, GOLD, "#B8922A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.applyButton}
              >
                <Ionicons name="checkmark" size={18} color="#000" style={{ marginRight: 6 }} />
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </LinearGradient>
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
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    backgroundColor: "#0E0E0E",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: "92%",
    width: "100%",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
  },
  topGlowLine: {
    position: "absolute",
    top: 0,
    left: "10%",
    right: "10%",
    height: 1,
    borderRadius: 1,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 14,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    opacity: 0.8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  closeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
    gap: 12,
  },
  // Cards
  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 14,
  },
  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  sectionIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.2,
  },
  // Slider values
  sliderValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 8,
  },
  sliderValue: {
    fontSize: 14,
    color: TEXT_DIM,
    fontWeight: "500",
  },
  sliderValueHighlight: {
    fontSize: 20,
    fontWeight: "800",
    color: GOLD,
    letterSpacing: -0.5,
  },
  slider: {
    width: "100%",
    height: 40,
    marginTop: -4,
  },
  // Age dual slider
  ageValuesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  ageValueBox: {
    flex: 1,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.15)",
  },
  ageValueLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  ageValueNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF",
  },
  ageDash: {
    width: 16,
    height: 2,
    backgroundColor: "rgba(212,175,55,0.3)",
    borderRadius: 1,
  },
  dualSliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  halfSlider: {
    flex: 1,
    height: 40,
  },
  subLabel: {
    fontSize: 11,
    color: TEXT_DIM,
    fontWeight: "600",
    width: 24,
  },
  // Toggles
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  toggleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 12,
    color: TEXT_DIM,
    fontWeight: "400",
  },
  // Section group
  sectionGroupLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sectionGroupText: {
    fontSize: 10,
    fontWeight: "700",
    color: GOLD,
    letterSpacing: 2,
  },
  sectionGroupLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(212,175,55,0.15)",
  },
  // Chips
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#252525",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  chipActive: {
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#888",
  },
  chipTextActive: {
    color: "#000",
    fontWeight: "700",
  },
  miniHeader: {
    fontSize: 10,
    fontWeight: "700",
    color: TEXT_DIM,
    marginBottom: 10,
    marginLeft: 2,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  // Footer
  footerGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    pointerEvents: "none",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 36,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#888",
  },
  applyButtonWrap: {
    flex: 2,
    borderRadius: 18,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
    letterSpacing: -0.2,
  },
});

export default FilterBottomSheet;
