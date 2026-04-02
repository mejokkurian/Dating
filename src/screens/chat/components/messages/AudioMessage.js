import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const AudioMessage = ({ audioUrl, duration, isMine, onLongPress }) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const progressBarRef = useRef(null);
  const updateIntervalRef = useRef(null);

  const playSound = async () => {
    try {
      if (!audioUrl) {
        setError('Audio URL is missing');
        if (__DEV__) {
          console.warn('Audio URL is missing');
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      if (sound) {
        await sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, rate: playbackRate }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      setIsLoading(false);

      // Set up status update listener
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (!isSeeking) {
            setPlaybackPosition(status.positionMillis / 1000);
          }
          if (status.durationMillis) {
            setPlaybackDuration(status.durationMillis / 1000);
          }
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlaybackPosition(0);
            if (updateIntervalRef.current) {
              clearInterval(updateIntervalRef.current);
            }
          }
        } else if (status.error) {
          setError('Failed to load audio');
          setIsPlaying(false);
          setIsLoading(false);
        }
      });

      // Start interval to update position (backup for status updates)
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      updateIntervalRef.current = setInterval(async () => {
        if (newSound && !isSeeking) {
          try {
            const status = await newSound.getStatusAsync();
            if (status.isLoaded) {
              if (status.isPlaying) {
                setPlaybackPosition(status.positionMillis / 1000);
              }
              if (status.durationMillis) {
                setPlaybackDuration(status.durationMillis / 1000);
              }
            }
          } catch (e) {
            // Ignore errors during status check
          }
        }
      }, 200);
    } catch (error) {
      if (__DEV__) {
        console.error('Error playing sound:', error);
      }
      setError('Failed to play audio');
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const stopSound = async () => {
    if (sound) {
      try {
        await sound.pauseAsync();
        setIsPlaying(false);
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Error pausing sound:', error);
        }
      }
    }
  };


  const seekToPosition = async (position) => {
    if (sound) {
      try {
        setIsSeeking(true);
        await sound.setPositionAsync(position * 1000);
        setPlaybackPosition(position);
        setSeekPosition(position);
        setTimeout(() => setIsSeeking(false), 100);
      } catch (error) {
        if (__DEV__) {
          console.error('Error seeking:', error);
        }
        setIsSeeking(false);
      }
    }
  };

  const togglePlaybackRate = async () => {
    const rates = [1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    
    if (sound) {
      await sound.setRateAsync(nextRate, true);
    }
  };

  const handleProgressTap = (evt) => {
    if (!progressBarRef.current) return;
    progressBarRef.current.measure((x, y, width) => {
      const { locationX } = evt.nativeEvent;
      const newPosition = (locationX / width) * playbackDuration;
      seekToPosition(Math.max(0, Math.min(newPosition, playbackDuration)));
    });
  };

  // Pan responder for drag-to-seek
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsSeeking(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (progressBarRef.current) {
          progressBarRef.current.measure((x, y, width) => {
            const newPosition = Math.max(
              0,
              Math.min(
                playbackDuration,
                (gestureState.moveX / width) * playbackDuration
              )
            );
            setSeekPosition(newPosition);
          });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (progressBarRef.current) {
          progressBarRef.current.measure((x, y, width) => {
            const newPosition = Math.max(
              0,
              Math.min(
                playbackDuration,
                (gestureState.moveX / width) * playbackDuration
              )
            );
            seekToPosition(newPosition);
          });
        }
      },
    })
  ).current;

  // Initialize duration from prop
  useEffect(() => {
    if (duration && duration > 0 && playbackDuration === 0) {
      setPlaybackDuration(duration);
    }
  }, [duration]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [sound]);

  const formatAudioTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPosition = isSeeking ? seekPosition : playbackPosition;
  const progress = playbackDuration > 0 ? currentPosition / playbackDuration : 0;

  if (error) {
    return (
      <View style={[
        styles.audioMessageContainer,
        isMine ? styles.audioMessageMine : styles.audioMessageTheirs,
        styles.errorContainer
      ]}>
        <Ionicons 
          name="alert-circle" 
          size={20} 
          color={isMine ? "#FF6B6B" : "#FF4444"} 
        />
        <Text style={[
          styles.errorText,
          isMine ? styles.errorTextMine : styles.errorTextTheirs
        ]}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.audioMessageContainer,
      isMine ? styles.audioMessageMine : styles.audioMessageTheirs
    ]}>
      <TouchableOpacity 
        onPress={isPlaying ? stopSound : playSound}
        style={[
          styles.audioPlayButton,
          isMine ? styles.audioPlayButtonMine : styles.audioPlayButtonTheirs,
          isLoading && styles.audioPlayButtonLoading
        ]}
        disabled={isLoading}
        accessible={true}
        accessibilityLabel={isPlaying ? "Pause audio" : "Play audio"}
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator 
            size="small" 
            color={isMine ? "#FFF" : "#000"} 
          />
        ) : (
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={20} 
            color={isMine ? "#FFF" : "#000"} 
          />
        )}
      </TouchableOpacity>

      <View style={styles.audioContent}>
        <View
          ref={progressBarRef}
          style={styles.audioWaveformContainer}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleProgressTap}
            onLongPress={() => {
              if (__DEV__) {
                console.log('AudioMessage onLongPress fired');
              }
              if (onLongPress) onLongPress();
            }}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel={`Audio progress: ${formatAudioTime(currentPosition)} of ${formatAudioTime(playbackDuration)}`}
            accessibilityRole="slider"
            accessibilityValue={{
              min: 0,
              max: playbackDuration,
              now: currentPosition,
            }}
          >
            <View style={styles.audioProgressBackground} />
            <View 
              style={[
                styles.audioProgressFill,
                { 
                  width: `${progress * 100}%`,
                  backgroundColor: isMine ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)'
                }
              ]} 
            />
            {/* Seek indicator */}
            {isSeeking && (
              <View 
                style={[
                  styles.seekIndicator,
                  { 
                    left: `${progress * 100}%`,
                    backgroundColor: isMine ? '#FFF' : '#000',
                  }
                ]} 
              />
            )}
            <View style={styles.audioWaveform}>
              {[3, 5, 4, 6, 3, 5, 7, 4, 5, 3, 6, 4, 5, 3, 7, 5, 4, 6].map((height, index) => (
                <View
                  key={index}
                  style={[
                    styles.audioBar,
                    { 
                      height: `${height * 10}%`,
                      backgroundColor: isMine ? '#FFF' : '#000',
                      opacity: (index / 18) < progress ? 0.8 : 0.3
                    }
                  ]}
                />
              ))}
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.audioControls}>
          <View style={styles.timeContainer}>
            <Text style={[
              styles.audioTime,
              isMine ? styles.audioTimeMine : styles.audioTimeTheirs
            ]}>
              {formatAudioTime(currentPosition)}
            </Text>
            <Text style={[
              styles.audioTime,
              isMine ? styles.audioTimeMine : styles.audioTimeTheirs,
              styles.audioTimeSeparator
            ]}>
              {' / '}
            </Text>
            <Text style={[
              styles.audioTime,
              isMine ? styles.audioTimeMine : styles.audioTimeTheirs,
              styles.audioTimeTotal
            ]}>
              {formatAudioTime(playbackDuration)}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={togglePlaybackRate}
            style={styles.speedButton}
            accessible={true}
            accessibilityLabel={`Playback speed: ${playbackRate}x`}
            accessibilityRole="button"
          >
            <Text style={[
              styles.speedText,
              isMine ? styles.speedTextMine : styles.speedTextTheirs
            ]}>
              {playbackRate}x
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  audioMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    minWidth: 250,
    maxWidth: 300,
  },
  audioMessageMine: {
    backgroundColor: '#000',
  },
  audioMessageTheirs: {
    backgroundColor: '#F0F0F0',
  },
  audioPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  audioPlayButtonMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  audioPlayButtonTheirs: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  audioPlayButtonLoading: {
    opacity: 0.6,
  },
  controlButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  errorContainer: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorTextMine: {
    color: '#FF6B6B',
  },
  errorTextTheirs: {
    color: '#FF4444',
  },
  audioContent: {
    flex: 1,
  },
  audioWaveformContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  audioProgressBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    bottom: 8,
  },
  audioProgressFill: {
    position: 'absolute',
    left: 0,
    height: 2,
    bottom: 8,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  audioBar: {
    width: 2,
    borderRadius: 1,
  },
  audioControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioTimeSeparator: {
    opacity: 0.5,
  },
  audioTimeTotal: {
    opacity: 0.7,
  },
  seekIndicator: {
    position: 'absolute',
    width: 4,
    height: 40,
    borderRadius: 2,
    marginLeft: -2,
    top: 0,
    opacity: 0.8,
  },
  audioTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  audioTimeMine: {
    color: '#FFF',
  },
  audioTimeTheirs: {
    color: '#666',
  },
  speedButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  speedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  speedTextMine: {
    color: '#FFF',
  },
  speedTextTheirs: {
    color: '#666',
  },
});

export default AudioMessage;
