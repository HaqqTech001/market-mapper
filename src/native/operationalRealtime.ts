import type { RealtimeChannel } from '@supabase/supabase-js';
import { nativeSupabase } from './supabase';
import { getDatabase } from '@/src/db/sqlite';
import { emitOperationalDataChanged } from './operationalEvents';
import { presentOperationalNotification } from './notificationDelivery';

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
   if(p?.id) {
    await db.runAsync("INSERT OR REPLACE INTO local_notifications (id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at) VALUES (?,?,?,?,?,?,?,?,?);",[p.id,p.recipient_id,p.type,p.title,p.body,p.entity_reference_type||null,p.entity_reference_id||null,p.is_read?1:0,p.created_at]);
    if(payload.eventType==='INSERT') await presentOperationalNotification({id:p.id,type:p.type,title:p.title,body:p.body,entityReferenceType:p.entity_reference_type,entityReferenceId:p.entity_reference_id}).catch(error=>console.warn('Notification presentation failed',error));
   }
   emitOperationalDataChanged(); onChange?.();
  }).subscribe();
 channels.push(notification);

 const allowedMissionIds=new Set(missionIds);
 const messages=nativeSupabase.channel('authorized-chat:'+userId)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},async payload=>{
   const p:any=payload.new;if(!p?.id)return;
   const allowed=await db.getFirstAsync<any>('SELECT id,mission_id FROM local_chat_channels WHERE id=?;',[p.channel_id]);
   if(!allowed || (allowed.mission_id && !allowedMissionIds.has(allowed.mission_id)))return;
   await db.runAsync("INSERT OR IGNORE INTO local_chat_messages (id,channel_id,sender_id,sender_name,sender_avatar,sender_role,reply_to_id,text,is_pinned,linked_business_id,linked_business_name,linked_path_id,linked_path_name,linked_issue_id,linked_issue_title,shared_location_json,message_type,attachment_json,reactions_json,edited_at,deleted_at,created_at,sync_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced');",[p.id,p.channel_id,p.sender_id,p.sender_name,p.sender_avatar||null,p.sender_role,p.reply_to_id||null,p.text,p.is_pinned?1:0,p.linked_business_id||null,p.linked_business_name||null,p.linked_path_id||null,p.linked_path_name||null,p.linked_issue_id||null,p.linked_issue_title||null,p.shared_location?JSON.stringify(p.shared_location):null,p.message_type||'text',p.attachment?JSON.stringify(p.attachment):null,p.reactions?JSON.stringify(p.reactions):null,p.edited_at||null,p.deleted_at||null,p.created_at]);
   if(p.sender_id!==userId){
    await db.runAsync('UPDATE local_chat_channels SET last_message_snippet=?,last_message_time=?,unread_count=unread_count+1 WHERE id=?;',[String(p.text).slice(0,60),p.created_at,p.channel_id]);
    const preview=p.text?.trim()||({image:'Sent a photo',video:'Sent a video',audio:'Sent a voice note',file:'Sent a document'} as Record<string,string>)[p.message_type]||(p.shared_location?'Shared a location':'New message');
    await presentOperationalNotification({id:'chat_'+p.id,type:'chat',title:p.sender_name||'New message',body:preview,entityReferenceType:'chat',entityReferenceId:p.channel_id}).catch(error=>console.warn('Chat notification presentation failed',error));
   }
   else await db.runAsync('UPDATE local_chat_channels SET last_message_snippet=?,last_message_time=? WHERE id=?;',[String(p.text).slice(0,60),p.created_at,p.channel_id]);
   emitOperationalDataChanged();onChange?.();
  }).subscribe();
 channels.push(messages);
 return ()=>stopOperationalRealtime();
}
