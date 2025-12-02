import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const AudioMessage = ({ audioUrl, duration, isMine }) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const playSound = async () => {
    try {
      if (!audioUrl) {
        console.warn('Audio URL is missing');
        return;
      }

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
        { shouldPlay: true, rate: playbackRate },
        (status) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis / 1000);
            setPlaybackDuration(status.durationMillis / 1000);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlaybackPosition(0);
            }
          }
        }
      );
      
      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing sound:', error);
      setIsPlaying(false);
    }
  };

  const stopSound = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const seekToPosition = async (position) => {
    if (sound) {
      await sound.setPositionAsync(position * 1000);
      setPlaybackPosition(position);
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
    const { locationX } = evt.nativeEvent;
    // approximate width 250
    const newPosition = (locationX / 250) * playbackDuration;
    seekToPosition(Math.max(0, Math.min(newPosition, playbackDuration)));
  };

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const formatAudioTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

  return (
    <View style={[
      styles.audioMessageContainer,
      isMine ? styles.audioMessageMine : styles.audioMessageTheirs
    ]}>
      <TouchableOpacity 
        onPress={isPlaying ? stopSound : playSound}
        style={[
          styles.audioPlayButton,
          isMine ? styles.audioPlayButtonMine : styles.audioPlayButtonTheirs
        ]}
      >
        <Ionicons 
          name={isPlaying ? "pause" : "play"} 
          size={20} 
          color={isMine ? "#FFF" : "#000"} 
        />
      </TouchableOpacity>

      <View style={styles.audioContent}>
        <TouchableOpacity 
          style={styles.audioWaveformContainer}
          onPress={handleProgressTap}
          activeOpacity={0.7}
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
        
        <View style={styles.audioControls}>
          <Text style={[
            styles.audioTime,
            isMine ? styles.audioTimeMine : styles.audioTimeTheirs
          ]}>
            {isPlaying ? formatAudioTime(playbackPosition) : formatAudioTime(playbackDuration)}
          </Text>
          
          <TouchableOpacity 
            onPress={togglePlaybackRate}
            style={styles.speedButton}
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
