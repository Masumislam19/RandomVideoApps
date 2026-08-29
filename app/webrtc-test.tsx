import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function WebRTCTestScreen() {
  const [status, setStatus] = useState('Testing WebRTC...');
  const [details, setDetails] = useState('');

  useEffect(() => {
    let mounted = true;

    async function test() {
      try {
        const WebRTC = await import('react-native-webrtc');

        if (!mounted) return;

        const hasPeerConnection =
          typeof WebRTC.RTCPeerConnection === 'function';

        const hasMediaDevices =
          WebRTC.mediaDevices != null;

        if (hasPeerConnection) {
          setStatus('✅ WebRTC native module loaded');
          setDetails(
            `RTCPeerConnection: OK\nmediaDevices: ${
              hasMediaDevices ? 'OK' : 'Not available'
            }`
          );
        } else {
          setStatus('❌ WebRTC module loaded, but API is missing');
          setDetails(Object.keys(WebRTC).join(', '));
        }
      } catch (error) {
        if (!mounted) return;

        setStatus('❌ WebRTC native module FAILED');
        setDetails(String(error));
      }
    }

    test();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WebRTC Test</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.details}>{details}</Text>
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
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 25,
  },
  status: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  details: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
  },
});
