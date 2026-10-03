import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';

export type VoiceNoteResult={uri:string;durationMs:number;name:string;mimeType:string};

export function VoiceNoteRecorder({onRecorded,onError}:{onRecorded:(v:VoiceNoteResult)=>Promise<void>|void;onError:(e:unknown)=>void}){
 const recorder=useAudioRecorder(RecordingPresets.HIGH_QUALITY);
 const [recording,setRecording]=useState(false); const [seconds,setSeconds]=useState(0); const timer=useRef<ReturnType<typeof setInterval>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearInterval(timer.current)},[]);
 const stopTimer=()=>{if(timer.current){clearInterval(timer.current);timer.current=null}};
 const start=async()=>{try{const p=await AudioModule.requestRecordingPermissionsAsync();if(!p.granted){Alert.alert('Microphone permission needed','Allow microphone access to record a voice note.');return}await recorder.prepareToRecordAsync();recorder.record();setSeconds(0);setRecording(true);timer.current=setInterval(()=>setSeconds(v=>v+1),1000)}catch(e){onError(e)}};
 const cancel=async()=>{try{await recorder.stop();}catch{}finally{stopTimer();setRecording(false);setSeconds(0)}};
 const finish=async()=>{try{await recorder.stop();stopTimer();setRecording(false);const uri=recorder.uri;if(!uri)throw new Error('recording unavailable');await onRecorded({uri,durationMs:seconds*1000,name:'voice-note-'+Date.now()+'.m4a',mimeType:'audio/mp4'});setSeconds(0)}catch(e){onError(e)}};
 if(!recording)return <Pressable style={s.mic} onPress={start} accessibilityLabel="Record voice note"><Ionicons name="mic" size={23} color="#087F5B"/></Pressable>;
 return <View style={s.bar}><Pressable style={s.cancel} onPress={cancel}><Ionicons name="trash-outline" size={21} color="#B91C1C"/></Pressable><View style={s.dot}/><Text style={s.time}>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</Text><Text style={s.hint}>Recording voice note</Text><Pressable style={s.done} onPress={finish}><Ionicons name="send" size={18} color="#FFF"/></Pressable></View>
}
const s=StyleSheet.create({mic:{width:42,height:46,alignItems:'center',justifyContent:'center'},bar:{flex:1,minHeight:50,flexDirection:'row',alignItems:'center',gap:9,backgroundColor:'#FFF',paddingHorizontal:8},cancel:{width:38,height:42,alignItems:'center',justifyContent:'center'},dot:{width:8,height:8,borderRadius:4,backgroundColor:'#DC2626'},time:{fontVariant:['tabular-nums'],fontWeight:'800',color:'#334155'},hint:{flex:1,fontSize:12,color:'#64748B'},done:{width:40,height:40,borderRadius:20,backgroundColor:'#087F5B',alignItems:'center',justifyContent:'center'}});
