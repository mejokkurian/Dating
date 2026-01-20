import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import api from './api/config';

/**
 * WebRTC Service
 * Manages peer-to-peer connections for audio and video calls
 */
class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.iceCandidatesQueue = [];
    
    // Reconnection tracking
    this.reconnectionAttempts = 0;
    this.maxReconnectionAttempts = 3;
    this.isReconnecting = false;
    this.onICERestartCallback = null;
    
    // Signaling robustness
    this.connectionId = null;

    // Network quality monitoring
    this.qualityMonitorInterval = null;
    this.qualityStats = {
      rtt: 0,
      packetLoss: 0,
      jitter: 0,
      bandwidth: 0,
      quality: 'good'
    };
    
    // Default STUN servers (TURN credentials will be fetched dynamically)
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10,
    };
  }

  /**
   * Fetch dynamic TURN credentials from API
   */
  async fetchTurnCredentials() {
    try {
      // api instance automatically handles Authorization header from AsyncStorage
      const response = await api.get('/chat/turn-credentials');
      
      const data = response.data;
      
      if (data && data.iceServers) {
        console.log('✅ Fetched dynamic TURN credentials');
        // Update configuration with fetched ICE servers
        this.configuration.iceServers = data.iceServers;
      }
    } catch (error) {
      console.error('Failed to fetch TURN credentials:', error);
      // Fallback to STUN only is automatic if TURN config is missing
    }
  }

  // To properly implement fetch, we need the auth token. 
  // Let's assume we can inject it or use an imported API client.

  /**
   * Generate unique connection ID to prevent race conditions
   */
  generateConnectionId() {
    this.connectionId = Math.random().toString(36).substr(2, 9);
    console.log('🔗 Generated new connection ID:', this.connectionId);
    return this.connectionId;
  }

  /**
   * Initialize local media stream (audio/video)
   * @param {boolean} video - Enable video
   * @param {boolean} audio - Enable audio
   */
  async getLocalStream(video = false, audio = true) {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: video ? {
          width: 640,
          height: 480,
          frameRate: 30,
        } : false,
      });
      
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw error;
    }
  }

  /**
   * Create peer connection
   */
  async createPeerConnection(onRemoteStream, onIceCandidate, onConnectionStateChange) { // Connection ID passed from CallModal if needed, but we generate it here
    // Fetch dynamic credentials first
    await this.fetchTurnCredentials();
    
    // Generate new connection ID for this session
    this.generateConnectionId();
    
    this.peerConnection = new RTCPeerConnection(this.configuration);

    // Add local stream tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        onRemoteStream(event.streams[0]);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate, this.connectionId);
      }
    };

    // CONNECTION STATE MONITORING (Production-grade)
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      
      const state = this.peerConnection.connectionState;
      console.log('📞 Connection state:', state);
      
      onConnectionStateChange?.(state);
      
      switch (state) {
        case 'connected':
          console.log('✅ Call connected successfully');
          this.reconnectionAttempts = 0;
          this.isReconnecting = false;
          break;
          
        case 'disconnected':
          console.log('⚠️ Connection disconnected, attempting recovery...');
          if (!this.isReconnecting) {
            this.handleDisconnection();
          }
          break;
          
        case 'failed':
          console.log('❌ Connection failed');
          if (this.reconnectionAttempts < this.maxReconnectionAttempts) {
            this.attemptICERestart();
          } else {
            console.log('❌ Max reconnection attempts reached');
            onConnectionStateChange?.('failed_permanent');
          }
          break;
          
        case 'closed':
          console.log('📞 Connection closed');
          this.cleanup();
          break;
      }
    };

    // ICE CONNECTION STATE MONITORING
    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) return;
      
      const state = this.peerConnection.iceConnectionState;
      console.log('🧊 ICE connection state:', state);
      
      if (state === 'failed' && !this.isReconnecting) {
        console.log('🔄 ICE failed, attempting restart...');
        this.attemptICERestart();
      }
    };

    return this.peerConnection;
  }

  /**
   * Create and return an offer
   */
  async createOffer() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.localStream?.getVideoTracks().length > 0,
      });

      if (!this.peerConnection) {
        throw new Error('Peer connection closed while creating offer');
      }

      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      if (!error.message.includes('Peer connection closed')) {
        console.error('Error creating offer:', error);
      }
      throw error;
    }
  }

  /**
   * Create and return an answer
   */
  async createAnswer() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const answer = await this.peerConnection.createAnswer();
      
      if (!this.peerConnection) {
        throw new Error('Peer connection closed while creating answer');
      }

      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (error) {
      if (!error.message.includes('Peer connection closed')) {
        console.error('Error creating answer:', error);
      }
      throw error;
    }
  }

  /**
   * Set remote description
   */
  async setRemoteDescription(sessionDescription) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(sessionDescription)
      );

      // Process queued ICE candidates
      while (this.iceCandidatesQueue.length > 0) {
        const candidate = this.iceCandidatesQueue.shift();
        await this.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error setting remote description:', error);
      throw error;
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      // Queue candidates if remote description not set yet
      if (!this.peerConnection.remoteDescription) {
        this.iceCandidatesQueue.push(candidate);
        return;
      }

      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
      throw error;
    }
  }

  /**
   * Toggle audio mute
   */
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggle video
   */
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Handle disconnection - wait for auto-recovery before ICE restart
   */
  handleDisconnection() {
    console.log('🔄 Connection disconnected, waiting 3s for auto-recovery...');
    this.isReconnecting = true;
    
    // Wait 3 seconds for auto-recovery
    setTimeout(() => {
      if (this.peerConnection?.connectionState === 'disconnected') {
        console.log('⚠️ Still disconnected after 3s, attempting ICE restart');
        this.attemptICERestart();
      } else {
        console.log('✅ Connection auto-recovered');
        this.isReconnecting = false;
      }
    }, 3000);
  }

  /**
   * Attempt ICE restart to recover connection
   */
  async attemptICERestart() {
    if (!this.peerConnection || this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      console.log('❌ Cannot restart ICE - max attempts reached or no peer connection');
      return;
    }

    this.reconnectionAttempts++;
    this.isReconnecting = true;
    
    console.log(`🔄 ICE restart attempt ${this.reconnectionAttempts}/${this.maxReconnectionAttempts}`);

    try {
      // Create new offer with ICE restart flag
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('✅ ICE restart offer created, sending to peer...');
      
      // Notify CallModal to send new offer via signaling
      this.onICERestartCallback?.(offer);
      
    } catch (error) {
      console.error('❌ ICE restart failed:', error);
      this.isReconnecting = false;
    }
  }

  /**
   * Set callback for ICE restart (to send new offer via signaling)
   */
  setICERestartCallback(callback) {
    this.onICERestartCallback = callback;
  }

  /**
   * Start network quality monitoring
   */
  startQualityMonitoring(onQualityChange) {
    if (this.qualityMonitorInterval) {
      clearInterval(this.qualityMonitorInterval);
    }

    this.qualityMonitorInterval = setInterval(async () => {
      if (!this.peerConnection) return;

      try {
        const stats = await this.peerConnection.getStats();
        const quality = this.analyzeStats(stats);
        
        // Only notify if quality changed
        if (quality.quality !== this.qualityStats.quality) {
          this.qualityStats = quality;
          onQualityChange?.(quality);
          
          console.log(`📊 Network quality: ${quality.quality} (RTT: ${quality.rtt}ms, Loss: ${quality.packetLoss}%)`);
          
          // Auto-adapt bitrate based on quality
          this.adaptToQuality(quality);
        }
      } catch (error) {
        console.error('Quality monitoring error:', error);
      }
    }, 2000); // Check every 2 seconds
  }

  /**
   * Analyze WebRTC stats to determine quality
   */
  analyzeStats(stats) {
    let rtt = 0;
    let packetLoss = 0;
    let packetsLost = 0;
    let packetsReceived = 0;
    let jitter = 0;
    let bytesReceived = 0;

    stats.forEach(report => {
      // Get RTT from candidate pair
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
      }
      
      // Get packet loss and jitter from inbound RTP
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        packetsLost = report.packetsLost || 0;
        packetsReceived = report.packetsReceived || 0;
        jitter = report.jitter || 0;
        bytesReceived = report.bytesReceived || 0;
      }
    });

    // Calculate packet loss percentage
    const totalPackets = packetsLost + packetsReceived;
    packetLoss = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

    // Determine quality level
    let quality = 'excellent';
    if (rtt > 300 || packetLoss > 5) {
      quality = 'poor';
    } else if (rtt > 400 || packetLoss > 10) {
      quality = 'bad';
    } else if (rtt > 150 || packetLoss > 2) {
      quality = 'good';
    }

    return {
      rtt: Math.round(rtt),
      packetLoss: Math.round(packetLoss * 10) / 10, // 1 decimal
      jitter: Math.round(jitter * 1000), // Convert to ms
      bandwidth: bytesReceived,
      quality
    };
  }

  /**
   * Adapt video bitrate based on network quality
   */
  adaptToQuality(quality) {
    if (!this.peerConnection) return;

    const senders = this.peerConnection.getSenders();
    const videoSender = senders.find(s => s.track?.kind === 'video');
    
    if (!videoSender) return;

    const parameters = videoSender.getParameters();
    if (!parameters.encodings || parameters.encodings.length === 0) {
      parameters.encodings = [{}];
    }

    // Adjust bitrate based on quality
    switch (quality.quality) {
      case 'excellent':
        parameters.encodings[0].maxBitrate = 1000000; // 1 Mbps
        console.log('📈 Quality excellent - max bitrate 1 Mbps');
        break;
      case 'good':
        parameters.encodings[0].maxBitrate = 500000; // 500 kbps
        console.log('📊 Quality good - max bitrate 500 kbps');
        break;
      case 'poor':
        parameters.encodings[0].maxBitrate = 250000; // 250 kbps
        console.log('📉 Quality poor - max bitrate 250 kbps');
        break;
      case 'bad':
        parameters.encodings[0].maxBitrate = 100000; // 100 kbps
        console.log('⚠️ Quality bad - max bitrate 100 kbps');
        break;
    }

    videoSender.setParameters(parameters)
      .catch(err => console.error('Failed to adapt quality:', err));
  }

  /**
   * Stop quality monitoring
   */
  stopQualityMonitoring() {
    if (this.qualityMonitorInterval) {
      clearInterval(this.qualityMonitorInterval);
      this.qualityMonitorInterval = null;
    }
  }

  /**
   * Cleanup reconnection state
   */
  cleanup() {
    this.reconnectionAttempts = 0;
    this.isReconnecting = false;
    this.onICERestartCallback = null;
    this.stopQualityMonitoring();
  }

  /**
   * Close connection and cleanup
   */
  close() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Stop remote stream
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clear ICE candidates queue
    this.iceCandidatesQueue = [];
  }
}

export default new WebRTCService();
