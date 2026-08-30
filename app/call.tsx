import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { socket, connectSocket, disconnectSocket } from '@/lib/socket';

type WebRTCModule = typeof import('react-native-webrtc');

type SignalOffer = {
  type: string;
  sdp?: string;
};

type SignalAnswer = {
  type: string;
  sdp?: string;
};

export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    partnerId?: string;
    initiator?: string;
  }>();

  const partnerId = params.partnerId ?? null;
  const initiator = params.initiator === 'true';

  const webrtcRef = useRef<WebRTCModule | null>(null);
  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);

  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [status, setStatus] = useState('Starting video...');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  const startingRef = useRef(false);
  const cleanedRef = useRef(false);

  useEffect(() => {
    startCall();

    return () => {
      cleanup();
    };
  }, []);

  async function loadWebRTC() {
    if (webrtcRef.current) {
      return webrtcRef.current;
    }

    const module = await import('react-native-webrtc');
    webrtcRef.current = module;

    return module;
  }

  async function startCall() {
    if (startingRef.current) return;

    startingRef.current = true;
    cleanedRef.current = false;

    try {
      setStatus('Loading video system...');

      const WebRTC = await loadWebRTC();

      setStatus('Requesting camera & microphone...');

      const stream = await WebRTC.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: 'user',
          width: 640,
          height: 480,
          frameRate: 30,
        },
      });

      if (cleanedRef.current) {
        stream.getTracks().forEach((track: any) => track.stop());
        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      setStatus('Connecting to server...');

      if (!socket.connected) {
        connectSocket();
      }

      if (socket.connected) {
        setupMatch();
      } else {
        socket.once('connect', setupMatch);
      }
    } catch (error) {
      console.log('Start call error:', error);

      setStatus('Camera & microphone required');

      Alert.alert(
        'Camera & Microphone',
        'Please allow camera and microphone permission to use video chat.',
      );
    }
  }

  function setupMatch() {
    if (cleanedRef.current) return;

    console.log('Call screen socket:', socket.id);
    console.log('Partner:', partnerId);
    console.log('Initiator:', initiator);

    setStatus('Preparing video connection...');

    /*
     * Match screen already matched these two users.
     * Do NOT call find_match again here.
     *
     * The server keeps the partner relationship on the socket.
     */
    setTimeout(() => {
      if (cleanedRef.current) return;

      if (initiator) {
        createOffer();
      } else {
        setStatus('Waiting for video connection...');
      }
    }, 300);
  }

  async function createPeer() {
    if (peerRef.current) {
      return peerRef.current;
    }

    const WebRTC = await loadWebRTC();

    const peer = new WebRTC.RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
        {
          urls: 'stun:stun1.l.google.com:19302',
        },
      ],
    });

    peerRef.current = peer;

    const stream = localStreamRef.current;

    if (stream) {
      stream.getTracks().forEach((track: any) => {
        peer.addTrack(track, stream);
      });
    }

    (peer as any).addEventListener('icecandidate', (event: any) => {
      if (!event.candidate) return;

      socket.emit('ice-candidate', {
        candidate: event.candidate,
      });
    });

    (peer as any).addEventListener('track', (event: any) => {
      console.log('Remote video track received');

      if (event.streams && event.streams.length > 0) {
        setRemoteStream(event.streams[0]);
        setStatus('Connected');
      }
    });

    (peer as any).addEventListener('connectionstatechange', () => {
      const state = peer.connectionState;

      console.log('WebRTC state:', state);

      if (state === 'connecting') {
        setStatus('Connecting video...');
      }

      if (state === 'connected') {
        setStatus('Connected');
      }

      if (state === 'disconnected') {
        setStatus('Connection lost');
      }

      if (state === 'failed') {
        setStatus('Connection failed');
      }
    });

    return peer;
  }

  async function createOffer() {
    try {
      setStatus('Calling...');

      const peer = await createPeer();

      const offer = await peer.createOffer();

      await peer.setLocalDescription(offer);

      socket.emit('offer', {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });

      console.log('Offer sent');
    } catch (error) {
      console.log('Create offer error:', error);
      setStatus('Video connection error');
    }
  }

  async function handleOffer(offer: SignalOffer) {
    try {
      if (!offer?.sdp) {
        throw new Error('Offer SDP missing');
      }

      setStatus('Receiving call...');

      const peer = await createPeer();

      await peer.setRemoteDescription({
        type: 'offer',
        sdp: offer.sdp,
      });

      const answer = await peer.createAnswer();

      await peer.setLocalDescription(answer);

      socket.emit('answer', {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
      });

      console.log('Answer sent');
    } catch (error) {
      console.log('Handle offer error:', error);
      setStatus('Video connection error');
    }
  }

  async function handleAnswer(answer: SignalAnswer) {
    try {
      if (!answer?.sdp) return;

      const peer = peerRef.current;

      if (!peer) return;

      await peer.setRemoteDescription({
        type: 'answer',
        sdp: answer.sdp,
      });

      console.log('Answer received');
    } catch (error) {
      console.log('Handle answer error:', error);
    }
  }

  async function handleIceCandidate(candidate: any) {
    try {
      const peer = peerRef.current;

      if (!peer || !candidate) return;

      await peer.addIceCandidate(candidate);
    } catch (error) {
      console.log('ICE candidate error:', error);
    }
  }

  function handlePartnerLeft() {
    cleanupPeer();
    setRemoteStream(null);
    setStatus('Partner left');

    setTimeout(() => {
      if (cleanedRef.current) return;

      router.replace('/match' as any);
    }, 700);
  }

  function toggleMic() {
    const stream = localStreamRef.current;

    if (!stream) return;

    stream.getAudioTracks().forEach((track: any) => {
      track.enabled = !track.enabled;
    });

    setMicOn((value) => !value);
  }

  function toggleCamera() {
    const stream = localStreamRef.current;

    if (!stream) return;

    stream.getVideoTracks().forEach((track: any) => {
      track.enabled = !track.enabled;
    });

    setCameraOn((value) => !value);
  }

  function nextPerson() {
    cleanupPeer();

    setRemoteStream(null);
    setStatus('Finding next person...');

    if (socket.connected) {
      socket.emit('next');
    }

    setTimeout(() => {
      if (cleanedRef.current) return;

      router.replace('/match' as any);
    }, 400);
  }

  function cleanupPeer() {
    if (peerRef.current) {
      try {
        peerRef.current.close();
      } catch (error) {
        console.log('Peer cleanup error:', error);
      }

      peerRef.current = null;
    }
  }

  function cleanup() {
    if (cleanedRef.current) return;

    cleanedRef.current = true;

    socket.off('offer', handleOffer);
    socket.off('answer', handleAnswer);
    socket.off('ice-candidate', handleIceCandidate);
    socket.off('partner_left', handlePartnerLeft);
    socket.off('connect', setupMatch);

    cleanupPeer();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => {
        track.stop();
      });

      localStreamRef.current = null;
    }

    setRemoteStream(null);

    /*
     * Disconnect only when leaving the call completely.
     */
    disconnectSocket();
  }

  function leaveCall() {
    cleanup();
    router.back();
  }

  useEffect(() => {
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('partner_left', handlePartnerLeft);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('partner_left', handlePartnerLeft);
    };
  }, []);

  const RTCViewComponent = webrtcRef.current?.RTCView;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#05090d"
      />

      <View style={styles.videoArea}>
        {remoteStream && RTCViewComponent ? (
          React.createElement(RTCViewComponent, {
            streamURL: remoteStream.toURL(),
            style: styles.remoteVideo,
            objectFit: 'cover',
          })
        ) : (
          <View style={styles.waiting}>
            <View style={styles.waitingCircle}>
              <Text style={styles.waitingEmoji}>
                👤
              </Text>
            </View>

            <Text style={styles.waitingTitle}>
              {status}
            </Text>

            <Text style={styles.waitingStatus}>
              {partnerId
                ? 'Connecting with your matched user...'
                : 'Preparing video chat...'}
            </Text>

            <View style={styles.loadingDots}>
              <View style={styles.loadingDot} />
              <View style={styles.loadingDot} />
              <View style={styles.loadingDot} />
            </View>
          </View>
        )}

        {localStream && RTCViewComponent && (
          <View style={styles.localContainer}>
            {React.createElement(RTCViewComponent, {
              streamURL: localStream.toURL(),
              style: styles.localVideo,
              objectFit: 'cover',
              mirror: true,
            })}

            {!cameraOn && (
              <View style={styles.cameraOff}>
                <Text style={styles.cameraOffText}>
                  📷
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.topBar}>
          <View>
            <Text style={styles.logo}>
              VibeConnect
            </Text>

            <Text style={styles.smallText}>
              Random Video Chat
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />

            <Text style={styles.statusText}>
              {status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleMic}
            style={[
              styles.controlButton,
              !micOn && styles.controlButtonOff,
            ]}
          >
            <Text style={styles.controlIcon}>
              {micOn ? '🎙️' : '🔇'}
            </Text>

            <Text style={styles.controlLabel}>
              {micOn ? 'Mute' : 'Unmute'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleCamera}
            style={[
              styles.controlButton,
              !cameraOn && styles.controlButtonOff,
            ]}
          >
            <Text style={styles.controlIcon}>
              {cameraOn ? '📹' : '🚫'}
            </Text>

            <Text style={styles.controlLabel}>
              {cameraOn ? 'Camera' : 'Off'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={nextPerson}
            style={styles.nextButton}
          >
            <Text style={styles.nextIcon}>
              ⏭
            </Text>

            <Text style={styles.nextText}>
              NEXT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={leaveCall}
            style={styles.endButton}
          >
            <Text style={styles.endIcon}>
              ✕
            </Text>

            <Text style={styles.endText}>
              End
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.bottomHint}>
          Be respectful and have fun ✨
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05090d',
  },

  videoArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#08131c',
    overflow: 'hidden',
  },

  remoteVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  localContainer: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    width: 112,
    height: 158,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  localVideo: {
    width: '100%',
    height: '100%',
  },

  cameraOff: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#111b21',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cameraOffText: {
    fontSize: 30,
  },

  waiting: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  waitingCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#102630',
    borderWidth: 1,
    borderColor: '#23404e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  waitingEmoji: {
    fontSize: 43,
  },

  waitingTitle: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
  },

  waitingStatus: {
    color: '#81929e',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },

  loadingDots: {
    flexDirection: 'row',
    marginTop: 18,
  },

  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginHorizontal: 4,
    opacity: 0.7,
  },

  topBar: {
    position: 'absolute',
    top: 14,
    left: 17,
    right: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  logo: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },

  smallText: {
    color: '#81909a',
    fontSize: 9,
    marginTop: 2,
  },

  statusBadge: {
    maxWidth: 170,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#35d07f',
    marginRight: 6,
  },

  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },

  bottomPanel: {
    backgroundColor: '#071017',
    paddingTop: 13,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },

  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  controlButton: {
    width: 64,
    height: 58,
    borderRadius: 17,
    backgroundColor: '#10212b',
    justifyContent: 'center',
    alignItems: 'center',
  },

  controlButtonOff: {
    backgroundColor: '#241b1e',
  },

  controlIcon: {
    fontSize: 21,
  },

  controlLabel: {
    color: '#aebbc3',
    fontSize: 9,
    marginTop: 3,
    fontWeight: '700',
  },

  nextButton: {
    height: 55,
    paddingHorizontal: 19,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  nextIcon: {
    color: '#061018',
    fontSize: 20,
    marginRight: 6,
  },

  nextText: {
    color: '#061018',
    fontSize: 14,
    fontWeight: '900',
  },

  endButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#351c22',
    justifyContent: 'center',
    alignItems: 'center',
  },

  endIcon: {
    color: '#ff6d7a',
    fontSize: 20,
    fontWeight: '900',
  },

  endText: {
    color: '#ff8993',
    fontSize: 9,
    marginTop: 2,
    fontWeight: '700',
  },

  bottomHint: {
    color: '#52636d',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 8,
  },
});
