import { nativeSupabase } from './supabase';
import { getDatabase } from '@/src/db/sqlite';

export async function hydrateOperationalMessaging(userId:string,missionIds:string[]){
 const db=getDatabase();
 const {data:channels,error:ce}=await nativeSupabase.from('chat_channels').select('id,name,channel_type,team_id,mission_id,created_at').order('created_at');if(ce)throw ce;
 // General Chat is a singleton. Prefer the stable cloud id `general` and never
 // hydrate a second legacy general row into SQLite.
 const generals=(channels||[]).filter((c:any)=>c.id==='general'||c.channel_type==='general');
 const canonicalGeneral=generals.find((c:any)=>c.id==='general')||generals[0]||null;
 const allowed=(channels||[]).filter((c:any)=>{
   if(c.id==='general'||c.channel_type==='general')return canonicalGeneral?.id===c.id;
   return !c.mission_id||missionIds.includes(c.mission_id);
 });
 for(const c of allowed)await db.runAsync(`INSERT INTO local_chat_channels
  (id,name,channel_type,team_id,mission_id,last_message_snippet,last_message_time,unread_count,created_at)
  VALUES (?,?,?,?,?,NULL,NULL,0,?)
  ON CONFLICT(id) DO UPDATE SET
   name=excluded.name,channel_type=excluded.channel_type,team_id=excluded.team_id,
   mission_id=excluded.mission_id;`,
  [c.id,c.name,c.channel_type,c.team_id||null,c.mission_id||null,c.created_at]);
 const ids=allowed.map((c:any)=>c.id);
 for(const id of ids){const {data:messages,error}=await nativeSupabase.from('chat_messages').select('*').eq('channel_id',id).order('created_at',{ascending:false}).limit(100);if(error)throw error;for(const p of (messages||[]).reverse())await db.runAsync("INSERT OR IGNORE INTO local_chat_messages(id,channel_id,sender_id,sender_name,sender_avatar,sender_role,reply_to_id,text,is_pinned,linked_business_id,linked_business_name,linked_path_id,linked_path_name,linked_issue_id,linked_issue_title,shared_location_json,message_type,attachment_json,reactions_json,edited_at,deleted_at,created_at,sync_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced')",[p.id,p.channel_id,p.sender_id,p.sender_name,p.sender_avatar||null,p.sender_role,p.reply_to_id||null,p.text,p.is_pinned?1:0,p.linked_business_id||null,p.linked_business_name||null,p.linked_path_id||null,p.linked_path_name||null,p.linked_issue_id||null,p.linked_issue_title||null,p.shared_location?JSON.stringify(p.shared_location):null,p.message_type||'text',p.attachment?JSON.stringify(p.attachment):null,p.reactions?JSON.stringify(p.reactions):null,p.edited_at||null,p.deleted_at||null,p.created_at]);}
 const messageIds:string[]=[]; for(const id of ids){const rows=await db.getAllAsync<any>('SELECT id FROM local_chat_messages WHERE channel_id=?;',[id]);messageIds.push(...rows.map(r=>r.id))}
 if(messageIds.length){const {data:receipts,error:re}=await nativeSupabase.from('chat_message_receipts').select('*').in('message_id',messageIds.slice(-500));if(!re){for(const p of receipts||[])await db.runAsync('INSERT OR REPLACE INTO local_chat_message_receipts(message_id,user_id,delivered_at,read_at) VALUES(?,?,?,?);',[p.message_id,p.user_id,p.delivered_at||null,p.read_at||null]);}else if(re.code!=='PGRST205')console.warn('Receipt hydration unavailable',re);}
 const {data:notifs,error:ne}=await nativeSupabase.from('notifications').select('*').eq('recipient_id',userId).order('created_at',{ascending:false}).limit(100);if(ne)throw ne;
 for(const p of notifs||[])await db.runAsync("INSERT OR REPLACE INTO local_notifications(id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at,sync_status) VALUES(?,?,?,?,?,?,?,?,?,'synced')",[p.id,p.recipient_id,p.type,p.title,p.body,p.entity_reference_type||null,p.entity_reference_id||null,p.is_read?1:0,p.created_at]);
 return {channels:allowed.length,notifications:(notifs||[]).length};
}
