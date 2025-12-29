import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PhotoItem = ({
  photo,
  position,
  isMain,
  photoSize,
  mandatoryPhotos,
  isUploading,
  uploading,
  onAddPhoto,
  onRemovePhoto,
  onSetToMain,
}) => {
  if (!photo) {
    return (
      <TouchableOpacity
        style={[
          styles.photoSlot,
          { width: photoSize, height: photoSize },
          isMain && styles.mainPhotoSlot,
        ]}
        onPress={() => onAddPhoto(position)}
        disabled={uploading}
      >
        {isUploading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Uploading...</Text>
          </View>
        ) : (
          <View style={styles.emptyPhotoContent}>
            <Ionicons name="add" size={32} color="#999999" />
            <Text style={styles.addPhotoText}>
              {isMain
                ? "Main"
                : position < mandatoryPhotos
                ? "Required"
                : "Optional"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.photoContainer,
        { width: photoSize, height: photoSize },
        isMain && styles.mainPhotoContainer,
      ]}
    >
      <Image
        source={{ uri: photo }}
        style={[styles.photo, { width: photoSize, height: photoSize }]}
      />

      {/* Loading Overlay */}
      {isUploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}

      {isMain && (
        <View style={styles.mainPhotoBadge}>
          <View style={styles.mainPhotoBadgeInner}>
            <Ionicons name="star" size={12} color="#000000" />
            <Text style={styles.mainPhotoText}>Main</Text>
          </View>
        </View>
      )}
      {!isUploading && (
        <>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemovePhoto(position)}
            disabled={uploading}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
          </TouchableOpacity>
          {!isMain && (
            <TouchableOpacity
              style={styles.setToMainButton}
              onPress={() => onSetToMain(position)}
              disabled={uploading}
            >
              <View style={styles.setToMainButtonInner}>
                <Ionicons name="star" size={10} color="#000000" />
                <Text style={styles.setToMainText}>Set to Main</Text>
              </View>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  photoSlot: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D0D0D0",
    borderStyle: "dashed",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mainPhotoSlot: {
    borderColor: "#000",
    borderWidth: 2,
  },
  emptyPhotoContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoText: {
    fontSize: 10,
    color: "#666666",
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#666666",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "500",
  },
  photoContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  mainPhotoContainer: {
    borderWidth: 2,
    borderColor: "#000",
    alignItems: "center",
  },
  photo: {
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
  },
  mainPhotoBadge: {
    position: "absolute",
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  mainPhotoBadgeInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D4AF37",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: "center",
  },
  mainPhotoText: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "700",
  },
  removeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#000",
    borderRadius: 10,
  },
  setToMainButton: {
    position: "absolute",
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  setToMainButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D4AF37",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 3,
    alignSelf: "center",
  },
  setToMainText: {
    color: "#000000",
    fontSize: 9,
    fontWeight: "700",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  uploadingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
});

export default PhotoItem;

