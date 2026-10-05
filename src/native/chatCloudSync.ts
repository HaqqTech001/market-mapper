import { getDatabase } from '@/src/db/sqlite';
import { nativeSupabase } from './supabase';

/**
 * Pulls authorized chat state from Supabase into the durable local SQLite cache.
 * Local-only/outbox messages are preserved because cloud rows are upserted by id.
 */
export async function hydrateChatFromCloud(): Promise<{channels:number;messages:number}> {
  const db=getDatabase();
  const {data:channels,error:channelError}=await nativeSupabase
    .from('chat_channels')
    .select('id,name,channel_type,team_id,mission_id,description,avatar_path,updated_at,created_at')
    .order('created_at',{ascending:true});
  if(channelError) throw channelError;

  for(const c of channels||[]){
    await db.runAsync(
      `INSERT INTO local_chat_channels
       (id,name,channel_type,team_id,mission_id,unread_count,last_message_snippet,last_message_time,created_at,description,avatar_path,updated_at)
       VALUES (?,?,?,?,?,0,NULL,NULL,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,channel_type=excluded.channel_type,team_id=excluded.team_id,
         mission_id=excluded.mission_id,description=excluded.description,
         avatar_path=excluded.avatar_path,updated_at=excluded.updated_at;`,
      [c.id,c.name,c.channel_type,c.team_id||null,c.mission_id||null,c.created_at,c.description||null,c.avatar_path||null,c.updated_at||null]
    );
  }

  const channelIds=(channels||[]).map(c=>c.id);
  if(!channelIds.length)return {channels:0,messages:0};

  const {data:messages,error:messageError}=await nativeSupabase
    .from('chat_messages')
    .select('id,channel_id,sender_id,sender_name,sender_avatar,sender_role,reply_to_id,text,is_pinned,linked_business_id,linked_business_name,linked_path_id,linked_path_name,linked_issue_id,linked_issue_title,shared_location,message_type,attachment,reactions,edited_at,deleted_at,created_at')
    .in('channel_id',channelIds)
    .order('created_at',{ascending:true})
    .limit(1000);
  if(messageError) throw messageError;

  for(const m of messages||[]){
    await db.runAsync(
      `INSERT INTO local_chat_messages
       (id,channel_id,sender_id,sender_name,sender_avatar,sender_role,reply_to_id,text,is_pinned,
        linked_business_id,linked_business_name,linked_path_id,linked_path_name,linked_issue_id,linked_issue_title,
        shared_location_json,message_type,attachment_json,reactions_json,edited_at,deleted_at,created_at,sync_status,
        transfer_status,transfer_progress)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced','none',0)
       ON CONFLICT(id) DO UPDATE SET
        channel_id=excluded.channel_id,sender_name=excluded.sender_name,sender_avatar=excluded.sender_avatar,
        sender_role=excluded.sender_role,reply_to_id=excluded.reply_to_id,text=excluded.text,is_pinned=excluded.is_pinned,
        linked_business_id=excluded.linked_business_id,linked_business_name=excluded.linked_business_name,
        linked_path_id=excluded.linked_path_id,linked_path_name=excluded.linked_path_name,
        linked_issue_id=excluded.linked_issue_id,linked_issue_title=excluded.linked_issue_title,
        shared_location_json=excluded.shared_location_json,message_type=excluded.message_type,
        attachment_json=excluded.attachment_json,reactions_json=excluded.reactions_json,
        edited_at=excluded.edited_at,deleted_at=excluded.deleted_at,sync_status='synced';`,
      [m.id,m.channel_id,m.sender_id,m.sender_name,m.sender_avatar||null,m.sender_role||'mapper',m.reply_to_id||null,m.text||'',m.is_pinned?1:0,
       m.linked_business_id||null,m.linked_business_name||null,m.linked_path_id||null,m.linked_path_name||null,m.linked_issue_id||null,m.linked_issue_title||null,
       m.shared_location?JSON.stringify(m.shared_location):null,m.message_type||'text',m.attachment?JSON.stringify(m.attachment):null,
       JSON.stringify(m.reactions||{}),m.edited_at||null,m.deleted_at||null,m.created_at]
    );
  }

  for(const c of channels||[]){
    const last=(messages||[]).filter(m=>m.channel_id===c.id).at(-1);
    if(last)await db.runAsync(
      'UPDATE local_chat_channels SET last_message_snippet=?,last_message_time=? WHERE id=?;',
      [(last.text||last.attachment?.name||last.message_type||'Message').slice(0,60),last.created_at,c.id]
    );
  }
  return {channels:(channels||[]).length,messages:(messages||[]).length};
}
