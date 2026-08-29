import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { getUser } from '@/lib/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing information', 'Email and password are required.');
      return;
    }

    const user = await getUser();

    if (!user) {
      Alert.alert(
        'No account found',
        'Please create an account first.'
      );
      return;
    }

    if (email.trim().toLowerCase() !== user.email.toLowerCase()) {
      Alert.alert('Login failed', 'Email does not match the saved account.');
      return;
    }

    router.replace('/');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>VibeConnect</Text>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#71808a"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#71808a"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/register')}>
        <Text style={styles.link}>Create a new account</Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05090d',
    padding: 24,
    justifyContent: 'center',
  },
  logo: {
    color: '#35d07f',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 35,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#8b9aa3',
    marginTop: 6,
    marginBottom: 25,
  },
  input: {
    backgroundColor: '#121b21',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#35d07f',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#06100b',
    fontSize: 17,
    fontWeight: '800',
  },
  link: {
    color: '#35d07f',
    textAlign: 'center',
    marginTop: 22,
    fontWeight: '700',
  },
  back: {
    color: '#8b9aa3',
    textAlign: 'center',
    marginTop: 22,
  },
});
