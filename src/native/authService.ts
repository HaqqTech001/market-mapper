import { nativeSupabase } from './supabase';

export async function signInNative(email: string, password: string) {
  const { data, error } = await nativeSupabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  if (!data.session) throw new Error('SIGN_IN_SESSION_MISSING');
  return data.session;
}

export async function signUpNative(input: { fullName: string; email: string; password: string; phone?: string }) {
  const { data, error } = await nativeSupabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: { data: { full_name: input.fullName.trim(), phone: input.phone?.trim() || null } },
  });
  if (error) throw error;
  return { user: data.user, session: data.session, verificationRequired: Boolean(data.user && !data.session) };
}

export async function verifySignupOtp(email: string, token: string) {
  const { data, error } = await nativeSupabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'signup',
  });
  if (error) throw error;
  if (!data.session) throw new Error('VERIFICATION_SESSION_MISSING');
  return data.session;
}

export async function resendSignupVerification(email: string) {
  const { error } = await nativeSupabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const { error } = await nativeSupabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: 'marketmapper://reset-password' });
  if (error) throw error;
}

export async function signOutNative() {
  const { error } = await nativeSupabase.auth.signOut();
  if (error) throw error;
}
