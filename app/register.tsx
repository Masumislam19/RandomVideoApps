import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { saveUser } from '@/lib/auth';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleRegister() {
    setMessage('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      setMessage('Please fill in all fields.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setMessage('Please enter a valid email.');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      await saveUser({
        name: cleanName,
        email: cleanEmail,
      });

      setMessage('Account created successfully!');

      setTimeout(() => {
        router.replace('/profile');
      }, 500);
    } catch (error) {
      setMessage('Could not save account. Please try again.');
      console.log('REGISTER ERROR:', error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>VibeConnect</Text>

      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Join and meet new people</Text>

      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor="#71808a"
        value={name}
        onChangeText={setName}
      />

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
        placeholder="Password (6+ characters)"
        placeholderTextColor="#71808a"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Create Account</Text>
      </Pressable>

      {message ? (
        <Text style={styles.message}>{message}</Text>
      ) : null}

      <Pressable onPress={() => router.push('/login')}>
        <Text style={styles.link}>Already have an account? Login</Text>
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
  message: {
    color: '#35d07f',
    textAlign: 'center',
    marginTop: 15,
    fontWeight: '700',
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
