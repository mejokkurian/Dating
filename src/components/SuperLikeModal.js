import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Keyboard,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Predefined floating sparkles so random values don't regenerate on re-render
const SPARKLES = [
  { top: 28, left: 28, size: 6, delay: 0, duration: 2800 },
  { top: 55, right: 36, size: 9, delay: 400, duration: 2200 },
  { top: 80, left: 90, size: 5, delay: 800, duration: 3000 },
  { top: 18, right: 90, size: 7, delay: 200, duration: 2600 },
  { top: 70, right: 130, size: 5, delay: 600, duration: 2400 },
  { top: 40, left: 160, size: 8, delay: 1000, duration: 2000 },
];

const FloatingStar = ({ sparkle }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(sparkle.delay),
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0.85,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: -18,
            duration: sparkle.duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const posStyle = {
    position: "absolute",
    top: sparkle.top,
    ...(sparkle.left !== undefined
      ? { left: sparkle.left }
      : { right: sparkle.right }),
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        posStyle,
        { opacity: opacityAnim, transform: [{ translateY: floatAnim }] },
      ]}
    >
      <Ionicons name="star" size={sparkle.size} color="#D4AF37" />
    </Animated.View>
  );
};

const SuperLikeModal = ({ visible, profile, onClose, onSend }) => {
  const [comment, setComment] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardWillHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.55)).current;
  const starGlow = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef(null);
  const glowLoopRef = useRef(null);

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      scaleAnim.setValue(0.92);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseScale, {
              toValue: 1.22,
              duration: 1100,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 1100,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseScale, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.55,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(200),
        ]),
      );
      pulseLoopRef.current.start();

      glowLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(starGlow, {
            toValue: 1.25,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(starGlow, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      );
      glowLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      glowLoopRef.current?.stop();
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);
    await onSend(profile, comment);
    setComment("");
    setIsSending(false);
    handleClose();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setComment("");
      onClose();
    });
  };

  if (!profile) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Dimmed backdrop */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View style={styles.backdropDim} />
        </TouchableOpacity>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          style={styles.kavWrapper}
        >
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
            ]}
          >
            {/* Sheet background */}
            <LinearGradient
              colors={["#1C1506", "#0C0C0C", "#111008"]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 30 }]}
            />

            {/* Top shimmer border */}
            <LinearGradient
              colors={[
                "transparent",
                "#B8952A",
                "#F2C94C",
                "#D4AF37",
                "#B8952A",
                "transparent",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.topGoldLine}
            />

            {/* Floating sparkle particles */}
            {SPARKLES.map((s, i) => (
              <FloatingStar key={i} sparkle={s} />
            ))}

            {/* Pull handle */}
            <View style={styles.handleRow}>
              <LinearGradient
                colors={["#6B5010", "#D4AF37", "#6B5010"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.handle}
              />
            </View>

            <View style={styles.content}>
              {/* ── Header ── */}
              <View style={styles.header}>
                <Animated.View style={{ transform: [{ scale: starGlow }] }}>
                  <Ionicons
                    name="star"
                    size={22}
                    color="#D4AF37"
                    style={styles.headerStarGlow}
                  />
                </Animated.View>
                <Text style={styles.headerTitle}>Adore</Text>
                <Animated.View style={{ transform: [{ scale: starGlow }] }}>
                  <Ionicons
                    name="star"
                    size={22}
                    color="#D4AF37"
                    style={styles.headerStarGlow}
                  />
                </Animated.View>
              </View>

              {/* ── Profile (hidden when keyboard is open) ── */}
              {!keyboardVisible && (
                <View style={styles.profileSection}>
                  <View style={styles.imageWrapper}>
                    {/* Pulsing ring */}
                    {/* <Animated.View
                      style={[
                        styles.pulseRing,
                        {
                          transform: [{ scale: pulseScale }],
                          opacity: pulseOpacity,
                        },
                      ]}
                    /> */}
                    {/* Gold gradient ring */}
                    <LinearGradient
                      colors={["#F2C94C", "#D4AF37", "#8B6914", "#F2C94C"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.goldRing}
                    >
                      <Image
                        source={{
                          uri:
                            profile.photos && profile.photos.length > 0
                              ? profile.photos[profile.mainPhotoIndex ?? 0] ||
                                profile.photos[0]
                              : null,
                        }}
                        style={styles.profileImage}
                      />
                    </LinearGradient>
                    {/* Star badge */}
                    <LinearGradient
                      colors={["#F2C94C", "#B8952A"]}
                      style={styles.badgeIcon}
                    >
                      <Ionicons name="star" size={11} color="#1A1209" />
                    </LinearGradient>
                  </View>

                  <Text style={styles.profileName}>
                    {profile.name || profile.displayName}, {profile.age}
                  </Text>
                  <Text style={styles.profileSubtext}>
                    You're one of their top picks ✨
                  </Text>
                </View>
              )}

              {/* ── Input ── */}
              <LinearGradient
                colors={["#D4AF37", "#6B5010", "#D4AF37"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputBorderGradient}
              >
                <View style={styles.inputInner}>
                  <TextInput
                    style={styles.input}
                    placeholder="Write something memorable..."
                    placeholderTextColor="#4A4030"
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    maxLength={140}
                    returnKeyType="done"
                    blurOnSubmit
                  />
                </View>
              </LinearGradient>
              <Text style={styles.charCount}>{comment.length} / 140</Text>

              {/* ── Buttons ── */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSend}
                  disabled={isSending}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={
                      isSending
                        ? ["#8B6914", "#6B5010"]
                        : ["#F2C94C", "#D4AF37", "#B8952A"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendGradient}
                  >
                    {isSending ? (
                      <Text style={styles.sendText}>Sending...</Text>
                    ) : (
                      <>
                        {/* <Ionicons
                          name="star"
                          size={15}
                          color="#1A1209"
                          style={{ marginRight: 5 }}
                        /> */}
                        <Text style={styles.sendText}>Adore</Text>
                        <Ionicons
                          name="heart"
                          size={15}
                          color="#1A1209"
                          style={{ marginLeft: 5 }}
                        />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropDim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  kavWrapper: {
    width: "100%",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "92%",
    alignSelf: "center",
    marginBottom: Platform.OS === "ios" ? 34 : 20,
    borderRadius: 30,
    overflow: "hidden",
    // Gold shadow
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 24,
  },
  topGoldLine: {
    height: 1.5,
    width: "100%",
  },
  handleRow: {
    alignItems: "center",
    paddingVertical: 13,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F2C94C",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(212,175,55,0.6)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  headerStarGlow: {
    textShadowColor: "rgba(242,201,76,0.9)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 22,
  },
  imageWrapper: {
    position: "relative",
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: "#D4AF37",
  },
  goldRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  profileImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  badgeIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0C0C0C",
  },
  profileName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#F5E9C4",
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  profileSubtext: {
    fontSize: 13,
    color: "#8A7A50",
    fontWeight: "500",
  },
  inputBorderGradient: {
    width: "100%",
    borderRadius: 16,
    padding: 1.5,
    marginBottom: 6,
  },
  inputInner: {
    backgroundColor: "#161208",
    borderRadius: 15,
    padding: 14,
    minHeight: 80,
  },
  input: {
    fontSize: 14,
    color: "#E8D9A0",
    textAlignVertical: "top",
    minHeight: 52,
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: "#5A4D2E",
    marginBottom: 20,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    height: 54,
  },
  cancelButton: {
    flex: 1,
    height: "100%",
    borderRadius: 27,
    backgroundColor: "#1E1A10",
    borderWidth: 1,
    borderColor: "#3A3020",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#8A7A50",
    fontWeight: "600",
    fontSize: 14,
  },
  sendButton: {
    flex: 1.7,
    height: "100%",
    borderRadius: 27,
    overflow: "hidden",
    // Glow shadow on the send button
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  sendGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: {
    color: "#1A1209",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.5,
    marginRight: 5,
  },
});

export default SuperLikeModal;
