import { createClient } from '@supabase/supabase-js';
import { nativeAuthStorage } from './authStorage';
import { isNativeSupabaseConfigured, nativeEnv } from './env';

const placeholderUrl = 'https://placeholder.supabase.co';
const placeholderKey = 'placeholder-anon-key';

export const nativeSupabase = createClient(
  isNativeSupabaseConfigured ? nativeEnv.supabaseUrl : placeholderUrl,
  isNativeSupabaseConfigured ? nativeEnv.supabaseAnonKey : placeholderKey,
  {
    auth: {
      storage: nativeAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);
