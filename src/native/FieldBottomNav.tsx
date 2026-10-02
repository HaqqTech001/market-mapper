import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const items=[
 {href:'/' as const,label:'Home',icon:'home-outline',active:'home'},
 {href:'/map' as const,label:'Map',icon:'map-outline',active:'map'},
 {href:'/missions' as const,label:'Missions',icon:'clipboard-outline',active:'clipboard'},
 {href:'/chat' as const,label:'Chat',icon:'chatbubbles-outline',active:'chatbubbles'},
 {href:'/more' as const,label:'More',icon:'menu-outline',active:'menu'},
] as const;
export function FieldBottomNav(){
 const path=usePathname();const insets=useSafeAreaInsets();
 return <View style={[s.wrap,{paddingBottom:Math.max(6,insets.bottom)}]}>{items.map(item=>{const selected=item.href==='/'?path==='/':path.startsWith(item.href);return <Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected}} key={item.href} style={s.item} onPress={()=>router.replace(item.href)}><Ionicons name={(selected?item.active:item.icon) as any} size={23} color={selected?'#047857':'#6B7280'}/><Text style={[s.text,selected&&s.active]}>{item.label}</Text></Pressable>})}</View>
}
const s=StyleSheet.create({wrap:{minHeight:68,borderTopWidth:2,borderColor:'#D1D5DB',backgroundColor:'#FFF',flexDirection:'row',alignItems:'stretch'},item:{flex:1,minHeight:60,alignItems:'center',justifyContent:'center',gap:4},text:{fontSize:11,fontWeight:'800',color:'#6B7280'},active:{color:'#065F46'}});
