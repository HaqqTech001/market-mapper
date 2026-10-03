import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { nativeSupabase } from './supabase';
import { requireNativeUserContext } from './userContext';

type CallRow={id:string;channel_id:string;room_name:string;call_type:'audio'|'video';started_by:string;status:'active'|'ended'};
export function IncomingCallLifecycle(){
 const [ready,setReady]=useState(false);
 useEffect(()=>{let mounted=true;let sub:any;(async()=>{const user=await requireNativeUserContext();if(!mounted)return;sub=nativeSupabase.channel('market-mapper-calls').on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_calls'},payload=>{const call=payload.new as CallRow;if(call.started_by===user.userId||call.status!=='active')return;Alert.alert(call.call_type==='video'?'Incoming video call':'Incoming audio call','A Market Mapper team call is starting.',[{text:'Decline',style:'cancel'},{text:'Join',onPress:()=>router.push({pathname:'/call',params:{channelId:call.channel_id,type:call.call_type,room:call.room_name}})}])}).subscribe();if(mounted)setReady(true)})().catch(()=>{});return()=>{mounted=false;if(sub)nativeSupabase.removeChannel(sub)}},[]);
 return null;
}
