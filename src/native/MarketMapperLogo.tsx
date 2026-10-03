import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function MarketMapperLogo({size=64,showName=false,style}:{size?:number;showName?:boolean;style?:ViewStyle}){
 const pin=Math.round(size*.72);
 return <View style={[s.row,style]}><View style={[s.mark,{width:size,height:size,borderRadius:Math.round(size*.25)}]}><View style={s.gridH}/><View style={s.gridV}/><Ionicons name="location" size={pin} color="#047857"/><View style={[s.center,{width:Math.max(7,size*.14),height:Math.max(7,size*.14),borderRadius:size*.07}]}/></View>{showName?<View><Text style={[s.name,{fontSize:Math.max(18,size*.34)}]}>Market Mapper</Text><Text style={s.tag}>FIELD MAPPING</Text></View>:null}</View>
}
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',gap:11},mark:{backgroundColor:'#ECFDF5',borderWidth:2,borderColor:'#047857',alignItems:'center',justifyContent:'center',overflow:'hidden'},gridH:{position:'absolute',left:5,right:5,height:2,backgroundColor:'#A7F3D0'},gridV:{position:'absolute',top:5,bottom:5,width:2,backgroundColor:'#A7F3D0'},center:{position:'absolute',backgroundColor:'#FFF',borderWidth:2,borderColor:'#065F46'},name:{fontWeight:'900',letterSpacing:-.5,color:'#0F172A'},tag:{fontSize:9,fontWeight:'900',letterSpacing:1.7,color:'#047857',marginTop:1}});
