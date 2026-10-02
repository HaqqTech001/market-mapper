import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export function ScreenSafeArea({children,bottom=false}:{children:ReactNode;bottom?:boolean}){
 return <SafeAreaView style={s.safe} edges={bottom?['top','left','right','bottom']:['top','left','right']}>{children}</SafeAreaView>;
}
export function ScreenHeader({eyebrow,title,back=false,right}:{eyebrow:string;title:string;back?:boolean;right?:ReactNode}){
 return <View style={s.header}>{back?<Pressable accessibilityLabel="Go back" style={s.iconButton} onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color="#111827"/></Pressable>:null}<View style={s.headerText}><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.title} numberOfLines={2}>{title}</Text></View>{right}</View>
}
export function IconButton({name,label,onPress,badge}:{name:any;label:string;onPress:()=>void;badge?:number}){
 return <Pressable accessibilityLabel={label} style={s.iconButton} onPress={onPress}><Ionicons name={name} size={24} color="#111827"/>{badge?<View style={s.badge}><Text style={s.badgeText}>{badge>99?'99+':badge}</Text></View>:null}</Pressable>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#F7FAF8'},header:{minHeight:76,paddingHorizontal:16,paddingVertical:12,backgroundColor:'#FFF',borderBottomWidth:2,borderColor:'#D1D5DB',flexDirection:'row',alignItems:'center',gap:10},headerText:{flex:1,minWidth:0},eyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1.1,color:'#047857'},title:{fontSize:22,fontWeight:'900',color:'#111827',marginTop:2},iconButton:{width:48,height:48,borderRadius:13,borderWidth:2,borderColor:'#D1D5DB',backgroundColor:'#FFF',alignItems:'center',justifyContent:'center'},badge:{position:'absolute',right:-5,top:-6,minWidth:22,height:22,borderRadius:11,paddingHorizontal:4,backgroundColor:'#B91C1C',alignItems:'center',justifyContent:'center'},badgeText:{color:'#FFF',fontSize:9,fontWeight:'900'}});
