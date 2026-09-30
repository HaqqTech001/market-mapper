import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { RevisitRepository } from '@/src/db/repositories/RevisitRepository';
import { requireNativeUserContext } from '@/src/native/userContext';
import type { Revisit } from '@/src/types';

export default function RevisitsScreen(){
 const [items,setItems]=useState<Revisit[]>([]);
 const load=useCallback(async()=>{const u=await requireNativeUserContext();const all=await RevisitRepository.getAll();setItems(all.filter(x=>x.status==='open'&&(!x.assignedTo||x.assignedTo===u.userId)))},[]);
 useFocusEffect(useCallback(()=>{load()},[load]));
 return <View style={s.page}><Header title="Revisits"/><ScrollView contentContainerStyle={s.body}>{items.length===0?<Text style={s.empty}>No open revisits assigned to you.</Text>:items.map(x=><Pressable key={x.id} style={s.card} onPress={()=>router.push('/map')}><Text style={s.type}>{x.reason.replaceAll('_',' ').toUpperCase()}</Text><Text style={s.title}>{x.entityTitle||x.entityType.replace('_',' ')}</Text>{x.notes?<Text style={s.help}>{x.notes}</Text>:null}<Text style={s.meta}>{x.entityType.replace('_',' ')} · saved {x.syncStatus==='synced'?'to cloud':'locally'}</Text></Pressable>)}</ScrollView></View>
}
function Header({title}:{title:string}){return <View style={s.header}><Pressable style={s.back} onPress={()=>router.back()}><Text style={s.backText}>‹</Text></Pressable><View><Text style={s.eyebrow}>FIELD FOLLOW-UP</Text><Text style={s.headerTitle}>{title}</Text></View></View>}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#F7FAF8'},header:{paddingTop:56,paddingHorizontal:16,paddingBottom:14,backgroundColor:'#FFF',borderBottomWidth:2,borderColor:'#D1D5DB',flexDirection:'row',alignItems:'center',gap:10},back:{width:48,height:48,alignItems:'center',justifyContent:'center'},backText:{fontSize:36,color:'#111827'},eyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1.1,color:'#047857'},headerTitle:{fontSize:24,fontWeight:'900',color:'#111827'},body:{padding:16,gap:10,paddingBottom:45},card:{padding:15,borderWidth:2,borderColor:'#D1D5DB',borderRadius:13,backgroundColor:'#FFF'},type:{fontSize:10,fontWeight:'900',letterSpacing:1,color:'#B45309'},title:{fontSize:17,fontWeight:'900',color:'#111827',marginTop:5},help:{fontSize:13,lineHeight:19,color:'#4B5563',marginTop:5},meta:{fontSize:11,color:'#6B7280',marginTop:9},empty:{padding:25,textAlign:'center',fontSize:15,color:'#6B7280'}});
