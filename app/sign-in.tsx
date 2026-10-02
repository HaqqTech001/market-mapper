import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthScreenShell, authStyles as s } from '@/src/native/AuthScreenShell';
import { signInNative } from '@/src/native/authService';
export default function SignInScreen(){
 const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[show,setShow]=useState(false);const[busy,setBusy]=useState(false);const[error,setError]=useState('');
 const submit=async()=>{if(!email.trim()||!password){setError('Enter your email and password.');return;}setBusy(true);setError('');try{await signInNative(email,password);router.replace('/');}catch(e){setError(e instanceof Error?e.message:'Sign in failed.');}finally{setBusy(false)}};
 return <AuthScreenShell title="Sign in" subtitle="Use your individual Market Mapper account to continue field operations.">
  <Text style={s.label}>Email</Text><TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" returnKeyType="next"/>
  <Text style={s.label}>Password</Text><Pressable style={s.passwordRow}><TextInput style={s.passwordInput} value={password} onChangeText={setPassword} secureTextEntry={!show} autoComplete="current-password" returnKeyType="done" onSubmitEditing={submit}/><Pressable accessibilityLabel={show?'Hide password':'Show password'} style={s.eye} onPress={()=>setShow(v=>!v)}><Ionicons name={show?'eye-off-outline':'eye-outline'} size={23} color="#374151"/></Pressable></Pressable>
  {error?<Text style={s.error}>{error}</Text>:null}<Pressable disabled={busy} style={s.primary} onPress={submit}><Text style={s.primaryText}>{busy?'Signing in…':'Sign In'}</Text></Pressable>
  <Pressable style={s.link} onPress={()=>router.push('/forgot-password')}><Text style={s.linkText}>Forgot password?</Text></Pressable><Pressable style={s.link} onPress={()=>router.push('/register')}><Text style={s.linkText}>Create an account</Text></Pressable>
 </AuthScreenShell>
}