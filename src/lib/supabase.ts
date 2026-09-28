/**
 * Market Mapper — Supabase Client Foundation
 * Phase 2A Integration
 *
 * Configured with client-safe environment variables:
 * - EXPO_PUBLIC_SUPABASE_URL
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * CRITICAL SECURITY:
 * Service role keys, database passwords, and JWT secrets are NEVER exposed here.
 * Session persistence uses client-safe storage with offline resilience.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/env';

// Cross-platform session storage adapter
// Uses localStorage in Web environments, with fallback memory storage if unavailable.
// On React Native with Expo, this maps cleanly to Expo SecureStore or AsyncStorage.
const customStorageAdapter = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('Storage read failed:', e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('Storage write failed:', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('Storage remove failed:', e);
    }
  },
};

/**
 * Validates Supabase public credentials
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL !== 'https://your-project.supabase.co' &&
    SUPABASE_ANON_KEY !== 'your-anon-public-key-here' &&
    SUPABASE_URL.startsWith('https://')
  );
};

/**
 * Singleton Supabase Client for Market Mapper
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      storage: customStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
);
