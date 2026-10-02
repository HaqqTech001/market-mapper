import { type PropsWithChildren, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { nativeSupabase } from './supabase';

const PUBLIC_ROUTES = new Set(['/sign-in', '/register', '/forgot-password', '/verify-account', '/reset-password']);

export function AuthGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let alive = true;
    nativeSupabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) console.warn('Could not restore authentication session', error);
      setSession(data.session ?? null);
      setResolved(true);
    });
    const { data } = nativeSupabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      setResolved(true);
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!resolved) return;
    const isPublic = PUBLIC_ROUTES.has(pathname);
    if (!session && !isPublic) router.replace('/sign-in');
    if (session && isPublic && pathname !== '/reset-password') router.replace('/');
  }, [pathname, resolved, session]);

  if (!resolved) return <View style={styles.center}><ActivityIndicator size="large" /><Text style={styles.text}>Checking secure session…</Text></View>;
  const isPublic = PUBLIC_ROUTES.has(pathname);
  if ((!session && !isPublic) || (session && isPublic && pathname !== '/reset-password')) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F7FAF8' },
  text: { marginTop: 12, color: '#4B5563', fontSize: 14 },
});
