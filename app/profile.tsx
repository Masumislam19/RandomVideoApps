import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { getUser, logout, User } from '@/lib/auth';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  async function handleLogout() {
    await logout();

    Alert.alert('Logged out', 'Your local session has been cleared.', [
      {
        text: 'OK',
        onPress: () => router.replace('/'),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>👤</Text>
      </View>

      <Text style={styles.name}>
        {user?.name || 'Guest User'}
      </Text>

      <Text style={styles.email}>
        {user?.email || 'No account saved'}
      </Text>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
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
    position: 'absolute',
    top: 60,
    color: '#fff',
    fontSize: 25,
    fontWeight: '800',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#172129',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 42,
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 20,
  },
  email: {
    color: '#8b9aa3',
    fontSize: 14,
    marginTop: 7,
  },
  logoutButton: {
    marginTop: 30,
    backgroundColor: '#172129',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 25,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  backButton: {
    marginTop: 18,
    paddingHorizontal: 25,
    paddingVertical: 12,
  },
  backText: {
    color: '#8b9aa3',
    fontWeight: '600',
  },
});
