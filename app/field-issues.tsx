import { useCallback, useState } from 'react';
import { ScreenSafeArea, ScreenHeader } from '@/src/native/ScreenScaffold';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { FieldIssueRepository } from '@/src/db/repositories/FieldIssueRepository';
import { requireNativeUserContext } from '@/src/native/userContext';
import { runNativeSync } from '@/src/native/syncCoordinator';
import type { FieldIssue } from '@/src/types';

export default function FieldIssuesScreen(){
 const [items,setItems]=useState<FieldIssue[]>([]);const [canResolve,setCanResolve]=useState(false);const [userId,setUserId]=useState('');const [name,setName]=useState('');
 const load=useCallback(async()=>{const u=await requireNativeUserContext();setUserId(u.userId);setName(u.fullName);setCanResolve(u.role!=='mapper');setItems(await FieldIssueRepository.getAllIssues())},[]);
 useFocusEffect(useCallback(()=>{load()},[load]));
 const resolve=(x:FieldIssue)=>Alert.alert('Resolve field issue?',x.title,[{text:'Cancel',style:'cancel'},{text:'Resolve',onPress:async()=>{await FieldIssueRepository.resolveIssue(x.id,userId,name,'Reviewed and resolved in field operations.');await load();runNativeSync().catch(()=>{})}}]);
 return <ScreenSafeArea><ScreenHeader eyebrow="OPERATIONS" title="Field Issues" back/><ScrollView contentContainerStyle={s.body}>{items.length===0?<Text style={s.empty}>No field issues recorded on this device.</Text>:items.map(x=><View key={x.id} style={[s.card,x.status==='open'&&s.open]}><View style={s.row}><Text style={s.type}>{x.issueType.replaceAll('_',' ').toUpperCase()}</Text><Text style={s.status}>{x.status.toUpperCase()}</Text></View><Text style={s.title}>{x.title}</Text><Text style={s.help}>{x.description}</Text><Text style={s.meta}>{x.areaName||x.missionTitle} · {x.reportedByName}</Text>{canResolve&&x.status==='open'?<Pressable style={s.resolve} onPress={()=>resolve(x)}><Text style={s.resolveText}>Mark Resolved</Text></Pressable>:null}</View>)}</ScrollView></ScreenSafeArea>
}
function Header(){return <View style={s.header}><Pressable style={s.back} onPress={()=>router.back()}><Text style={s.backText}>‹</Text></Pressable><View><Text style={s.eyebrow}>OPERATIONS</Text><Text style={s.headerTitle}>Field Issues</Text></View></View>}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#F7FAF8'},header:{paddingTop:56,paddingHorizontal:16,paddingBottom:14,backgroundColor:'#FFF',borderBottomWidth:2,borderColor:'#D1D5DB',flexDirection:'row',alignItems:'center',gap:10},back:{width:48,height:48,alignItems:'center',justifyContent:'center'},backText:{fontSize:36,color:'#111827'},eyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1.1,color:'#047857'},headerTitle:{fontSize:24,fontWeight:'900',color:'#111827'},body:{padding:16,gap:10,paddingBottom:45},card:{padding:15,borderWidth:2,borderColor:'#D1D5DB',borderRadius:13,backgroundColor:'#FFF'},open:{borderColor:'#F59E0B'},row:{flexDirection:'row',justifyContent:'space-between'},type:{fontSize:10,fontWeight:'900',letterSpacing:.8,color:'#B45309'},status:{fontSize:10,fontWeight:'900',color:'#6B7280'},title:{fontSize:17,fontWeight:'900',color:'#111827',marginTop:6},help:{fontSize:13,lineHeight:19,color:'#374151',marginTop:5},meta:{fontSize:11,color:'#6B7280',marginTop:8},resolve:{minHeight:48,marginTop:12,borderRadius:10,backgroundColor:'#047857',alignItems:'center',justifyContent:'center'},resolveText:{color:'#FFF',fontWeight:'900'},empty:{padding:25,textAlign:'center',fontSize:15,color:'#6B7280'}});
