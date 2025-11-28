import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';

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
    
    // STUN servers for NAT traversal
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };
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
  createPeerConnection(onRemoteStream, onIceCandidate) {
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
        onIceCandidate(event.candidate);
      }
    };

    // Connection state logging
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        console.log('Connection state:', this.peerConnection.connectionState);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection) {
        console.log('ICE connection state:', this.peerConnection.iceConnectionState);
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
