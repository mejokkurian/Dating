import React from "react";
import { View, StyleSheet } from "react-native";
import PhotoItem from "./PhotoItem";

const PhotoGrid = ({
  photos,
  photoSize,
  mandatoryPhotos,
  uploadingPosition,
  uploading,
  onAddPhoto,
  onRemovePhoto,
  onSetToMain,
}) => {
  return (
    <View style={styles.photosGrid}>
      {photos.map((photo, index) => (
        <PhotoItem
          key={`photo-${index}-${photo ? "filled" : "empty"}`}
          photo={photo}
          position={index}
          isMain={index === 0}
          photoSize={photoSize}
          mandatoryPhotos={mandatoryPhotos}
          isUploading={uploadingPosition === index}
          uploading={uploading}
          onAddPhoto={onAddPhoto}
          onRemovePhoto={onRemovePhoto}
          onSetToMain={onSetToMain}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-start",
  },
});

export default PhotoGrid;

