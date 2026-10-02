import { useEffect,useState } from 'react';
import { ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { router,useLocalSearchParams } from 'expo-router';
import { ScreenHeader,ScreenSafeArea } from '@/src/native/ScreenScaffold';
import { nativeSupabase } from '@/src/native/supabase';
import { requireNativeUserContext } from '@/src/native/userContext';

export default function AdminMissionDetail(){
 const{missionId}=useLocalSearchParams<{missionId:string}>();const[data,setData]=useState<any>(null);const[loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;(async()=>{try{const u=await requireNativeUserContext();if(u.role!=='admin')throw new Error('ADMIN_REQUIRED');const{data:d,error}=await nativeSupabase.from('missions').select('id,title,description,status,market_name,created_at,mission_members(user_id,role,profiles!mission_members_user_id_fkey(full_name)),mission_area_assignments(area_id,area_name,assigned_to_user_id,status,profiles!mission_area_assignments_assigned_to_user_id_fkey(full_name))').eq('id',missionId).single();if(error)throw error;if(alive)setData(d)}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[missionId]);
 if(loading)return <View style={s.center}><ActivityIndicator/></View>;
 if(!data)return <View style={s.center}><Text style={s.title}>Mission unavailable</Text></View>;
 const members=data.mission_members||[],areas=data.mission_area_assignments||[];
 return <ScreenSafeArea><ScreenHeader eyebrow="ADMIN · MISSION" title={data.status.replaceAll('_',' ')} back/><ScrollView contentContainerStyle={s.body}><Text style={s.title}>{data.title}</Text><Text style={s.market}>{data.market_name||'Market not named'}</Text>{data.description?<Text style={s.help}>{data.description}</Text>:null}
 <View style={s.stats}><Stat n={members.length} label="Members"/><Stat n={areas.length} label="Areas"/><Stat n={areas.filter((a:any)=>a.status==='completed').length} label="Complete"/></View>
 <Pressable style={s.primary} onPress={()=>router.push({pathname:'/map',params:{missionId:data.id}})}><Text style={s.primaryText}>Open Mission Map</Text></Pressable>
 <Text style={s.section}>TEAM</Text>{members.length?members.map((m:any)=><View key={m.user_id} style={s.card}><Text style={s.cardTitle}>{m.profiles?.full_name||'Team member'}</Text><Text style={s.meta}>{String(m.role||'mapper').replace('_',' ')}</Text></View>):<Text style={s.help}>No members assigned.</Text>}
 <Text style={s.section}>AREA ASSIGNMENTS</Text>{areas.length?areas.map((a:any)=><View key={a.area_id} style={s.card}><Text style={s.cardTitle}>{a.area_name||'Assigned area'}</Text><Text style={s.meta}>{a.profiles?.full_name||'Unassigned'} · {a.status.replace('_',' ')}</Text></View>):<Text style={s.help}>No areas assigned.</Text>}
 </ScrollView></ScreenSafeArea>
}
function Stat({n,label}:{n:number;label:string}){return <View style={s.stat}><Text style={s.num}>{n}</Text><Text style={s.meta}>{label}</Text></View>}
const s=StyleSheet.create({center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#F7FAF8'},body:{padding:18,gap:10,paddingBottom:45},title:{fontSize:27,fontWeight:'900',color:'#111827'},market:{fontSize:15,fontWeight:'800',color:'#047857'},help:{fontSize:13,lineHeight:20,color:'#4B5563'},stats:{flexDirection:'row',gap:8,marginVertical:5},stat:{flex:1,minHeight:82,padding:12,borderWidth:2,borderColor:'#D1D5DB',borderRadius:13,backgroundColor:'#FFF',justifyContent:'center'},num:{fontSize:23,fontWeight:'900',color:'#111827'},section:{fontSize:11,fontWeight:'900',letterSpacing:1.1,color:'#6B7280',marginTop:10},card:{padding:14,borderWidth:2,borderColor:'#D1D5DB',borderRadius:12,backgroundColor:'#FFF'},cardTitle:{fontSize:16,fontWeight:'900',color:'#111827'},meta:{fontSize:12,color:'#6B7280',marginTop:3,fontWeight:'700'},primary:{minHeight:54,borderRadius:12,backgroundColor:'#047857',alignItems:'center',justifyContent:'center'},primaryText:{color:'#FFF',fontWeight:'900'}});
