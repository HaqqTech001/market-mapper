/**
 * Market Mapper Runtime Configuration & Environment Flags
 * Phase 2 Supabase Foundation
 */

export const IS_DEV =
  typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production'
    ? false
    : true;

export const APP_VERSION = '1.0.0-phase2.auth';

// Supabase Public Configuration (Phase 2)
// Access client-safe environment variables across Vite/Expo environments
export const SUPABASE_URL: string =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.EXPO_PUBLIC_SUPABASE_URL) ||
  '';

export const SUPABASE_ANON_KEY: string =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  '';
