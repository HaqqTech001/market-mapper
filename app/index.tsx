import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function NativeFoundationScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>MARKET MAPPER</Text>
        <Text style={styles.title}>Native field app foundation</Text>
        <Text style={styles.body}>
          React Native + Expo is now the authoritative runtime on this migration branch.
          Existing field workflows remain preserved in src while they are ported in controlled stages.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stage 1</Text>
          <Text style={styles.cardText}>Native shell established. No production field workflow has been claimed as migrated yet.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7FAF8' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  eyebrow: { color: '#047857', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#111827', fontSize: 32, lineHeight: 38, fontWeight: '800' },
  body: { color: '#374151', fontSize: 16, lineHeight: 24, maxWidth: 640 },
  card: { marginTop: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 16, padding: 18 },
  cardTitle: { color: '#065F46', fontSize: 17, fontWeight: '800', marginBottom: 6 },
  cardText: { color: '#374151', fontSize: 15, lineHeight: 22 }
});
