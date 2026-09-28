/**
 * Market Mapper — Supabase Authentication & Profile Service
 * Phase 2B, 2C, 2D, 2G, 2H, 2M, 2N Integration
 *
 * Implements:
 * - Session restoration & Token refresh
 * - Offline cached profile fallback (without plaintext passwords)
 * - Sign Out safety (preserves pending SQLite records)
 * - Administrative role mutation & user deactivation/reactivation RPC calls
 */

import { supabase, isSupabaseConfigured } from '../supabase';
import { Profile, UserRole } from '../../types';

const PROFILE_CACHE_KEY = 'mm_cached_profile';
const SESSION_CACHE_KEY = 'mm_cached_session_user';

export interface AuthResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  isOfflineFallback?: boolean;
}

export const AuthService = {
  /**
   * Restores existing authenticated session or cached offline session
   */
  async getInitialSession(): Promise<{ user: Profile | null; isOffline: boolean }> {
    if (!isSupabaseConfigured()) {
      // In offline or pre-configured state, check local cache
      const cached = AuthService.getCachedProfile();
      return { user: cached, isOffline: true };
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        // Fallback to offline cached profile if available
        const cached = AuthService.getCachedProfile();
        return { user: cached, isOffline: !window.navigator.onLine };
      }

      const profile = await AuthService.fetchProfile(data.session.user.id);
      if (profile) {
        AuthService.setCachedProfile(profile);
        return { user: profile, isOffline: false };
      }

      return { user: null, isOffline: false };
    } catch (err) {
      console.warn('Network error checking session, falling back to local cache:', err);
      const cached = AuthService.getCachedProfile();
      return { user: cached, isOffline: true };
    }
  },

  /**
   * Fetches profile from Supabase with offline cache fallback
   */
  async fetchProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured()) {
      return AuthService.getCachedProfile();
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return AuthService.getCachedProfile();
      }

      const profile: Profile = {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        phone: data.phone || undefined,
        role: data.role as UserRole,
        isActive: data.is_active,
        avatarUrl: data.avatar_path || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      AuthService.setCachedProfile(profile);
      return profile;
    } catch (err) {
      console.warn('Error fetching profile from cloud, reading cache:', err);
      return AuthService.getCachedProfile();
    }
  },

  /**
   * Signs in user with email and password
   * Validates account active status (inactive accounts are immediately rejected)
   */
  async signIn(email: string, password: string): Promise<AuthResponse<Profile>> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase credentials are not configured in environment (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY).',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Authentication returned no user record.' };
      }

      const profile = await AuthService.fetchProfile(data.user.id);
      if (!profile) {
        return {
          success: false,
          error: 'User account profile not found. Please contact support.',
        };
      }

      // Check user deactivation (Phase 2H)
      if (!profile.isActive) {
        await supabase.auth.signOut();
        AuthService.clearCachedProfile();
        return {
          success: false,
          error: 'Your account has been deactivated. Please contact an administrator.',
        };
      }

      AuthService.setCachedProfile(profile);
      return { success: true, data: profile };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'An unexpected network error occurred during sign in.',
      };
    }
  },

  /**
   * Registers a new Mapper account
   * STRICT: Never sends elevated roles. Server database default enforces role = 'mapper'.
   */
  async signUp(
    fullName: string,
    email: string,
    password: string,
    phone?: string
  ): Promise<AuthResponse<{ user: any; session: any; requiresVerification: boolean }>> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase is not configured. Please supply EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone ? phone.trim() : null,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const requiresVerification = !data.session && Boolean(data.user);

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
          requiresVerification,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during registration.',
      };
    }
  },

  /**
   * Initiates password reset email
   */
  async requestPasswordReset(email: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase is not configured in environment.',
      };
    }

    try {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectUrl = `${currentOrigin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to send password reset request.',
      };
    }
  },

  /**
   * Completes password reset with new password
   */
  async confirmPasswordReset(newPassword: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase is not configured in environment.',
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to update password.',
      };
    }
  },

  /**
   * Resends verification email
   */
  async resendVerificationEmail(email: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase is not configured in environment.',
      };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to resend confirmation email.',
      };
    }
  },

  /**
   * Sign Out Safety (Phase 2N)
   * Signs out of Supabase Auth and clears session tokens.
   * DOES NOT delete local SQLite field records or outbox queue!
   */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out call failed (offline):', err);
      }
    }
    AuthService.clearCachedProfile();
  },

  /**
   * Admin Role Mutation (Phase 2G)
   * Executes secure SECURITY DEFINER RPC on Supabase PostgreSQL
   */
  async adminUpdateUserRole(
    targetUserId: string,
    newRole: UserRole
  ): Promise<AuthResponse> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Live Supabase connection required for role changes.' };
    }

    try {
      const { data, error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: targetUserId,
        new_role: newRole,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update user role.' };
    }
  },

  /**
   * Admin User Deactivation/Reactivation (Phase 2H)
   * Executes secure SECURITY DEFINER RPC on Supabase PostgreSQL
   */
  async adminSetUserActiveStatus(
    targetUserId: string,
    isActiveStatus: boolean
  ): Promise<AuthResponse> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Live Supabase connection required for deactivation.' };
    }

    try {
      const { data, error } = await supabase.rpc('admin_set_user_active_status', {
        target_user_id: targetUserId,
        new_active_status: isActiveStatus,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to modify user status.' };
    }
  },

  /**
   * Offline Profile Cache Helpers
   */
  getCachedProfile(): Profile | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed reading profile cache:', err);
    }
    return null;
  },

  setCachedProfile(profile: Profile): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
      }
    } catch (err) {
      console.warn('Failed writing profile cache:', err);
    }
  },

  clearCachedProfile(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(PROFILE_CACHE_KEY);
        window.localStorage.removeItem(SESSION_CACHE_KEY);
      }
    } catch (err) {
      console.warn('Failed clearing profile cache:', err);
    }
  },
};
