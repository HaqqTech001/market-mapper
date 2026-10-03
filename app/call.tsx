import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalParticipant, useRoomContext, VideoTrack, isTrackReference, useTracks } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { router, useLocalSearchParams } from 'expo-router';
import { nativeSupabase } from '@/src/native/supabase';
import { LiveKitRoom } from '@livekit/react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CallScreen(){
 const {channelId,type='audio',room:existingRoom}=useLocalSearchParams<{channelId:string;type:'audio'|'video';room?:string}>();
 const [cfg,setCfg]=useState<{token:string;url:string;room:string;callType:string}|null>(null);const [error,setError]=useState('');
 useEffect(()=>{(async()=>{const {data,error}=await nativeSupabase.functions.invoke('livekit-token',{body:{channelId,callType:type,roomName:existingRoom}});if(error)throw error;setCfg(data)})().catch(e=>setError(e instanceof Error?e.message:'Could not connect to the call'))},[channelId,type,existingRoom]);
 if(error)return <View style={s.center}><Text style={s.error}>{error}</Text><Pressable style={s.leave} onPress={()=>router.back()}><Text style={s.leaveText}>Back to chat</Text></Pressable></View>;
 if(!cfg)return <View style={s.center}><ActivityIndicator/><Text style={s.help}>Connecting securely…</Text></View>;
 return <LiveKitRoom serverUrl={cfg.url} token={cfg.token} connect audio={true} video={type==='video'}><CallBody video={type==='video'}/></LiveKitRoom>
}
function CallBody({video}:{video:boolean}){const room=useRoomContext();const {localParticipant}=useLocalParticipant();const [mic,setMic]=useState(true);const [cam,setCam]=useState(video);const tracks=useTracks([Track.Source.Camera]);
 const toggleMic=async()=>{const n=!mic;await localParticipant.setMicrophoneEnabled(n);setMic(n)};const toggleCam=async()=>{const n=!cam;await localParticipant.setCameraEnabled(n);setCam(n)};
 return <View style={s.page}><View style={s.top}><Text style={s.callTitle}>{video?'Video call':'Audio call'}</Text><Text style={s.secure}>Market Mapper team call</Text></View>{video?<View style={s.grid}>{tracks.filter(isTrackReference).map(t=><VideoTrack key={t.publication.trackSid} trackRef={t} style={s.video}/>)}</View>:<View style={s.audioHero}><View style={s.avatar}><Ionicons name="people" size={54} color="#047857"/></View><Text style={s.audioText}>Team audio call</Text></View>}<View style={s.controls}><Pressable style={s.control} onPress={toggleMic}><Ionicons name={mic?'mic':'mic-off'} size={24} color="#FFF"/></Pressable>{video?<Pressable style={s.control} onPress={toggleCam}><Ionicons name={cam?'videocam':'videocam-off'} size={24} color="#FFF"/></Pressable>:null}<Pressable style={s.end} onPress={async()=>{await room.disconnect();router.back()}}><Ionicons name="call" size={25} color="#FFF"/></Pressable></View></View>}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#0F172A',paddingTop:54},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:'#F8FAFC'},help:{marginTop:10,color:'#64748B'},error:{fontSize:15,color:'#991B1B',textAlign:'center',marginBottom:16},leave:{backgroundColor:'#047857',paddingHorizontal:18,paddingVertical:13,borderRadius:12},leaveText:{color:'#FFF',fontWeight:'900'},top:{padding:18},callTitle:{fontSize:22,fontWeight:'900',color:'#FFF'},secure:{fontSize:12,color:'#94A3B8',marginTop:3},grid:{flex:1,padding:8,gap:8},video:{flex:1,minHeight:180,borderRadius:18,overflow:'hidden'},audioHero:{flex:1,alignItems:'center',justifyContent:'center'},avatar:{width:126,height:126,borderRadius:63,backgroundColor:'#D1FAE5',alignItems:'center',justifyContent:'center'},audioText:{color:'#FFF',fontSize:19,fontWeight:'800',marginTop:18},controls:{minHeight:110,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:22},control:{width:58,height:58,borderRadius:29,backgroundColor:'#334155',alignItems:'center',justifyContent:'center'},end:{width:64,height:64,borderRadius:32,backgroundColor:'#DC2626',alignItems:'center',justifyContent:'center',transform:[{rotate:'135deg'}]}});
