import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';

const items=[['/','Home'],['/map','Map'],['/missions','Missions'],['/chat','Chat'],['/more','More']] as const;
export function FieldBottomNav(){
 const path=usePathname();
 return <View style={s.wrap}>{items.map(([href,label])=>{const active=href==='/'?path==='/':path.startsWith(href);return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} key={href} style={s.item} onPress={()=>router.replace(href)}><View style={[s.marker,active&&s.markerActive]}/><Text style={[s.text,active&&s.active]}>{label}</Text></Pressable>})}</View>
}
const s=StyleSheet.create({wrap:{minHeight:68,paddingBottom:6,borderTopWidth:2,borderColor:'#D1D5DB',backgroundColor:'#FFF',flexDirection:'row',alignItems:'stretch'},item:{flex:1,minHeight:60,alignItems:'center',justifyContent:'center',gap:5},marker:{width:22,height:4,borderRadius:2,backgroundColor:'transparent'},markerActive:{backgroundColor:'#047857'},text:{fontSize:12,fontWeight:'800',color:'#6B7280'},active:{color:'#065F46'}});
