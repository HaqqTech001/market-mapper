import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { OutboxRepository } from '@/src/db/repositories/OutboxRepository';

type ConflictRow={id:string;table_name:string;record_id:string;local_version:number;server_version:number;local_payload:string;server_payload:string;conflict_detected_at:string};

export default function ConflictsScreen(){
 const [rows,setRows]=useState<ConflictRow[]>([]);
 const load=useCallback(async()=>setRows(await OutboxRepository.getConflicts()),[]);
 useFocusEffect(useCallback(()=>{load()},[load]));
 const retry=(r:ConflictRow)=>Alert.alert('Retry local change?','This will queue the preserved local change again. Use this only after the conflict has been reviewed.',[{text:'Cancel',style:'cancel'},{text:'Queue Local Change',onPress:async()=>{await OutboxRepository.resolveConflict(r.id,true);await load()}}]);
 return <View style={s.page}><View style={s.header}><Pressable style={s.back} onPress={()=>router.back()}><Text style={s.backText}>‹</Text></Pressable><View><Text style={s.eyebrow}>SYNC CONFLICTS</Text><Text style={s.title}>Review preserved work</Text></View></View><ScrollView contentContainerStyle={s.body}>
  <Text style={s.info}>Nothing here is overwritten automatically. A conflict means both local and cloud work may matter.</Text>
  {rows.length===0?<Text style={s.empty}>No unresolved conflicts.</Text>:rows.map(r=><View key={r.id} style={s.card}><Text style={s.cardTitle}>{friendly(r.table_name)}</Text><Text style={s.meta}>Record {r.record_id.slice(-8)} · local v{r.local_version} · server v{r.server_version||'?'}</Text><Text style={s.label}>LOCAL CHANGE</Text><Text style={s.payload}>{summarize(r.local_payload)}</Text><Text style={s.label}>CLOUD COPY</Text><Text style={s.payload}>{summarize(r.server_payload)||'Cloud payload was not available from the failed request.'}</Text><Pressable style={s.retry} onPress={()=>retry(r)}><Text style={s.retryText}>Queue Local Change Again</Text></Pressable></View>)}
 </ScrollView></View>
}
function friendly(t:string){return ({businesses:'Business',market_paths:'Path',path_junctions:'Junction',junction_branches:'Junction branch',local_field_issues:'Field issue',local_market_places:'Place'} as Record<string,string>)[t]||'Field record'}
function summarize(raw:string){try{const p=JSON.parse(raw);return Object.entries(p).filter(([k])=>!['rawPoints','offerings'].includes(k)).slice(0,12).map(([k,v])=>k+': '+String(v??'—')).join('\n')}catch{return raw.slice(0,700)}}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#F7FAF8'},header:{paddingTop:56,paddingHorizontal:18,paddingBottom:16,backgroundColor:'#FFF',borderBottomWidth:2,borderColor:'#D1D5DB',flexDirection:'row',gap:12,alignItems:'center'},back:{width:48,height:48,alignItems:'center',justifyContent:'center'},backText:{fontSize:36,color:'#111827'},eyebrow:{fontSize:12,fontWeight:'900',letterSpacing:1.2,color:'#B45309'},title:{fontSize:24,fontWeight:'900',color:'#111827'},body:{padding:18,gap:12,paddingBottom:50},info:{padding:14,borderRadius:12,borderWidth:2,borderColor:'#F59E0B',backgroundColor:'#FFFBEB',fontSize:14,lineHeight:20,fontWeight:'700',color:'#78350F'},empty:{fontSize:15,color:'#4B5563',paddingVertical:20},card:{padding:15,borderRadius:14,borderWidth:2,borderColor:'#F59E0B',backgroundColor:'#FFF'},cardTitle:{fontSize:17,fontWeight:'900',color:'#111827'},meta:{fontSize:12,color:'#6B7280',marginTop:3},label:{fontSize:11,fontWeight:'900',letterSpacing:1,color:'#374151',marginTop:13},payload:{fontSize:12,lineHeight:18,color:'#111827',marginTop:4},retry:{minHeight:50,marginTop:15,alignItems:'center',justifyContent:'center',borderRadius:11,backgroundColor:'#B45309'},retryText:{color:'#FFF',fontWeight:'900'}});
