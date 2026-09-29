import type { ReactNode } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useDeviceClass } from '@/src/native/useDeviceClass';

export function NativeShell({ children }: { children: ReactNode }) {
  const deviceClass = useDeviceClass();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.shell, deviceClass === 'tablet' && styles.tablet]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FAF8' },
  shell: { flex: 1, width: '100%' },
  tablet: { alignSelf: 'center', maxWidth: 1400 }
});
