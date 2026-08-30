import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Profile = {
  name: string;
  email: string | null;
  gender: string | null;
  bio: string | null;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('name,email,gender,bio')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error: any) {
      Alert.alert(
        'Profile error',
        error?.message || 'Could not load profile.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Logout failed', error.message);
      return;
    }

    router.replace('/login');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>

        <Text style={styles.title}>
          {profile?.name || 'User'}
        </Text>

        <Text style={styles.email}>
          {profile?.email || 'No email'}
        </Text>

        {profile?.gender ? (
          <Text style={styles.info}>Gender: {profile.gender}</Text>
        ) : null}

        {profile?.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : null}

        <Pressable
          style={styles.matchButton}
          onPress={() => router.push('/match')}
        >
          <Text style={styles.matchText}>Find Random Match</Text>
        </Pressable>

        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
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
    alignItems: 'center',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#35d07f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  avatarText: {
    color: '#041008',
    fontSize: 38,
    fontWeight: '900',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  email: {
    color: '#8b9aa3',
    marginTop: 7,
    fontSize: 15,
  },
  info: {
    color: '#fff',
    marginTop: 18,
    fontSize: 15,
  },
  bio: {
    color: '#8b9aa3',
    marginTop: 10,
    textAlign: 'center',
  },
  loading: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 17,
  },
  matchButton: {
    width: '100%',
    backgroundColor: '#35d07f',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 35,
  },
  matchText: {
    color: '#041008',
    fontSize: 16,
    fontWeight: '800',
  },
  logoutButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#39434a',
  },
  logoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
