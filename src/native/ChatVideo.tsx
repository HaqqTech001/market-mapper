import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

export function ChatVideo({uri,compact=false}:{uri:string;compact?:boolean}){
 const player=useVideoPlayer(uri,p=>{p.loop=false});
 return <View style={[s.frame,compact&&s.compact]}><VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false}/><Pressable accessibilityLabel="Play video" style={s.play} onPress={()=>player.play()}><Ionicons name="play" size={compact?25:34} color="#FFF"/></Pressable></View>
}
const s=StyleSheet.create({frame:{width:'100%',aspectRatio:16/9,backgroundColor:'#0F172A',borderRadius:12,overflow:'hidden'},compact:{width:240,marginTop:7},play:{position:'absolute',left:'50%',top:'50%',transform:[{translateX:-27},{translateY:-27}],width:54,height:54,borderRadius:27,backgroundColor:'rgba(15,23,42,.72)',alignItems:'center',justifyContent:'center'}});
