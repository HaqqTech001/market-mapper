import type { RealtimeChannel } from '@supabase/supabase-js';
import { nativeSupabase } from './supabase';
import { getDatabase } from '@/src/db/sqlite';
import { emitOperationalDataChanged } from './operationalEvents';

let channels: RealtimeChannel[] = [];

export async function stopOperationalRealtime(){
 const current=channels; channels=[];
 await Promise.all(current.map(c=>nativeSupabase.removeChannel(c)));
}

export async function startOperationalRealtime(userId:string, missionIds:string[], onChange?:()=>void){
 await stopOperationalRealtime();
 const db=getDatabase();

 const notification=nativeSupabase.channel('notifications:'+userId)
  .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:'recipient_id=eq.'+userId},async payload=>{
   const p:any=payload.new;
   if(p?.id) await db.runAsync("INSERT OR REPLACE INTO local_notifications (id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at) VALUES (?,?,?,?,?,?,?,?,?);",[p.id,p.recipient_id,p.type,p.title,p.body,p.entity_reference_type||null,p.entity_reference_id||null,p.is_read?1:0,p.created_at]);
   emitOperationalDataChanged(); onChange?.();
  }).subscribe();
 channels.push(notification);

 for(const missionId of missionIds){
  const messages=nativeSupabase.channel('mission-chat:'+missionId)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},async payload=>{
    const p:any=payload.new;
    if(!p?.id)return;
    const allowed=await db.getFirstAsync<any>('SELECT id FROM local_chat_channels WHERE id=? AND mission_id=?;',[p.channel_id,missionId]);
    if(!allowed)return;
    await db.runAsync("INSERT OR IGNORE INTO local_chat_messages (id,channel_id,sender_id,sender_name,sender_avatar,sender_role,reply_to_id,text,is_pinned,linked_business_id,linked_business_name,linked_path_id,linked_path_name,linked_issue_id,linked_issue_title,shared_location_json,created_at,sync_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced');",[p.id,p.channel_id,p.sender_id,p.sender_name,p.sender_avatar||null,p.sender_role,p.reply_to_id||null,p.text,p.is_pinned?1:0,p.linked_business_id||null,p.linked_business_name||null,p.linked_path_id||null,p.linked_path_name||null,p.linked_issue_id||null,p.linked_issue_title||null,p.shared_location?JSON.stringify(p.shared_location):null,p.created_at]);
    await db.runAsync('UPDATE local_chat_channels SET last_message_snippet=?,last_message_time=?,unread_count=unread_count+1 WHERE id=?;',[String(p.text).slice(0,60),p.created_at,p.channel_id]);
    emitOperationalDataChanged(); onChange?.();
   }).subscribe();
  channels.push(messages);
 }
 return ()=>stopOperationalRealtime();
}
