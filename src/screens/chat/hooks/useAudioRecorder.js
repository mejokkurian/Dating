import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import api from '../../../services/api/config';

const useAudioRecorder = (userId, onRecordingStateChange) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [slideX, setSlideX] = useState(0);

  const recordingRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const isRecordingOperationInProgress = useRef(false);
  const micPressStart = useRef({ x: 0, y: 0, time: 0 });
  const hasStartedRecording = useRef(false);
  const slideXRef = useRef(0); // Track current slideX value
  const recordingContainerTouchStart = useRef({ x: 0, y: 0 }); // Track initial touch position for recording container

  const startRecording = async () => {
    if (isRecordingOperationInProgress.current) {
      return;
    }

    // Clear any existing interval immediately
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    isRecordingOperationInProgress.current = true;

    try {
      // Clean up any existing recording first
      const existingRecording = recordingRef.current || recording;
      if (existingRecording) {
        try {
          const status = await existingRecording.getStatusAsync();
          if (status.isRecording) {
            await existingRecording.stopAndUnloadAsync();
          } else {
            await existingRecording.unloadAsync();
          }
        } catch (e) {
          console.warn('Error cleaning up previous recording:', e);
          try {
            await existingRecording.unloadAsync();
          } catch (e2) {
            console.warn('Force unload also failed:', e2);
          }
        }
        setRecording(null);
        recordingRef.current = null;
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
        isRecordingOperationInProgress.current = false;
        return;
      }

      // Reset audio mode first
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.warn('Error resetting audio mode:', e);
      }

      // Set recording mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      recordingRef.current = newRecording;
      setIsRecording(true);
      setRecordingDuration(0);
      setSlideX(0);
      slideXRef.current = 0; // Reset ref as well

      const startTime = Date.now();
      recordingIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
      }, 100);

      isRecordingOperationInProgress.current = false;
      if (onRecordingStateChange) {
        onRecordingStateChange(userId, true);
      }
    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      
      if (err.code === 'E_AUDIO_RECORDERNOTCREATED' || 
          err.message?.includes('recorder not prepared') ||
          err.message?.includes('0 ch')) {
        Alert.alert(
          'No Microphone Available',
          'Unable to access a microphone. Please ensure:\n\n• Your device has a microphone\n• Microphone permissions are granted\n• On Mac: Connect AirPods or external microphone\n• The microphone is not being used by another app',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Recording Failed',
          'Failed to start recording: ' + err.message,
          [{ text: 'OK' }]
        );
      }
      
      setIsRecording(false);
      setRecording(null);
      recordingRef.current = null;
      isRecordingOperationInProgress.current = false;
    }
  };

  const stopRecording = async () => {
    if (!recording || !isRecording) {
      return null;
    }

    if (isRecordingOperationInProgress.current) {
      return;
    }

    isRecordingOperationInProgress.current = true;
    setIsRecording(false);
    
    if (onRecordingStateChange) {
      onRecordingStateChange(userId, false);
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    const finalDuration = recordingDuration;

    if (finalDuration < 1) {
      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch (error) {
        console.error('Error cancelling short recording:', error);
      }
      
      setRecording(null);
      setRecordingDuration(0);
      recordingRef.current = null;
      setSlideX(0);
      isRecordingOperationInProgress.current = false;
      
      Alert.alert('Recording Too Short', 'Please hold to record for at least 1 second.');
      return null;
    }

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      
      const uri = recording.getURI();



      setRecording(null);
      setRecordingDuration(0);
      recordingRef.current = null;
      setSlideX(0);
      isRecordingOperationInProgress.current = false;

      return {
        uri,
        duration: finalDuration,
      };
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Failed to send audio message: ' + error.message);
      setRecording(null);
      setRecordingDuration(0);
      recordingRef.current = null;
      setSlideX(0);
      isRecordingOperationInProgress.current = false;
      return null;
    }
  };

  const cancelRecording = async () => {
    if (!recording || !isRecording) {
      return;
    }

    if (isRecordingOperationInProgress.current) {
      return;
    }

    isRecordingOperationInProgress.current = true;
    setIsRecording(false);
    
    if (onRecordingStateChange) {
      onRecordingStateChange(userId, false);
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      
      setRecording(null);
      setRecordingDuration(0);
      recordingRef.current = null;
      setSlideX(0);
      isRecordingOperationInProgress.current = false;
    } catch (error) {
      console.error('Error cancelling recording:', error);
      setRecording(null);
      setRecordingDuration(0);
      recordingRef.current = null;
      setSlideX(0);
      isRecordingOperationInProgress.current = false;
    }
  };

  const handleMicPressIn = (evt) => {
    micPressStart.current = {
      x: evt.nativeEvent.pageX,
      y: evt.nativeEvent.pageY,
      time: Date.now(),
    };
    hasStartedRecording.current = false;
    
    setTimeout(() => {
      if (micPressStart.current.time > 0) {
        startRecording();
        hasStartedRecording.current = true;
      }
    }, 200);
  };

  const handleMicMove = (evt) => {
    // Only track movement when NOT recording (for initial mic button press)
    if (isRecording || !hasStartedRecording.current) return;
    
    const currentX = evt.nativeEvent.pageX;
    const deltaX = currentX - micPressStart.current.x;
    
    if (deltaX < 0) {
      const newSlideX = Math.max(-150, deltaX);
      setSlideX(newSlideX);
      slideXRef.current = newSlideX; // Update ref
    }
  };

  // Handler for recording container touch start (only tracks initial position, doesn't start new recording)
  const handleRecordingContainerStart = (evt) => {
    if (!isRecording) return;
    
    recordingContainerTouchStart.current = {
      x: evt.nativeEvent.pageX,
      y: evt.nativeEvent.pageY,
    };
    setSlideX(0);
    slideXRef.current = 0;
  };

  // Handler for recording container move (only tracks swipe when recording is active)
  const handleRecordingContainerMove = (evt) => {
    if (!isRecording) return;
    
    const currentX = evt.nativeEvent.pageX;
    const deltaX = currentX - recordingContainerTouchStart.current.x;
    
    if (deltaX < 0) {
      const newSlideX = Math.max(-150, deltaX);
      setSlideX(newSlideX);
      slideXRef.current = newSlideX; // Update ref
    } else {
      // Reset if swiped right
      setSlideX(0);
      slideXRef.current = 0;
    }
  };

  // Handler for recording container touch end (cancels if swiped left, sends if not)
  const handleRecordingContainerEnd = (onSend) => {
    if (!isRecording) return;
    
    const currentSlideX = slideXRef.current;
    if (currentSlideX <= -60) {
      // Swiped left enough to cancel
      cancelRecording();
    } else {
      // Send the recording
      stopRecording().then(result => {
        if (result && onSend) {
          onSend(result);
        }
      });
    }
    
    // Reset touch start
    recordingContainerTouchStart.current = { x: 0, y: 0 };
    setSlideX(0);
    slideXRef.current = 0;
  };

  const handleMicPressOut = (onSend, showHint) => {
    const pressDuration = Date.now() - micPressStart.current.time;
    
    micPressStart.current = { x: 0, y: 0, time: 0 };
    
    if (!hasStartedRecording.current || pressDuration < 200) {
      if (isRecording) {
        cancelRecording();
      }
      if (showHint) showHint();
      hasStartedRecording.current = false;
      return;
    }
    
    if (slideX < -100) {
      cancelRecording();
    } else if (isRecording) {
      stopRecording().then(result => {
        if (result && onSend) {
          onSend(result);
        }
      });
    }
    
    hasStartedRecording.current = false;
  };

  return {
    isRecording,
    recordingDuration,
    slideX,
    slideXRef, // Export ref for checking current value
    startRecording,
    stopRecording,
    cancelRecording,
    handleMicPressIn,
    handleMicMove,
    handleMicPressOut,
    handleRecordingContainerStart,
    handleRecordingContainerMove,
    handleRecordingContainerEnd,
  };
};

export default useAudioRecorder;
