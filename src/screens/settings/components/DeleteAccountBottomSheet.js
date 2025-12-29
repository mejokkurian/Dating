/**
 * Delete Account Confirmation Bottom Sheet
 * Requires user to type "DELETE" to confirm account deletion
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  PanResponder,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_SHEET_HEIGHT = 400;
const SWIPE_THRESHOLD = 50;

const DeleteAccountBottomSheet = ({ visible, onClose, onConfirm, loading }) => {
  const [deleteText, setDeleteText] = useState("");
  const [error, setError] = useState("");
  const translateY = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setDeleteText("");
      setError("");
      Keyboard.dismiss();
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: BOTTOM_SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        panY.setOffset(panY._value);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        panY.flattenOffset();
        if (gestureState.dy > SWIPE_THRESHOLD) {
          handleClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: BOTTOM_SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      panY.setValue(0);
      setDeleteText("");
      setError("");
      onClose();
    });
  };

  const handleConfirm = () => {
    if (deleteText.trim().toUpperCase() !== "DELETE") {
      setError('Please type "DELETE" to confirm');
      return;
    }

    setError("");
    onConfirm();
  };

  const animatedStyle = {
    transform: [
      {
        translateY: Animated.add(translateY, panY).interpolate({
          inputRange: [0, BOTTOM_SHEET_HEIGHT],
          outputRange: [0, BOTTOM_SHEET_HEIGHT],
          extrapolate: "clamp",
        }),
      },
    ],
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[styles.bottomSheet, animatedStyle]}
          {...panResponder.panHandlers}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="warning" size={32} color="#FF3B30" />
              </View>
              <Text style={styles.title}>Delete Account</Text>
              <Text style={styles.subtitle}>
                This action cannot be undone. All your data will be permanently
                deleted.
              </Text>
            </View>

            {/* Confirmation Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Type <Text style={styles.deleteWord}>DELETE</Text> to confirm:
              </Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                value={deleteText}
                onChangeText={(text) => {
                  setDeleteText(text);
                  setError("");
                }}
                placeholder='Type "DELETE"'
                placeholderTextColor="#999"
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus={true}
              />
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.deleteButton,
                  (deleteText.trim().toUpperCase() !== "DELETE" || loading) &&
                    styles.deleteButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={
                  deleteText.trim().toUpperCase() !== "DELETE" || loading
                }
              >
                {loading ? (
                  <Text style={styles.deleteButtonText}>Deleting...</Text>
                ) : (
                  <Text style={styles.deleteButtonText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  bottomSheet: {
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E5EA",
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFE5E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  deleteWord: {
    fontWeight: "800",
    color: "#FF3B30",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000",
    backgroundColor: "#F8F8F8",
  },
  inputError: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFF5F5",
  },
  errorText: {
    fontSize: 12,
    color: "#FF3B30",
    marginTop: 6,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
  },
  deleteButtonDisabled: {
    backgroundColor: "#FFB3B3",
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default DeleteAccountBottomSheet;





