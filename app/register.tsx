import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      Alert.alert('Missing information', 'Name, email and password are required.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Account could not be created.');
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          name: cleanName,
          email: cleanEmail,
        });

      if (profileError) {
        throw profileError;
      }

      Alert.alert(
        'Account created',
        'Your VibeConnect account has been created successfully.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/profile'),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Registration failed',
        error?.message || 'Something went wrong.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Join VibeConnect
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#7d8790"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#7d8790"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#7d8790"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <Pressable
          style={[styles.button, loading && styles.disabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Account'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.linkButton}
          onPress={() => router.push('/login')}
          disabled={loading}
        >
          <Text style={styles.linkText}>
            Already have an account? Login
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05090d',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#8b9aa3',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#111820',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#35d07f',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#041008',
    fontSize: 16,
    fontWeight: '800',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    color: '#35d07f',
    fontSize: 14,
    fontWeight: '700',
  },
});
