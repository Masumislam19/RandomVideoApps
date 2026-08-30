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
import { router, useLocalSearchParams } from 'expo-router';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'https://randomvideoapps.onrender.com';

type SignalOffer = {
  type: 'offer';
  sdp?: string;
};

type SignalAnswer = {
  type: 'answer';
  sdp?: string;
};

export default function CallScreen() {
  const params = useLocalSearchParams<{ partnerId?: string }>();

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<any>(null);
  const webRTCRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);

  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [status, setStatus] = useState('Starting video...');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  useEffect(() => {
    start();

    return () => {
      cleanup();
    };
  }, []);

  async function loadWebRTC() {
    if (webRTCRef.current) {
      return webRTCRef.current;
    }

    const module = await import('react-native-webrtc');
    webRTCRef.current = module;
    return module;
  }

  async function start() {
    try {
      setStatus('Loading camera...');

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

      localStreamRef.current = stream;
      setLocalStream(stream);

      setStatus('Connecting to matchmaking server...');

      const socket = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: true,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Connected:', socket.id);

        setStatus('Finding someone...');

        /*
         * IMPORTANT:
         * This matches server/index.js
         */
        socket.emit('find_match');
      });

      socket.on('waiting', () => {
        setStatus('Waiting for someone...');
      });

      socket.on(
        'matched',
        async ({ partnerId }: { partnerId: string }) => {
          try {
            console.log('Matched with:', partnerId);

            setStatus('Match found! Connecting video...');

            /*
             * The first user creates the offer.
             * We use socket.id comparison so both phones
             * don't create offers simultaneously.
             */
            const shouldInitiate =
              String(socket.id) < String(partnerId);

            await createPeer();

            if (shouldInitiate) {
              const peer = peerRef.current;

              const offer = await peer.createOffer();

              await peer.setLocalDescription(offer);

              socket.emit('offer', {
                offer: {
                  type: 'offer',
                  sdp: offer.sdp,
                },
              });
            }
          } catch (error) {
            console.log('Match error:', error);
            setStatus('Video connection error');
          }
        },
      );

      socket.on(
        'offer',
        async ({ offer }: { offer: SignalOffer }) => {
          try {
            if (!offer?.sdp) {
              throw new Error('Offer SDP missing');
            }

            setStatus('Receiving video connection...');

            const peer = await createPeer();

            await peer.setRemoteDescription({
              type: 'offer',
              sdp: offer.sdp,
            });

            const answer = await peer.createAnswer();

            await peer.setLocalDescription(answer);

            socket.emit('answer', {
              answer: {
                type: 'answer',
                sdp: answer.sdp,
              },
            });
          } catch (error) {
            console.log('Offer error:', error);
            setStatus('Offer connection error');
          }
        },
      );

      socket.on(
        'answer',
        async ({ answer }: { answer: SignalAnswer }) => {
          try {
            const peer = peerRef.current;

            if (!peer || !answer?.sdp) {
              return;
            }

            await peer.setRemoteDescription({
              type: 'answer',
              sdp: answer.sdp,
            });
          } catch (error) {
            console.log('Answer error:', error);
          }
        },
      );

      socket.on(
        'ice-candidate',
        async ({ candidate }: { candidate: any }) => {
          try {
            const peer = peerRef.current;

            if (!peer || !candidate) {
              return;
            }

            await peer.addIceCandidate(candidate);
          } catch (error) {
            console.log('ICE error:', error);
          }
        },
      );

      socket.on('partner_left', () => {
        cleanupPeer();
        setRemoteStream(null);
        setStatus('Partner left. Finding someone...');

        setTimeout(() => {
          if (socketRef.current?.connected) {
            socketRef.current.emit('find_match');
          }
        }, 500);
      });

      socket.on('connect_error', (error) => {
        console.log('Socket error:', error);
        setStatus('Server connection failed');
      });

      socket.on('disconnect', () => {
        setStatus('Server disconnected');
      });
    } catch (error) {
      console.log('Start error:', error);

      setStatus('Camera & microphone required');

      Alert.alert(
        'Camera & Microphone',
        'Please allow camera and microphone permission to use video chat.',
      );
    }
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

    peer.addEventListener('icecandidate', (event: any) => {
      if (!event.candidate) {
        return;
      }

      socketRef.current?.emit('ice-candidate', {
        candidate: event.candidate,
      });
    });

    peer.addEventListener('track', (event: any) => {
      console.log('Remote track received');

      if (event.streams?.length) {
        setRemoteStream(event.streams[0]);
        setStatus('Connected');
      }
    });

    peer.addEventListener('connectionstatechange', () => {
      const state = peer.connectionState;

      console.log('WebRTC state:', state);

      if (state === 'connected') {
        setStatus('Connected');
      } else if (state === 'connecting') {
        setStatus('Connecting video...');
      } else if (state === 'disconnected') {
        setStatus('Connection lost');
      } else if (state === 'failed') {
        setStatus('Video connection failed');
      }
    });

    return peer;
  }

  function toggleMic() {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    stream.getAudioTracks().forEach((track: any) => {
      track.enabled = !track.enabled;
    });

    setMicOn((value) => !value);
  }

  function toggleCamera() {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    stream.getVideoTracks().forEach((track: any) => {
      track.enabled = !track.enabled;
    });

    setCameraOn((value) => !value);
  }

  function nextPerson() {
    cleanupPeer();

    setRemoteStream(null);
    setStatus('Finding someone...');

    socketRef.current?.emit('next');
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
    cleanupPeer();

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => {
        track.stop();
      });

      localStreamRef.current = null;
    }
  }

  function leaveCall() {
    cleanup();
    router.back();
  }

  const RTCView = webRTCRef.current?.RTCView;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#05090d"
      />

      <View style={styles.videoArea}>
        {remoteStream && RTCView ? (
          React.createElement(RTCView, {
            streamURL: remoteStream.toURL(),
            style: styles.remoteVideo,
            objectFit: 'cover',
          })
        ) : (
          <View style={styles.waiting}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>

            <Text style={styles.title}>
              {status}
            </Text>

            <Text style={styles.subtitle}>
              {params.partnerId
                ? 'Connecting to your match...'
                : 'Looking for a random user...'}
            </Text>
          </View>
        )}

        {localStream && RTCView && (
          <View style={styles.localContainer}>
            {React.createElement(RTCView, {
              streamURL: localStream.toURL(),
              style: styles.localVideo,
              objectFit: 'cover',
              mirror: true,
            })}

            {!cameraOn && (
              <View style={styles.cameraOff}>
                <Text style={styles.cameraOffText}>📷</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.topBar}>
          <View>
            <Text style={styles.logo}>VibeConnect</Text>
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
            onPress={nextPerson}
            style={styles.nextButton}
          >
            <Text style={styles.nextText}>
              NEXT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={leaveCall}
            style={styles.endButton}
          >
            <Text style={styles.endIcon}>✕</Text>

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
    backgroundColor: '#08131c',
    position: 'relative',
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
    ...StyleSheet.absoluteFillObject,
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

  avatar: {
    width: 95,
    height: 95,
    borderRadius: 48,
    backgroundColor: '#102630',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },

  avatarText: {
    fontSize: 45,
  },

  title: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    color: '#81929e',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
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
