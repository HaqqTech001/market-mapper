import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

export const SplashScreen: React.FC = () => {
  const { navigateTo, dbReady, dbStats } = useApp();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>MM</Text>
            </View>
            <Text style={styles.brandText}>MARKET MAPPER V1</Text>
          </View>

          <View style={styles.readyBadge}>
            <Text style={styles.readyBadgeText}>Local SQLite Ready</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.iconBox}>
            <Ionicons name="location" size={42} color="#047857" />
          </View>

          <Text style={styles.title}>Market Mapper</Text>
          <Text style={styles.subtitle}>
            Offline-first field data collection for informal markets, corridor
            footpaths, and trader inventory.
          </Text>

          <View style={styles.storageCard}>
            <View style={styles.storageTitleRow}>
              <Ionicons name="shield-checkmark" size={18} color="#6ee7b7" />
              <Text style={styles.storageTitle}>SQLite Offline Engine Active</Text>
            </View>
            <Text style={styles.storageText}>
              {dbReady
                ? `Embedded database initialized (${dbStats.totalTables} tables, Nigerian catalogue ready). Field mappings store locally first.`
                : 'Initializing local database schema and reference catalogue...'}
            </Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in to mission"
            disabled={!dbReady}
            onPress={() => navigateTo('sign_in')}
            style={({ pressed }) => [
              styles.signInButton,
              pressed && dbReady && styles.signInButtonPressed,
              !dbReady && styles.signInButtonDisabled,
            ]}
          >
            {!dbReady && <ActivityIndicator size="small" color="#064e3b" />}
            <Text style={styles.signInButtonText}>
              {dbReady ? 'Sign In to Mission' : 'Preparing Offline Database...'}
            </Text>
          </Pressable>

          <Text style={styles.footerText}>
            Operates seamlessly without active cellular or internet connection
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#065f46',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#065f46',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 8,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  brandMarkText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  brandText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  readyBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  readyBadgeText: {
    color: '#d1fae5',
    fontSize: 10,
    fontWeight: '700',
  },
  hero: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    color: '#d1fae5',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  storageCard: {
    width: '100%',
    marginTop: 30,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  storageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  storageTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  storageText: {
    color: '#d1fae5',
    fontSize: 11,
    lineHeight: 17,
  },
  bottom: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 12,
  },
  signInButton: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18,
    backgroundColor: '#ffffff',
  },
  signInButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  signInButtonDisabled: {
    opacity: 0.72,
  },
  signInButtonText: {
    color: '#064e3b',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  footerText: {
    color: '#a7f3d0',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
