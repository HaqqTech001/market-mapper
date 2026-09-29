import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LatLng } from 'react-native-maps';
import type { LocationSubscription } from '@/src/lib/location/locationService';
import { NativeFieldMap } from '@/src/native/NativeFieldMap';
import { nativeLocationService } from '@/src/native/locationService';

export default function MapScreen() {
  const [permission, setPermission] = useState<'checking' | 'granted' | 'denied' | 'services_disabled'>('checking');
  const [current, setCurrent] = useState<LatLng | null>(null);
  const [previewPath, setPreviewPath] = useState<LatLng[]>([]);
  const subscription = useRef<LocationSubscription | null>(null);

  const startLocation = async () => {
    const existing = await nativeLocationService.getForegroundPermissionsAsync();
    const result = existing.granted ? existing : await nativeLocationService.requestForegroundPermissionsAsync();
    if (!result.granted) {
      setPermission(result.status === 'services_disabled' ? 'services_disabled' : 'denied');
      return;
    }
    setPermission('granted');
    subscription.current?.remove();
    subscription.current = await nativeLocationService.watchPositionAsync(
      { timeInterval: 1000, distanceInterval: 1 },
      (location) => {
        const point = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        setCurrent(point);
        setPreviewPath((points) => [...points.slice(-999), point]);
      },
    );
  };

  useEffect(() => {
    startLocation();
    return () => subscription.current?.remove();
  }, []);

  if (permission === 'checking') return <View style={styles.center}><ActivityIndicator /><Text style={styles.copy}>Checking field location…</Text></View>;

  if (permission !== 'granted') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{permission === 'services_disabled' ? 'Location services are off' : 'Location permission is required'}</Text>
        <Text style={styles.copy}>Market Mapper needs foreground location to show your position and record market paths.</Text>
        <Pressable style={styles.button} onPress={startLocation}><Text style={styles.buttonText}>Try Again</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <NativeFieldMap currentLocation={current} path={previewPath} />
      <View style={styles.hud}>
        <Text style={styles.hudTitle}>GPS LIVE</Text>
        <Text style={styles.hudText}>{current ? 'Position acquired' : 'Searching for position…'}</Text>
        <Text style={styles.warning}>Preview only — this trace is not yet a saved mapping path.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FAF8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F7FAF8' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  copy: { marginTop: 10, fontSize: 15, lineHeight: 22, color: '#4B5563', textAlign: 'center' },
  button: { marginTop: 20, minHeight: 48, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#047857' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  hud: { position: 'absolute', left: 16, right: 16, top: 16, padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#9CA3AF' },
  hudTitle: { fontSize: 13, fontWeight: '900', color: '#047857', letterSpacing: 1 },
  hudText: { marginTop: 4, fontSize: 15, fontWeight: '700', color: '#111827' },
  warning: { marginTop: 4, fontSize: 12, color: '#92400E' },
});
