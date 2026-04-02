import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../styles';

const ChatInput = ({
  isRecording,
  recordingDuration,
  slideX,
  slideXRef,
  inputText,
  handleTyping,
  handleSend,
  handleAudioSend,
  pickImage,
  setStickerPickerVisible,
  handleMicPressIn,
  handleMicMove,
  handleMicPressOut,
  handleRecordingContainerStart,
  handleRecordingContainerMove,
  handleRecordingContainerEnd,
  cancelRecording,
  stopRecording,
  showHoldToRecordHint,
  onAttachmentPress,
  disabled = false,
  isEditing = false,
}) => {
  const textInputRef = useRef(null);

  // Auto-focus input when editing starts
  useEffect(() => {
    if (isEditing && textInputRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  }, [isEditing]);

  return (
    <View style={styles.inputWrapper}>
      <View style={styles.inputContainer}>
        {/* Recording Mode - Full Width */}
        {isRecording ? (
          <>
            <Animated.View 
              style={[
                styles.recordingFullContainer,
                { transform: [{ translateX: slideX }] }
              ]}
              onTouchStart={handleRecordingContainerStart}
              onTouchMove={handleRecordingContainerMove}
              onTouchEnd={() => handleRecordingContainerEnd(handleAudioSend)}
            >
              <View style={styles.recordingLeftSide}>
                <Text style={[
                  styles.slideToCancel,
                  slideX < -60 && { color: '#FF4444', fontWeight: '700' }
                ]}>
                  {slideX < -60 ? '🗑️ Release to cancel' : '← Slide to cancel'}
                </Text>
                <View style={styles.recordingInfo}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTime}>
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              </View>
            </Animated.View>
            
            {/* Delete Button */}
            <TouchableOpacity 
              style={[styles.deleteButton, { marginLeft: 12 }]}
              onPress={cancelRecording}
            >
              <Ionicons name="trash-outline" size={24} color="#FF4444" />
            </TouchableOpacity>

            {/* Send Button */}
            <TouchableOpacity 
              style={[styles.sendButton, { marginLeft: 12 }]}
              onPress={() => {
                stopRecording().then((result) => {
                  if (result && handleAudioSend) {
                     handleAudioSend(result);
                  }
                });
              }}
            >
              <Ionicons name="send" size={24} color="#000" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity 
              onPress={onAttachmentPress} 
              style={[styles.cameraButton, disabled && { opacity: 0.5 }]}
              disabled={disabled}
            >
              <Ionicons name="add-circle-outline" size={28} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={pickImage} 
              style={[styles.cameraButton, disabled && { opacity: 0.5 }]}
              disabled={disabled}
            >
              <Ionicons name="camera" size={28} color="#000" />
            </TouchableOpacity>

            {/* Text Input with Sticker Icon Inside */}
            <View style={styles.textInputContainer}>
              <TextInput
                ref={textInputRef}
                style={[styles.input, disabled && { opacity: 0.5 }]}
                placeholder={isEditing ? "Edit message..." : "Message"}
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={handleTyping}
                multiline
                editable={!disabled}
                accessible={true}
                accessibilityLabel={isEditing ? "Edit message input" : "Message input"}
                accessibilityHint={isEditing ? "Edit your message here" : "Type your message here"}
              />
              <TouchableOpacity 
                onPress={() => setStickerPickerVisible(true)} 
                style={[styles.stickerButtonInside, disabled && { opacity: 0.5 }]}
                disabled={disabled}
              >
                <Ionicons name="albums-outline" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Send or Mic Button */}
            {inputText.trim().length > 0 ? (
              <TouchableOpacity 
                style={[styles.sendButton, disabled && { opacity: 0.5 }]} 
                onPress={() => handleSend()}
                disabled={disabled}
                accessible={true}
                accessibilityLabel="Send message"
                accessibilityHint="Tap to send your message"
                accessibilityRole="button"
              >
                <Ionicons name="send" size={24} color="#000" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPressIn={disabled ? undefined : handleMicPressIn}
                onPressOut={disabled ? undefined : () => handleMicPressOut(handleAudioSend, showHoldToRecordHint)}
                style={[styles.micButton, disabled && { opacity: 0.5 }]}
                disabled={disabled}
                accessible={true}
                accessibilityLabel="Record audio message"
                accessibilityHint="Press and hold to record an audio message"
                accessibilityRole="button"
              >
                <Ionicons name="mic" size={28} color="#000" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
};

export default ChatInput;
