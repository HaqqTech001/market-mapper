import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export function ChatImageViewer({uri,name,visible,onClose}:{uri:string;name?:string;visible:boolean;onClose:()=>void}){
 return <Modal visible={visible} animationType="fade" onRequestClose={onClose}><View style={s.page}><View style={s.header}><Pressable style={s.close} onPress={onClose}><Ionicons name="arrow-back" size={25} color="#FFF"/></Pressable><Text numberOfLines={1} style={s.title}>{name||'Photo'}</Text></View><Image source={{uri}} resizeMode="contain" style={s.image}/></View></Modal>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#0B1220'},header:{height:66,paddingTop:8,flexDirection:'row',alignItems:'center'},close:{width:52,height:52,alignItems:'center',justifyContent:'center'},title:{flex:1,color:'#FFF',fontSize:15,fontWeight:'800',marginRight:16},image:{flex:1,width:'100%',height:'100%'}});