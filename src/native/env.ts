export const nativeEnv = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '',
};

export const isNativeSupabaseConfigured =
  nativeEnv.supabaseUrl.startsWith('https://') &&
  nativeEnv.supabaseUrl !== 'https://your-project.supabase.co' &&
  nativeEnv.supabaseAnonKey.length > 20 &&
  nativeEnv.supabaseAnonKey !== 'your-anon-public-key-here';
