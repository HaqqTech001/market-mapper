import { type PropsWithChildren, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { nativeSupabase } from './supabase';
import { clearSessionWindow, isSessionWindowExpired, rememberSessionWindow } from './authStorage';

const PUBLIC_ROUTES = new Set(['/sign-in', '/register', '/forgot-password', '/verify-account', '/reset-password']);

export function AuthGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let alive = true;
    (async()=>{
      const {data,error}=await nativeSupabase.auth.getSession();
      if(!alive)return;
      if(error)console.warn('Could not restore authentication session',error);
      let restored=data.session??null;
      if(restored){
        if(await isSessionWindowExpired()){await nativeSupabase.auth.signOut();await clearSessionWindow();restored=null}
        else await rememberSessionWindow();
      }
      setSession(restored);setResolved(true);
    })();
    const { data } = nativeSupabase.auth.onAuthStateChange((event, nextSession) => {
      if (!alive) return;
      if(nextSession)rememberSessionWindow().catch(()=>{});
      else if(event==='SIGNED_OUT')clearSessionWindow().catch(()=>{});
      setSession(nextSession);setResolved(true);
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
