import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { initializeNativeDatabase } from '@/src/native/database';

export default function RootLayout() {
  const [state, setState] = useState<'booting' | 'ready' | 'error'>('booting');

  useEffect(() => {
    let active = true;
    initializeNativeDatabase()
      .then(() => active && setState('ready'))
      .catch((error) => {
        console.error('Native database initialization failed', error);
        if (active) setState('error');
      });
    return () => { active = false; };
  }, []);

  if (state === 'booting') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Preparing offline field storage…</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Local storage could not start</Text>
        <Text style={styles.message}>Market Mapper will not open field workflows until durable device storage is available.</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F7FAF8' },
  message: { marginTop: 12, maxWidth: 520, textAlign: 'center', color: '#4B5563', fontSize: 15, lineHeight: 22 },
  errorTitle: { color: '#991B1B', fontSize: 20, fontWeight: '800' },
});
