import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { NotificationRepository } from '@/src/db/repositories/NotificationRepository';
import { requireNativeUserContext, type NativeUserContext } from '@/src/native/userContext';
import { runNativeSync } from '@/src/native/syncCoordinator';
import { subscribeOperationalData } from '@/src/native/operationalEvents';
import type { NotificationItem } from '@/src/types';

export default function NotificationsScreen(){
 const [user,setUser]=useState<NativeUserContext|null>(null); const [items,setItems]=useState<NotificationItem[]>([]); const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{if(user)setItems(await NotificationRepository.getNotificationsForUser(user.userId))},[user]);
 useFocusEffect(useCallback(()=>{load();return subscribeOperationalData(()=>{load()})},[load]));
 useEffect(()=>{let mounted=true;(async()=>{try{const u=await requireNativeUserContext();if(!mounted)return;setUser(u);setItems(await NotificationRepository.getNotificationsForUser(u.userId))}finally{if(mounted)setLoading(false)}})();return()=>{mounted=false}},[]);
 const open=async(n:NotificationItem)=>{if(!n.isRead){await NotificationRepository.markAsRead(n.id);await load();runNativeSync().catch(()=>{})}const t=n.entityReferenceType;if(t==='mission')router.push('/missions');else if(['business','path','junction','place','field_issue'].includes(String(t)))router.push('/map')};
 const markAll=async()=>{if(!user)return;await NotificationRepository.markAllAsRead(user.userId);await load();runNativeSync().catch(()=>{})};
 if(loading)return <View style={s.center}><ActivityIndicator/><Text style={s.help}>Loading notifications…</Text></View>;
 const unread=items.filter(x=>!x.isRead).length;
 return <View style={s.page}><View style={s.header}><Pressable style={s.back} onPress={()=>router.back()}><Text style={s.backText}>‹</Text></Pressable><View style={{flex:1}}><Text style={s.eyebrow}>NOTIFICATIONS</Text><Text style={s.title}>{unread?unread+' unread':'You’re caught up'}</Text></View>{unread?<Pressable style={s.mark} onPress={markAll}><Text style={s.markText}>Read all</Text></Pressable>:null}</View><ScrollView contentContainerStyle={s.body}>{items.length===0?<Text style={s.empty}>No notifications yet.</Text>:items.map(n=><Pressable key={n.id} style={[s.card,!n.isRead&&s.unread]} onPress={()=>open(n)}><View style={s.row}><Text style={s.type}>{label(n.type)}</Text>{!n.isRead?<View style={s.dot}/>:null}</View><Text style={s.cardTitle}>{n.title}</Text><Text style={s.bodyText}>{n.body}</Text><Text style={s.time}>{new Date(n.createdAt).toLocaleString()}</Text></Pressable>)}</ScrollView></View>
}
function label(t:string){return t.replaceAll('_',' ').toUpperCase()}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#F7FAF8'},center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#F7FAF8'},header:{paddingTop:56,paddingHorizontal:18,paddingBottom:14,backgroundColor:'#FFF',borderBottomWidth:2,borderColor:'#D1D5DB',flexDirection:'row',gap:10,alignItems:'center'},back:{width:48,height:48,alignItems:'center',justifyContent:'center'},backText:{fontSize:36,color:'#111827'},eyebrow:{fontSize:12,fontWeight:'900',letterSpacing:1.2,color:'#047857'},title:{fontSize:22,fontWeight:'900',color:'#111827'},mark:{minHeight:44,paddingHorizontal:10,justifyContent:'center'},markText:{fontWeight:'900',color:'#047857'},body:{padding:15,gap:10,paddingBottom:50},card:{padding:14,borderRadius:13,borderWidth:2,borderColor:'#D1D5DB',backgroundColor:'#FFF'},unread:{borderColor:'#34D399',backgroundColor:'#ECFDF5'},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},type:{fontSize:10,fontWeight:'900',letterSpacing:.8,color:'#047857'},dot:{width:10,height:10,borderRadius:5,backgroundColor:'#047857'},cardTitle:{fontSize:16,fontWeight:'900',color:'#111827',marginTop:6},bodyText:{fontSize:14,lineHeight:20,color:'#374151',marginTop:4},time:{fontSize:11,color:'#6B7280',marginTop:8},empty:{fontSize:15,color:'#6B7280',textAlign:'center',paddingTop:40},help:{fontSize:13,color:'#4B5563',marginTop:8}});
