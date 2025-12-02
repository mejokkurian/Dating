import React from 'react';
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
}) => {
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
              style={styles.deleteButton}
              onPress={cancelRecording}
            >
              <Ionicons name="trash-outline" size={24} color="#FF4444" />
            </TouchableOpacity>

            {/* Send Button */}
            <TouchableOpacity 
              style={styles.sendButton}
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
            <TouchableOpacity onPress={onAttachmentPress} style={styles.cameraButton}>
              <Ionicons name="add-circle-outline" size={28} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity onPress={pickImage} style={styles.cameraButton}>
              <Ionicons name="camera" size={28} color="#000" />
            </TouchableOpacity>

            {/* Text Input with Sticker Icon Inside */}
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Message"
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={handleTyping}
                multiline
              />
              <TouchableOpacity 
                onPress={() => setStickerPickerVisible(true)} 
                style={styles.stickerButtonInside}
              >
                <Ionicons name="albums-outline" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Send or Mic Button */}
            {inputText.trim().length > 0 ? (
              <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
                <Ionicons name="send" size={24} color="#000" />
              </TouchableOpacity>
            ) : (
              <View
                onTouchStart={handleMicPressIn}
                onTouchMove={handleMicMove}
                onTouchEnd={() => handleMicPressOut(handleAudioSend, showHoldToRecordHint)}
                style={styles.micButton}
              >
                <Ionicons name="mic" size={28} color="#000" />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

export default ChatInput;
