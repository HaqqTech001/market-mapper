import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

export function ChatVideo({uri,compact=false}:{uri:string;compact?:boolean}){
 const [expanded,setExpanded]=useState(false);
 const [playing,setPlaying]=useState(false);
 const player=useVideoPlayer(uri,p=>{p.loop=false});
 useEffect(()=>{const sub=player.addListener('playingChange',({isPlaying})=>setPlaying(isPlaying));return()=>sub.remove()},[player]);
 const toggle=()=>playing?player.pause():player.play();
 return <>
  <View style={[s.frame,compact&&s.compact]}>
   <Pressable style={StyleSheet.absoluteFill} onPress={()=>setExpanded(true)}>
    <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false}/>
   </Pressable>
   <Pressable accessibilityLabel={playing?'Pause video':'Play video'} style={s.play} onPress={toggle}><Ionicons name={playing?'pause':'play'} size={compact?25:34} color="#FFF"/></Pressable>
   <Pressable accessibilityLabel="Open video" style={s.expand} onPress={()=>setExpanded(true)}><Ionicons name="expand-outline" size={19} color="#FFF"/></Pressable>
  </View>
  <Modal visible={expanded} animationType="fade" statusBarTranslucent onRequestClose={()=>setExpanded(false)}>
   <View style={s.viewer}><View style={s.viewerTop}><Text numberOfLines={1} style={s.viewerTitle}>Video</Text><Pressable style={s.close} onPress={()=>setExpanded(false)}><Ionicons name="close" size={28} color="#FFF"/></Pressable></View><VideoView player={player} style={s.fullVideo} contentFit="contain" nativeControls/><Pressable style={s.bigToggle} onPress={toggle}><Ionicons name={playing?'pause':'play'} size={34} color="#FFF"/></Pressable></View>
  </Modal>
 </>;
}
const s=StyleSheet.create({frame:{width:'100%',aspectRatio:16/9,backgroundColor:'#0F172A',borderRadius:12,overflow:'hidden'},compact:{width:240,marginTop:7},play:{position:'absolute',left:'50%',top:'50%',transform:[{translateX:-27},{translateY:-27}],width:54,height:54,borderRadius:27,backgroundColor:'rgba(15,23,42,.72)',alignItems:'center',justifyContent:'center'},expand:{position:'absolute',right:8,top:8,width:36,height:36,borderRadius:18,backgroundColor:'rgba(15,23,42,.7)',alignItems:'center',justifyContent:'center'},viewer:{flex:1,backgroundColor:'#020617',justifyContent:'center'},viewerTop:{position:'absolute',zIndex:3,top:0,left:0,right:0,paddingTop:48,paddingHorizontal:16,height:100,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(2,6,23,.72)'},viewerTitle:{flex:1,color:'#FFF',fontWeight:'800'},close:{width:44,height:44,alignItems:'center',justifyContent:'center'},fullVideo:{width:'100%',aspectRatio:16/9},bigToggle:{position:'absolute',alignSelf:'center',width:64,height:64,borderRadius:32,backgroundColor:'rgba(15,23,42,.68)',alignItems:'center',justifyContent:'center'}});