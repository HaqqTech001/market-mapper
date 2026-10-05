import { useEffect, useState } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeNativeDatabase } from '@/src/native/database';
import { OperationalRealtimeLifecycle } from '@/src/native/OperationalRealtimeLifecycle';
import { FieldBottomNav } from '@/src/native/FieldBottomNav';
import { AuthGate } from '@/src/native/AuthGate';
import { IncomingCallLifecycle } from '@/src/native/IncomingCallLifecycle';
import { registerGlobals } from '@livekit/react-native';
import { AutoSyncLifecycle } from '@/src/native/AutoSyncLifecycle';
import { getDatabase } from '@/src/db/sqlite';

registerGlobals();

const CORE=['/','/map','/missions','/chat','/more'];

export default function RootLayout() {
  const pathname = usePathname();
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

  useEffect(()=>{if(state!=='ready')return;(async()=>{try{const active=await getDatabase().getFirstAsync<any>("SELECT session_id FROM local_path_sessions WHERE status IN ('recording','paused','reviewing') ORDER BY last_saved_at DESC LIMIT 1;");if(active&&!['/map','/sign-in','/register','/forgot-password','/verify-account','/reset-password'].includes(pathname))router.replace('/map')}catch(error){console.warn('Could not restore active mapping route',error)}})()},[state]);

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
    <SafeAreaProvider>
    <AuthGate>
      <OperationalRealtimeLifecycle />
      <AutoSyncLifecycle />
      <IncomingCallLifecycle />
      <StatusBar style="dark" />
      <View style={{flex:1}}><Stack screenOptions={{ headerShown: false }} /></View>
      {CORE.includes(pathname) ? <FieldBottomNav /> : null}
    </AuthGate>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F7FAF8' },
  message: { marginTop: 12, maxWidth: 520, textAlign: 'center', color: '#4B5563', fontSize: 15, lineHeight: 22 },
  errorTitle: { color: '#991B1B', fontSize: 20, fontWeight: '800' },
});
