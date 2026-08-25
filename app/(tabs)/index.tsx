import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

export default function HomeScreen() {
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>VibeConnect</Text>
        <Text style={styles.online}>● Online</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Meet Someone New</Text>
        <Text style={styles.subtitle}>
          Random 1-to-1 video conversations
        </Text>

        <Text style={styles.choose}>Choose your gender</Text>

        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[
              styles.genderButton,
              gender === 'Male' && styles.selected,
            ]}
            onPress={() => setGender('Male')}
          >
            <Text style={styles.genderEmoji}>👨</Text>
            <Text style={styles.genderText}>Male</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.genderButton,
              gender === 'Female' && styles.selected,
            ]}
            onPress={() => setGender('Female')}
          >
            <Text style={styles.genderEmoji}>👩</Text>
            <Text style={styles.genderText}>Female</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.matchButton,
            !gender && styles.disabled,
          ]}
          disabled={!gender}
          onPress={() => {}}
        >
          <Text style={styles.matchText}>🔀  Start Random Match</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Be respectful and have fun ✨
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08131c',
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 15,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  online: {
    color: '#35d07f',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#9aa9b5',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  choose: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 45,
    marginBottom: 18,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 15,
  },
  genderButton: {
    width: 135,
    height: 125,
    borderRadius: 18,
    backgroundColor: '#12232f',
    borderWidth: 1,
    borderColor: '#263b49',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: {
    borderColor: '#ffffff',
    backgroundColor: '#1b3444',
  },
  genderEmoji: {
    fontSize: 42,
  },
  genderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 7,
  },
  matchButton: {
    marginTop: 35,
    width: '100%',
    height: 58,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  matchText: {
    color: '#08131c',
    fontSize: 17,
    fontWeight: '800',
  },
  note: {
    color: '#71818d',
    marginTop: 18,
    fontSize: 13,
  },
});