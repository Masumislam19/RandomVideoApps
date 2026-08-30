import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  socket,
  connectSocket,
  disconnectSocket,
} from '@/lib/socket';

export default function MatchScreen() {
  const [status, setStatus] = useState('Connecting...');
  const [partnerId, setPartnerId] = useState<string | null>(null);

  useEffect(() => {
    const onConnect = () => {
      setStatus('Finding someone...');
      socket.emit('find_match');
    };

    const onWaiting = () => {
      setStatus('Waiting for someone...');
    };

    const onMatched = (data: {
      partnerId: string;
      initiator: boolean;
    }) => {
      setPartnerId(data.partnerId);
      setStatus('Match found! 🎉');

      // Give the UI a moment, then open real video call.
      setTimeout(() => {
        router.replace({
          pathname: '/call',
          params: {
            partnerId: data.partnerId,
            initiator: data.initiator ? 'true' : 'false',
          },
        });
      }, 700);
    };

    const onPartnerLeft = () => {
      setPartnerId(null);
      setStatus('Partner left. Finding someone else...');
      socket.emit('find_match');
    };

    socket.on('connect', onConnect);
    socket.on('waiting', onWaiting);
    socket.on('matched', onMatched);
    socket.on('partner_left', onPartnerLeft);

    connectSocket();

    return () => {
      socket.off('connect', onConnect);
      socket.off('waiting', onWaiting);
      socket.off('matched', onMatched);
      socket.off('partner_left', onPartnerLeft);
      disconnectSocket();
    };
  }, []);

  function handleNext() {
    setPartnerId(null);
    setStatus('Finding someone...');
    socket.emit('next');
  }

  function handleBack() {
    disconnectSocket();
    router.back();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>VibeConnect</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {partnerId ? '👤' : '🔎'}
          </Text>
        </View>

        <View style={styles.onlineRow}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>
            {partnerId ? 'User found' : 'Server connected'}
          </Text>
        </View>

        <Text style={styles.title}>{status}</Text>

        {partnerId ? (
          <>
            <Text style={styles.partner}>
              Connecting video call...
            </Text>

            <ActivityIndicator
              size="large"
              style={styles.loader}
            />
          </>
        ) : (
          <>
            <Text style={styles.partner}>
              Finding a real user for you
            </Text>

            <ActivityIndicator
              size="large"
              style={styles.loader}
            />
          </>
        )}

        <Pressable
          style={styles.backButton}
          onPress={handleBack}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05090d',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  logo: {
    color: '#35d07f',
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 35,
  },

  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#10181e',
    borderRadius: 26,
    padding: 30,
    alignItems: 'center',
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#172129',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 48,
  },

  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
  },

  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#35d07f',
    marginRight: 8,
  },

  onlineText: {
    color: '#8b9aa3',
    fontSize: 15,
    fontWeight: '600',
  },

  title: {
    color: '#fff',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 18,
    textAlign: 'center',
  },

  partner: {
    color: '#8b9aa3',
    fontSize: 15,
    marginTop: 9,
    textAlign: 'center',
  },

  loader: {
    marginTop: 24,
  },

  backButton: {
    marginTop: 30,
    paddingHorizontal: 25,
    paddingVertical: 10,
  },

  backText: {
    color: '#8b9aa3',
    fontSize: 16,
    fontWeight: '700',
  },
});
