import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

const format=(ms:number)=>{const sec=Math.max(0,Math.floor(ms/1000));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')};

export function VoiceNotePlayer({uri,durationMs=0,onNeedDownload}:{uri?:string;durationMs?:number;onNeedDownload?:()=>void}){
 const source=useMemo(()=>uri?{uri}:null,[uri]);
 const player=useAudioPlayer(source);
 const status=useAudioPlayerStatus(player);
 useEffect(()=>{if(uri)player.replace({uri})},[uri]);
 if(!uri)return <Pressable style={s.wrap} onPress={onNeedDownload}><View style={s.play}><Ionicons name="arrow-down" size={18} color="#087F5B"/></View><View style={s.line}/><Text style={s.time}>Download voice note</Text></Pressable>;
 const current=Math.round((status.currentTime||0)*1000); const total=Math.round((status.duration||0)*1000)||durationMs;
 return <View style={s.wrap}><Pressable style={s.play} onPress={()=>status.playing?player.pause():player.play()}><Ionicons name={status.playing?'pause':'play'} size={19} color="#087F5B"/></Pressable><View style={s.track}><View style={[s.progress,{width:(total?Math.min(100,current/total*100):0)+'%'}]}/></View><Text style={s.time}>{format(current)} / {format(total)}</Text></View>
}
const s=StyleSheet.create({wrap:{minWidth:225,minHeight:54,flexDirection:'row',alignItems:'center',gap:9,paddingVertical:5},play:{width:38,height:38,borderRadius:19,backgroundColor:'#FFF',alignItems:'center',justifyContent:'center'},track:{flex:1,height:4,borderRadius:2,backgroundColor:'#CBD5E1',overflow:'hidden'},progress:{height:4,backgroundColor:'#087F5B'},line:{flex:1,height:4,backgroundColor:'#CBD5E1',borderRadius:2},time:{fontSize:10,color:'#64748B',fontVariant:['tabular-nums']}});
