import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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

  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [messages, setMessages] = useState<
    { text: string; mine: boolean; timestamp: number }[]
  >([]);

  const startedRef = useRef(false);
  const cleanedRef = useRef(false);
  const remoteDescriptionSetRef = useRef(false);
  const pendingIceRef = useRef<any[]>([]);

  async function loadWebRTC() {
    if (webrtcRef.current) {
      return webrtcRef.current;
    }

    const module = await import('react-native-webrtc');
    webrtcRef.current = module;

    return module;
  }

  async function flushPendingIce() {
    const peer = peerRef.current;

    if (!peer || !remoteDescriptionSetRef.current) {
      return;
    }

    const pending = [...pendingIceRef.current];
    pendingIceRef.current = [];

    for (const candidate of pending) {
      try {
        await peer.addIceCandidate(candidate);
      } catch (error) {
        console.log('Queued ICE error:', error);
      }
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

    (peer as any).addEventListener(
      'icecandidate',
      (event: any) => {
        if (!event?.candidate) {
          return;
        }

        if (!socket.connected) {
          console.log('Socket not connected; ICE not sent');
          return;
        }

        socket.emit('ice-candidate', {
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment,
          },
        });

        console.log('ICE SENT');
      },
    );

    (peer as any).addEventListener(
      'icecandidateerror',
      (event: any) => {
        console.log('ICE CANDIDATE ERROR:', event);
      },
    );

    (peer as any).addEventListener(
      'iceconnectionstatechange',
      () => {
        console.log(
          'ICE CONNECTION STATE:',
          peer.iceConnectionState,
        );

        if (peer.iceConnectionState === 'checking') {
          setStatus('Connecting video...');
        }

        if (peer.iceConnectionState === 'connected' ||
            peer.iceConnectionState === 'completed') {
          setStatus('Connected');
        }

        if (peer.iceConnectionState === 'failed') {
          setStatus('Video connection failed');
        }
      },
    );

    (peer as any).addEventListener(
      'track',
      (event: any) => {
        console.log('REMOTE TRACK RECEIVED');

        if (event?.streams?.length > 0) {
          const stream = event.streams[0];

          setRemoteStream(stream);
          setStatus('Connected');
        }
      },
    );

    (peer as any).addEventListener(
      'iceconnectionstatechange',
      () => {
        console.log('ICE CONNECTION STATE:', peer.iceConnectionState);
      },
    );

    (peer as any).addEventListener(
      'icegatheringstatechange',
      () => {
        console.log('ICE GATHERING STATE:', peer.iceGatheringState);
      },
    );

    (peer as any).addEventListener(
      'signalingstatechange',
      () => {
        console.log('SIGNALING STATE:', peer.signalingState);
      },
    );

    (peer as any).addEventListener(
      'connectionstatechange',
      () => {
        const state = peer.connectionState;

        console.log('WebRTC connection state:', state);

        if (state === 'new') {
          setStatus('Preparing video...');
        }

        if (state === 'connecting') {
          setStatus('Connecting video...');
        }

        if (state === 'connected') {
          setStatus('Connected');
        }

        if (state === 'disconnected') {
          setStatus('Connection interrupted');
        }

        if (state === 'failed') {
          setStatus('Connection failed');
        }

        if (state === 'closed') {
          setStatus('Call ended');
        }
      },
    );

    return peer;
  }

  async function createOffer() {
    try {
      const peer = await createPeer();

      setStatus('Calling...');

      const offer = await peer.createOffer();

      await peer.setLocalDescription(offer);

      socket.emit('offer', {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });

      console.log('OFFER SENT');
    } catch (error) {
      console.log('Create offer error:', error);
      setStatus('Video connection error');
    }
  }

  async function handleOffer(offer: SignalOffer) {
    try {
      if (!offer?.sdp) {
        return;
      }

      setStatus('Receiving call...');

      const peer = await createPeer();

      await peer.setRemoteDescription({
        type: offer.type || 'offer',
        sdp: offer.sdp,
      });

      remoteDescriptionSetRef.current = true;

      await flushPendingIce();

      const answer = await peer.createAnswer();

      await peer.setLocalDescription(answer);

      socket.emit('answer', {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
      });

      console.log('ANSWER SENT');
    } catch (error) {
      console.log('Handle offer error:', error);
      setStatus('Video connection error');
    }
  }

  async function handleAnswer(answer: SignalAnswer) {
    try {
      if (!answer?.sdp) {
        return;
      }

      const peer = peerRef.current;

      if (!peer) {
        console.log('Answer received before peer exists');
        return;
      }

      await peer.setRemoteDescription({
        type: answer.type || 'answer',
        sdp: answer.sdp,
      });

      remoteDescriptionSetRef.current = true;

      await flushPendingIce();

      console.log('ANSWER RECEIVED');
    } catch (error) {
      console.log('Handle answer error:', error);
    }
  }

  async function handleIceCandidate(candidate: any) {
    try {
      if (!candidate) {
        return;
      }

      const peer = peerRef.current;

      if (!peer || !remoteDescriptionSetRef.current) {
        pendingIceRef.current.push(candidate);

        console.log(
          'ICE queued:',
          pendingIceRef.current.length,
        );

        return;
      }

      await peer.addIceCandidate(candidate);

      console.log('ICE ADDED');
    } catch (error) {
      console.log('ICE candidate error:', error);
    }
  }

  function handleChatMessage(payload: any) {
    if (!payload || typeof payload.text !== 'string') return;

    const text = payload.text.trim().slice(0, 500);
    if (!text) return;

    setMessages((current) => [
      ...current,
      {
        text,
        mine: false,
        timestamp:
          typeof payload.timestamp === 'number'
            ? payload.timestamp
            : Date.now(),
      },
    ]);
  }

  function sendChatMessage() {
    const text = chatText.trim().slice(0, 500);

    if (!text || !socket.connected) return;

    socket.emit('chat-message', { text });

    setMessages((current) => [
      ...current,
      {
        text,
        mine: true,
        timestamp: Date.now(),
      },
    ]);

    setChatText('');
  }

  function handlePartnerLeft() {
    cleanupPeer();

    setRemoteStream(null);
    setStatus('Partner left');

    setTimeout(() => {
      if (!cleanedRef.current) {
        router.replace('/match' as any);
      }
    }, 700);
  }

  function toggleMic() {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const tracks = stream.getAudioTracks();

    tracks.forEach((track: any) => {
      track.enabled = !track.enabled;
    });

    setMicOn((value) => !value);
  }

  function toggleCamera() {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const tracks = stream.getVideoTracks();

    tracks.forEach((track: any) => {
      track.enabled = !track.enabled;
    });

    setCameraOn((value) => !value);
  }

  function cleanupPeer() {
    pendingIceRef.current = [];
    remoteDescriptionSetRef.current = false;

    if (peerRef.current) {
      try {
        peerRef.current.close();
      } catch (error) {
        console.log('Peer close error:', error);
      }

      peerRef.current = null;
    }
  }

  function stopLocalMedia() {
    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track: any) => {
          try {
            track.stop();
          } catch {}
        });

      localStreamRef.current = null;
    }

    setLocalStream(null);
  }

  function cleanup() {
    if (cleanedRef.current) {
      return;
    }

    cleanedRef.current = true;

    socket.off('offer', handleOffer);
    socket.off('answer', handleAnswer);
    socket.off('ice-candidate', handleIceCandidate);
    socket.off('partner_left', handlePartnerLeft);
    socket.off('chat-message', handleChatMessage);

    cleanupPeer();
    stopLocalMedia();

    setRemoteStream(null);

    disconnectSocket();
  }

  function leaveCall() {
    cleanup();
    router.back();
  }

  function nextPerson() {
    cleanupPeer();

    setRemoteStream(null);
    setStatus('Finding next person...');

    if (socket.connected) {
      socket.emit('next');
    }

    setTimeout(() => {
      if (!cleanedRef.current) {
        router.replace('/match' as any);
      }
    }, 300);
  }

  async function startCall() {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    cleanedRef.current = false;

    try {
      setStatus('Loading video...');

      const WebRTC = await loadWebRTC();

      setStatus('Requesting camera & microphone...');

      const stream =
        await WebRTC.mediaDevices.getUserMedia({
          audio: true,
          video: {
            facingMode: 'user',
            width: 640,
            height: 480,
            frameRate: 30,
          },
        });

      if (cleanedRef.current) {
        stream
          .getTracks()
          .forEach((track: any) => track.stop());

        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      setStatus('Connecting video...');

      if (!socket.connected) {
        connectSocket();

        socket.once('connect', () => {
          if (cleanedRef.current) {
            return;
          }

          beginNegotiation();
        });
      } else {
        beginNegotiation();
      }
    } catch (error) {
      console.log('START CALL ERROR:', error);

      setStatus('Camera & microphone required');

      Alert.alert(
        'Camera & Microphone',
        'Please allow camera and microphone permission to use video chat.',
      );
    }
  }

  async function beginNegotiation() {
    if (cleanedRef.current) {
      return;
    }

    console.log('Socket:', socket.id);
    console.log('Partner:', partnerId);
    console.log('Initiator:', initiator);

    setStatus('Preparing video connection...');

    if (initiator) {
      await createOffer();
    } else {
      setStatus('Waiting for video connection...');
    }
  }

  useEffect(() => {
    // IMPORTANT:
    // Register signaling listeners BEFORE starting WebRTC.
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('partner_left', handlePartnerLeft);
    socket.on('chat-message', handleChatMessage);

    startCall();

    return () => {
      cleanup();
    };
  }, []);

  const RTCViewComponent =
    webrtcRef.current?.RTCView;

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
            <React.Fragment>
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
            </React.Fragment>
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

      {chatOpen && (
        <View style={styles.chatPanel}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Chat</Text>

            <TouchableOpacity
              onPress={() => setChatOpen(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.chatClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.messagesArea}>
            {messages.length === 0 ? (
              <Text style={styles.emptyChat}>
                Say hello 👋
              </Text>
            ) : (
              messages.map((message, index) => (
                <View
                  key={message.timestamp + '-' + index}
                  style={[
                    styles.messageBubble,
                    message.mine
                      ? styles.myMessage
                      : styles.theirMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.mine && styles.myMessageText,
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.chatInputRow}>
            <TextInput
              value={chatText}
              onChangeText={(text) => setChatText(text.slice(0, 500))}
              placeholder="Type a message..."
              placeholderTextColor="#70808a"
              style={styles.chatInput}
              maxLength={500}
              multiline
              returnKeyType="send"
              onSubmitEditing={sendChatMessage}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={sendChatMessage}
              style={styles.sendButton}
            >
              <Text style={styles.sendButtonText}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
            onPress={() => setChatOpen((value) => !value)}
            style={[
              styles.controlButton,
              chatOpen && styles.chatButtonActive,
            ]}
          >
            <Text style={styles.controlIcon}>💬</Text>
            <Text style={styles.controlLabel}>Chat</Text>
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
    backgroundColor: '#111820',
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
    maxWidth: 175,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.60)',
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

  chatPanel: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 82,
    height: 330,
    backgroundColor: '#0b171f',
    borderRadius: 20,
    padding: 12,
    zIndex: 20,
    borderWidth: 1,
    borderColor: '#20333e',
  },

  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },

  chatTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },

  chatClose: {
    color: '#aebbc3',
    fontSize: 20,
    paddingHorizontal: 5,
  },

  messagesArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingVertical: 5,
  },

  emptyChat: {
    color: '#70808a',
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 10,
  },

  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    marginVertical: 3,
  },

  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#ffffff',
    borderBottomRightRadius: 5,
  },

  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#162832',
    borderBottomLeftRadius: 5,
  },

  messageText: {
    color: '#d8e1e5',
    fontSize: 13,
  },

  myMessageText: {
    color: '#071017',
  },

  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },

  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 80,
    backgroundColor: '#14232c',
    color: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 7,
  },

  sendButtonText: {
    color: '#071017',
    fontSize: 20,
    fontWeight: '900',
  },

  chatButtonActive: {
    borderWidth: 1,
    borderColor: '#ffffff',
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
