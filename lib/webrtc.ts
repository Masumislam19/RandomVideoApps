import { Platform } from 'react-native';

export async function loadWebRTC() {
  if (Platform.OS !== 'android') {
    throw new Error('WebRTC is only loaded on Android');
  }

  return await import('react-native-webrtc');
}
