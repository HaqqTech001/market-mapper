import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { nativeSupabase } from '@/src/native/supabase';
import { requireNativeUserContext, type NativeUserContext } from '@/src/native/userContext';

export default function MoreScreen(){
 const [user,setUser]=useState<NativeUserContext|null>(null);useEffect(()=>{requireNativeUserContext().then(setUser).catch(()=>{})},[]);
 return <View style={s.page}><View style={s.header}><Text style={s.eyebrow}>MORE</Text><Text style={s.title}>{user?.fullName||'Field account'}</Text><Text style={s.role}>{user?.role.replace('_',' ')||''}</Text></View><ScrollView contentContainerStyle={s.body}>
  <Item title="Notifications" sub="Mission, chat and system updates" onPress={()=>router.push('/notifications')}/>
  <Item title="Offline Data" sub="Pending sync, failed items and conflicts" onPress={()=>router.push('/offline-data')}/>
  <Item title="Revisits" sub="Work marked to verify or return to" onPress={()=>router.push('/revisits')}/>
  {user?.role==='team_lead'||user?.role==='admin'?<><Text style={s.section}>COORDINATION</Text><Item title="Assignments & Handovers" sub="Coordinate remaining field work" onPress={()=>router.push('/handovers')}/><Item title="Field Issues" sub="Review reported operational issues" onPress={()=>router.push('/field-issues')}/></>:null}
  {user?.role==='admin'?<><Text style={s.section}>ADMIN</Text><Item title="Admin Workspace" sub="Users · teams · missions · catalogue" onPress={()=>{}}/><Item title="Catalogue" sub="Categories, products, services and suggestions" onPress={()=>{}}/></>:null}
  <Text style={s.section}>ACCOUNT</Text><Pressable style={s.signout} onPress={async()=>{await nativeSupabase.auth.signOut();router.replace('/')}}><Text style={s.signoutText}>Sign Out</Text></Pressable>
 </ScrollView></View>
}
function Item({title,sub,onPress}:{title:string;sub:string;onPress:()=>void}){return <Pressable style={s.item} onPress={onPress}><View style={{flex:1}}><Text style={s.itemTitle}>{title}</Text><Text style={s.help}>{sub}</Text></View><Text style={s.chev}>›</Text></Pressable>}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#F7FAF8'},header:{paddingTop:56,paddingHorizontal:18,paddingBottom:17,backgroundColor:'#FFF',borderBottomWidth:2,borderColor:'#D1D5DB'},eyebrow:{fontSize:12,fontWeight:'900',letterSpacing:1.2,color:'#047857'},title:{fontSize:25,fontWeight:'900',color:'#111827',marginTop:3},role:{fontSize:12,fontWeight:'800',color:'#6B7280',textTransform:'uppercase',marginTop:3},body:{padding:16,gap:9,paddingBottom:45},section:{fontSize:11,fontWeight:'900',letterSpacing:1.1,color:'#6B7280',marginTop:12},item:{minHeight:68,padding:14,borderWidth:2,borderColor:'#D1D5DB',borderRadius:13,backgroundColor:'#FFF',flexDirection:'row',alignItems:'center'},itemTitle:{fontSize:16,fontWeight:'900',color:'#111827'},help:{fontSize:13,color:'#4B5563',marginTop:3},chev:{fontSize:28,color:'#6B7280'},signout:{minHeight:52,borderWidth:2,borderColor:'#B91C1C',borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'#FFF'},signoutText:{fontWeight:'900',color:'#991B1B'}});
