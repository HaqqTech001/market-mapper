import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthScreenShell, authStyles as s } from '@/src/native/AuthScreenShell';
import { resendSignupVerification, verifySignupOtp } from '@/src/native/authService';

const LENGTH=6;
export default function VerifyAccountScreen(){
 const p=useLocalSearchParams<{email?:string}>();const email=typeof p.email==='string'?p.email:'';const[code,setCode]=useState('');const[busy,setBusy]=useState(false);const[message,setMessage]=useState('Enter the 6-digit code sent to your email.');const[error,setError]=useState('');const input=useRef<TextInput>(null);
 const digits=useMemo(()=>Array.from({length:LENGTH},(_,i)=>code[i]||''),[code]);
 const verify=async()=>{if(code.length!==LENGTH){setError('Enter the complete 6-digit verification code.');return;}setBusy(true);setError('');try{await verifySignupOtp(email,code);router.replace('/');}catch(e){setError(e instanceof Error?e.message:'Verification failed.')}finally{setBusy(false)}};
 const resend=async()=>{if(!email)return;setBusy(true);setError('');try{await resendSignupVerification(email);setCode('');setMessage('A new verification code has been sent.')}catch(e){setError(e instanceof Error?e.message:'Could not resend verification code.')}finally{setBusy(false)}};
 return <AuthScreenShell title="Verify your email" subtitle={email?'Code sent to '+email:'Enter the verification code from your email.'}>
  <Text style={s.success}>{message}</Text>
  <Pressable style={o.row} onPress={()=>input.current?.focus()}>{digits.map((d,i)=><View key={i} style={[o.box,code.length===i&&o.active]}><Text style={o.digit}>{d}</Text></View>)}</Pressable>
  <TextInput ref={input} value={code} onChangeText={v=>setCode(v.replace(/\D/g,'').slice(0,LENGTH))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={LENGTH} style={o.hidden} autoFocus/>
  {error?<Text style={s.error}>{error}</Text>:null}
  <Pressable disabled={busy} style={s.primary} onPress={verify}><Text style={s.primaryText}>{busy?'Please wait…':'Verify Email'}</Text></Pressable>
  <Pressable disabled={busy} style={s.link} onPress={resend}><Text style={s.linkText}>Resend code</Text></Pressable>
  <Pressable style={s.link} onPress={()=>router.replace('/sign-in')}><Text style={s.linkText}>Back to Sign In</Text></Pressable>
 </AuthScreenShell>
}
const o=StyleSheet.create({row:{flexDirection:'row',gap:7,marginTop:20,justifyContent:'space-between'},box:{flex:1,maxWidth:48,height:54,borderRadius:11,borderWidth:2,borderColor:'#D1D5DB',backgroundColor:'#FFF',alignItems:'center',justifyContent:'center'},active:{borderColor:'#047857'},digit:{fontSize:22,fontWeight:'900',color:'#111827'},hidden:{position:'absolute',width:1,height:1,opacity:0}});
