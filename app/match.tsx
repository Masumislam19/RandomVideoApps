import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { socket, connectSocket, disconnectSocket } from '@/lib/socket';

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

    const onMatched = (data: { partnerId: string }) => {
      setPartnerId(data.partnerId);
      setStatus('Match found! 🎉');
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

        <Text style={styles.title}>{status}</Text>

        {partnerId ? (
          <>
            <Text style={styles.partner}>
              Connected to a random user
            </Text>

            <Pressable style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.buttonText}>Next</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator size="large" />
        )}

        <Pressable style={styles.backButton} onPress={handleBack}>
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
    borderRadius: 24,
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
  title: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 25,
    textAlign: 'center',
  },
  partner: {
    color: '#8b9aa3',
    marginTop: 8,
  },
  nextButton: {
    backgroundColor: '#35d07f',
    paddingHorizontal: 55,
    paddingVertical: 15,
    borderRadius: 28,
    marginTop: 25,
  },
  buttonText: {
    color: '#06100b',
    fontSize: 17,
    fontWeight: '800',
  },
  backButton: {
    marginTop: 20,
    padding: 10,
  },
  backText: {
    color: '#8b9aa3',
    fontWeight: '700',
  },
});
