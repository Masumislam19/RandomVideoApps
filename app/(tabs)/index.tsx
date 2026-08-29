import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>VibeConnect</Text>
          <Text style={styles.subtitle}>Meet someone new</Text>
        </View>

        <Pressable
          style={styles.profileButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <View style={styles.logoCircle}>
          <Text style={styles.logo}>VC</Text>
        </View>

        <Text style={styles.heading}>Ready to connect?</Text>

        <Text style={styles.description}>
          Start a random video chat and meet someone new.
        </Text>

        <Pressable
          style={styles.matchButton}
          onPress={() => router.push('/match')}
        >
          <Text style={styles.matchText}>🎥  Start Random Match</Text>
        </Pressable>

        <Text style={styles.note}>You can skip anytime</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05090d',
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#8b9aa3',
    marginTop: 4,
    fontSize: 14,
  },
  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#172129',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 22,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#172129',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  logo: {
    color: '#35d07f',
    fontSize: 30,
    fontWeight: '900',
  },
  heading: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '800',
  },
  description: {
    color: '#8b9aa3',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 300,
  },
  matchButton: {
    backgroundColor: '#35d07f',
    paddingHorizontal: 30,
    paddingVertical: 17,
    borderRadius: 30,
    marginTop: 28,
  },
  matchText: {
    color: '#06100b',
    fontSize: 16,
    fontWeight: '800',
  },
  note: {
    color: '#66747c',
    fontSize: 13,
    marginTop: 14,
  },
});
