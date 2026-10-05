/**
 * Chat Repository (Local SQLite)
 * Operational group and mission communications with pinned notices,
 * deep-linked business/path/issue cards, and GPS pin sharing.
 */

import { getDatabase } from '../sqlite';
import { ChatChannel, ChatMessage, UserRole, SyncStatus, ChatMessageType, ChatAttachment } from '../../types';
import { OutboxRepository } from './OutboxRepository';
import { nativeSupabase } from '../../native/supabase';


export class ChatRepository {
  private static get db() { return getDatabase(); }

  static async getOrCreateChannel(
    name: string,
    channelType: 'team' | 'mission' | 'announcements' | 'general',
    teamId?: string,
    missionId?: string
  ): Promise<ChatChannel> {
    // Mission/team identity is relational, not presentational. Names may change and
    // must never be allowed to create a second channel for the same mission/team.
    let existing: any = null;
    if (channelType === 'mission' && missionId) {
      existing = await this.db.getFirstAsync<any>(
        `SELECT * FROM local_chat_channels WHERE channel_type = 'mission' AND mission_id = ? ORDER BY created_at ASC LIMIT 1;`,
        [missionId]
      );
    } else if (channelType === 'team' && teamId) {
      existing = await this.db.getFirstAsync<any>(
        `SELECT * FROM local_chat_channels WHERE channel_type = 'team' AND team_id = ? ORDER BY created_at ASC LIMIT 1;`,
        [teamId]
      );
    } else if (channelType === 'general') {
      existing = await this.db.getFirstAsync<any>(
        `SELECT * FROM local_chat_channels WHERE id = 'general' OR channel_type = 'general' ORDER BY CASE WHEN id='general' THEN 0 ELSE 1 END, created_at ASC LIMIT 1;`
      );
    } else {
      existing = await this.db.getFirstAsync<any>(
        `SELECT * FROM local_chat_channels WHERE channel_type = ? AND name = ? ORDER BY created_at ASC LIMIT 1;`,
        [channelType, name]
      );
    }

    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        channelType: existing.channel_type || existing.channelType,
        teamId: existing.team_id || existing.teamId,
        missionId: existing.mission_id || existing.missionId,
        unreadCount: Number(existing.unread_count || 0),
        lastMessageSnippet: existing.last_message_snippet || existing.lastMessageSnippet,
        lastMessageTime: existing.last_message_time || existing.lastMessageTime,
        createdAt: existing.created_at || existing.createdAt,
        description: existing.description || undefined,
        avatarPath: existing.avatar_path || undefined,
        updatedAt: existing.updated_at || undefined,
      };
    }

    const id = channelType === 'general'
      ? 'general'
      : missionId
        ? `mission_${missionId}`
        : teamId
          ? `team_${teamId}`
          : `chn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newChannel: ChatChannel = {
      id,
      name,
      channelType,
      teamId,
      missionId,
      unreadCount: 0,
      createdAt: now,
    };

    // INSERT OR IGNORE protects startup races. Re-read by relational identity
    // afterwards so concurrent callers always converge on one channel.
    await this.db.runAsync(
      `INSERT OR IGNORE INTO local_chat_channels (
        id, name, channel_type, team_id, mission_id, unread_count, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?);`,
      [id, name, channelType, teamId || null, missionId || null, now]
    );

    const resolved = channelType === 'mission' && missionId
      ? await this.db.getFirstAsync<any>("SELECT * FROM local_chat_channels WHERE channel_type='mission' AND mission_id=? ORDER BY created_at ASC LIMIT 1;", [missionId])
      : channelType === 'team' && teamId
        ? await this.db.getFirstAsync<any>("SELECT * FROM local_chat_channels WHERE channel_type='team' AND team_id=? ORDER BY created_at ASC LIMIT 1;", [teamId])
        : await this.db.getFirstAsync<any>('SELECT * FROM local_chat_channels WHERE id=?;', [id]);

    if (resolved?.id !== id) {
      return {
        id: resolved.id, name: resolved.name, channelType: resolved.channel_type,
        teamId: resolved.team_id || undefined, missionId: resolved.mission_id || undefined,
        unreadCount: Number(resolved.unread_count || 0), lastMessageSnippet: resolved.last_message_snippet || undefined,
        lastMessageTime: resolved.last_message_time || undefined, createdAt: resolved.created_at,
        description: resolved.description || undefined, avatarPath: resolved.avatar_path || undefined,
        updatedAt: resolved.updated_at || undefined,
      };
    }

    await OutboxRepository.enqueue('local_chat_channels', id, 'INSERT', newChannel as unknown as Record<string, unknown>);
    return newChannel;
  }

  static async getAllChannels(): Promise<ChatChannel[]> {
    // Channel preview fields are derived cache. Rebuild them from durable
    // messages so a hydrated conversation can never display "No messages yet".
    await this.db.runAsync(`UPDATE local_chat_channels SET
      last_message_snippet=COALESCE((SELECT CASE
        WHEN m.deleted_at IS NOT NULL THEN 'Message deleted'
        WHEN NULLIF(TRIM(m.text),'') IS NOT NULL THEN m.text
        WHEN m.shared_location_json IS NOT NULL THEN 'Shared a location'
        WHEN m.message_type='image' THEN 'Photo'
        WHEN m.message_type='video' THEN 'Video'
        WHEN m.message_type='audio' THEN 'Voice note'
        WHEN m.message_type='file' THEN 'Document'
        ELSE 'Message' END FROM local_chat_messages m
        WHERE m.channel_id=local_chat_channels.id ORDER BY m.created_at DESC LIMIT 1),last_message_snippet),
      last_message_time=COALESCE((SELECT m.created_at FROM local_chat_messages m
        WHERE m.channel_id=local_chat_channels.id ORDER BY m.created_at DESC LIMIT 1),last_message_time);`);
    const rows=await this.db.getAllAsync<any>(
      `SELECT * FROM local_chat_channels ORDER BY COALESCE(last_message_time,created_at) DESC;`
    );
    return rows.map((r)=>({
      id:r.id,name:r.name,channelType:r.channel_type||r.channelType,
      teamId:r.team_id||r.teamId,missionId:r.mission_id||r.missionId,
      unreadCount:Number(r.unread_count||0),
      lastMessageSnippet:r.last_message_snippet||r.lastMessageSnippet,
      lastMessageTime:r.last_message_time||r.lastMessageTime,
      createdAt:r.created_at||r.createdAt,description:r.description||undefined,
      avatarPath:r.avatar_path||undefined,updatedAt:r.updated_at||undefined,
    }));
  }

  static async getMessages(channelId: string, limit = 100): Promise<ChatMessage[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_chat_messages WHERE channel_id = ? ORDER BY created_at ASC LIMIT ?;`,
      [channelId, limit]
    );

    return rows.map((r) => {
      let sharedLocation = undefined;
      if (r.shared_location_json) {
        try {
          sharedLocation = JSON.parse(r.shared_location_json);
        } catch {}
      }

      return {
        id: r.id,
        channelId: r.channel_id || r.channelId,
        senderId: r.sender_id || r.senderId,
        senderName: r.sender_name || r.senderName,
        senderAvatar: r.sender_avatar || r.senderAvatar,
        senderRole: (r.sender_role || r.senderRole || 'mapper') as UserRole,
        replyToId: r.reply_to_id || r.replyToId,
        text: r.text,
        messageType: (r.message_type || 'text') as ChatMessageType,
        attachment: r.attachment_json ? JSON.parse(r.attachment_json) : undefined,
        reactions: r.reactions_json ? JSON.parse(r.reactions_json) : undefined,
        editedAt: r.edited_at || undefined,
        deletedAt: r.deleted_at || undefined,
        isPinned: Boolean(r.is_pinned || r.isPinned),
        linkedBusinessId: r.linked_business_id || r.linkedBusinessId,
        linkedBusinessName: r.linked_business_name || r.linkedBusinessName,
        linkedPathId: r.linked_path_id || r.linkedPathId,
        linkedPathName: r.linked_path_name || r.linkedPathName,
        linkedIssueId: r.linked_issue_id || r.linkedIssueId,
        linkedIssueTitle: r.linked_issue_title || r.linkedIssueTitle,
        sharedLocation,
        createdAt: r.created_at || r.createdAt,
        syncStatus: r.sync_status || 'local_only',
        deliveredAt: r.delivered_at || undefined,
        readAt: r.read_at || undefined,
        transferStatus: r.transfer_status || 'none',
        transferProgress: Number(r.transfer_progress || 0),
      };
    });
  }

  static async sendMessage(msg: {
    id?: string;
    channelId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    senderRole: UserRole;
    replyToId?: string;
    text: string;
    messageType?: ChatMessageType;
    attachment?: ChatAttachment;
    isPinned?: boolean;
    linkedBusinessId?: string;
    linkedBusinessName?: string;
    linkedPathId?: string;
    linkedPathName?: string;
    linkedIssueId?: string;
    linkedIssueTitle?: string;
    sharedLocation?: { latitude: number; longitude: number; label: string };
  }): Promise<ChatMessage> {
    const id = msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const syncStatus: SyncStatus = 'local_only';

    const newMsg: ChatMessage = {
      id,
      channelId: msg.channelId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar,
      senderRole: msg.senderRole,
      replyToId: msg.replyToId,
      text: msg.text,
      messageType: msg.messageType || 'text',
      attachment: msg.attachment,
      isPinned: msg.isPinned || false,
      linkedBusinessId: msg.linkedBusinessId,
      linkedBusinessName: msg.linkedBusinessName,
      linkedPathId: msg.linkedPathId,
      linkedPathName: msg.linkedPathName,
      linkedIssueId: msg.linkedIssueId,
      linkedIssueTitle: msg.linkedIssueTitle,
      sharedLocation: msg.sharedLocation,
      createdAt: now,
      syncStatus,
    };

    const sharedLocJson = msg.sharedLocation ? JSON.stringify(msg.sharedLocation) : null;

    await this.db.runAsync(
      `INSERT INTO local_chat_messages (
        id, channel_id, sender_id, sender_name, sender_avatar, sender_role,
        reply_to_id, text, is_pinned, linked_business_id, linked_business_name,
        linked_path_id, linked_path_name, linked_issue_id, linked_issue_title,
        shared_location_json, message_type, attachment_json, created_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only');`,
      [
        id,
        newMsg.channelId,
        newMsg.senderId,
        newMsg.senderName,
        newMsg.senderAvatar || null,
        newMsg.senderRole,
        newMsg.replyToId || null,
        newMsg.text,
        newMsg.isPinned ? 1 : 0,
        newMsg.linkedBusinessId || null,
        newMsg.linkedBusinessName || null,
        newMsg.linkedPathId || null,
        newMsg.linkedPathName || null,
        newMsg.linkedIssueId || null,
        newMsg.linkedIssueTitle || null,
        sharedLocJson,
        msg.messageType || 'text',
        msg.attachment ? JSON.stringify(msg.attachment) : null,
        now,
      ]
    );

    // Update channel snippet
    await this.db.runAsync(
      `UPDATE local_chat_channels
       SET last_message_snippet = ?, last_message_time = ?
       WHERE id = ?;`,
      [(newMsg.text || newMsg.attachment?.name || newMsg.messageType || 'Message').slice(0, 60), now, newMsg.channelId]
    );

    await OutboxRepository.enqueue('local_chat_messages', id, 'INSERT', newMsg as unknown as Record<string, unknown>);

    return newMsg;
  }

  static async react(messageId:string,userId:string,emoji:string):Promise<void>{
    const row=await this.db.getFirstAsync<any>('SELECT reactions_json FROM local_chat_messages WHERE id=?;',[messageId]);
    let reactions:Record<string,string[]>={};try{reactions=row?.reactions_json?JSON.parse(row.reactions_json):{}}catch{}
    for(const key of Object.keys(reactions))reactions[key]=(reactions[key]||[]).filter(id=>id!==userId);
    reactions[emoji]=[...(reactions[emoji]||[]),userId];for(const key of Object.keys(reactions))if(!reactions[key].length)delete reactions[key];
    await this.db.runAsync('UPDATE local_chat_messages SET reactions_json=? WHERE id=?;',[JSON.stringify(reactions),messageId]);
    await OutboxRepository.enqueue('local_chat_messages',messageId,'UPDATE',{id:messageId,reactions});
  }
  static async editMessage(messageId:string,text:string):Promise<void>{const editedAt=new Date().toISOString();await this.db.runAsync('UPDATE local_chat_messages SET text=?,edited_at=? WHERE id=?;',[text,editedAt,messageId]);await OutboxRepository.enqueue('local_chat_messages',messageId,'UPDATE',{id:messageId,text,editedAt})}
  static async deleteMessage(messageId:string):Promise<void>{const deletedAt=new Date().toISOString();await this.db.runAsync("UPDATE local_chat_messages SET text='',deleted_at=? WHERE id=?;",[deletedAt,messageId]);await OutboxRepository.enqueue('local_chat_messages',messageId,'UPDATE',{id:messageId,text:'',deletedAt})}

  static async togglePin(messageId: string, isPinned: boolean): Promise<boolean> {
    await this.db.runAsync(
      `UPDATE local_chat_messages SET is_pinned = ? WHERE id = ?;`,
      [isPinned ? 1 : 0, messageId]
    );
    await OutboxRepository.enqueue('local_chat_messages', messageId, 'UPDATE', { id: messageId, isPinned });
    return true;
  }

  static async pinMessage(messageId: string): Promise<boolean> {
    return this.togglePin(messageId, true);
  }

  static async getPinnedMessages(channelId: string): Promise<ChatMessage[]> {
    const msgs = await this.getMessages(channelId);
    return msgs.filter((m) => m.isPinned);
  }
  static async getUnreadMessageIds(channelId:string,userId:string):Promise<string[]>{
    const rows=await this.db.getAllAsync<any>(`SELECT m.id FROM local_chat_messages m
      LEFT JOIN local_chat_message_receipts r ON r.message_id=m.id AND r.user_id=?
      WHERE m.channel_id=? AND m.sender_id<>? AND r.read_at IS NULL
      ORDER BY m.created_at ASC;`,[userId,channelId,userId]);
    return rows.map(r=>String(r.id));
  }

  static async markChannelRead(channelId:string,userId:string):Promise<void>{
    const now=new Date().toISOString();
    const rows=await this.db.getAllAsync<any>('SELECT id,sender_id FROM local_chat_messages WHERE channel_id=?;',[channelId]);
    for(const row of rows){
      if(row.sender_id===userId)continue;
      await this.db.runAsync('INSERT OR REPLACE INTO local_chat_message_receipts(message_id,user_id,delivered_at,read_at) VALUES(?,?,COALESCE((SELECT delivered_at FROM local_chat_message_receipts WHERE message_id=? AND user_id=?),?),?);',[row.id,userId,row.id,userId,now,now]);
    }
    await this.db.runAsync('UPDATE local_chat_channels SET unread_count=0 WHERE id=?;',[channelId]);
    for(const row of rows){
      if(row.sender_id===userId)continue;
      await OutboxRepository.enqueue('local_chat_message_receipts',row.id+'_'+userId,'INSERT',{messageId:row.id,userId,deliveredAt:now,readAt:now});
    }
  }

  static async markDelivered(messageId:string,userId:string):Promise<void>{
    const now=new Date().toISOString();
    await this.db.runAsync('INSERT OR IGNORE INTO local_chat_message_receipts(message_id,user_id,delivered_at,read_at) VALUES(?,?,?,NULL);',[messageId,userId,now]);
    await this.db.runAsync('UPDATE local_chat_message_receipts SET delivered_at=COALESCE(delivered_at,?) WHERE message_id=? AND user_id=?;',[now,messageId,userId]);
    await OutboxRepository.enqueue('local_chat_message_receipts',messageId+'_'+userId,'INSERT',{messageId,userId,deliveredAt:now,readAt:null});
  }

  static async getMessageReceipts(messageId:string):Promise<Array<{userId:string;name:string;role:UserRole;deliveredAt?:string;readAt?:string}>>{
    const rows=await this.db.getAllAsync<any>(`SELECT r.user_id,r.delivered_at,r.read_at,p.full_name,p.role FROM local_chat_message_receipts r LEFT JOIN local_profiles p ON p.id=r.user_id WHERE r.message_id=? ORDER BY CASE WHEN r.read_at IS NOT NULL THEN 0 ELSE 1 END,COALESCE(r.read_at,r.delivered_at) DESC;`,[messageId]);
    return rows.map(r=>({userId:r.user_id,name:r.full_name||'Team member',role:(r.role||'mapper') as UserRole,deliveredAt:r.delivered_at||undefined,readAt:r.read_at||undefined}));
  }

  static async updateTransfer(messageId:string,status:string,progress:number):Promise<void>{
    await this.db.runAsync('UPDATE local_chat_messages SET transfer_status=?,transfer_progress=? WHERE id=?;',[status,Math.max(0,Math.min(1,progress)),messageId]);
  }

  static async updateChannelInfo(channelId:string,input:{name?:string;description?:string;avatarPath?:string}):Promise<void>{
    const now=new Date().toISOString();
    const row=await this.db.getFirstAsync<any>('SELECT name,description,avatar_path FROM local_chat_channels WHERE id=?;',[channelId]);
    if(!row)return;
    await this.db.runAsync('UPDATE local_chat_channels SET name=?,description=?,avatar_path=?,updated_at=? WHERE id=?;',[input.name??row.name,input.description??row.description,input.avatarPath??row.avatar_path,now,channelId]);
    await OutboxRepository.enqueue('local_chat_channels',channelId,'UPDATE',{id:channelId,...input,updatedAt:now});
  }
  static async getChannelParticipants(channel:ChatChannel):Promise<Array<{id:string;name:string;role:UserRole}>>{
    if(channel.missionId){
      // Group info should reflect authoritative membership when online, not wait
      // for a separate local mission hydration pass.
      try{
        const {data,error}=await nativeSupabase.from('mission_members')
          .select('user_id,role,profiles!mission_members_user_id_fkey(full_name,role)')
          .eq('mission_id',channel.missionId);
        if(error)throw error;
        if(data?.length)return data.map((r:any)=>({id:r.user_id,name:r.profiles?.full_name||'Team member',role:(r.profiles?.role||r.role||'mapper') as UserRole}));
      }catch{}
      const rows=await this.db.getAllAsync<any>(`SELECT mm.user_id,mm.user_name,p.full_name,p.role FROM local_mission_members mm LEFT JOIN local_profiles p ON p.id=mm.user_id WHERE mm.mission_id=? ORDER BY COALESCE(p.full_name,mm.user_name);`,[channel.missionId]);
      return rows.map(r=>({id:r.user_id,name:r.full_name||r.user_name||'Team member',role:(r.role||'mapper') as UserRole}));
    }
    const rows=await this.db.getAllAsync<any>(`SELECT DISTINCT m.sender_id AS id,COALESCE(p.full_name,m.sender_name) AS name,COALESCE(p.role,m.sender_role,'mapper') AS role FROM local_chat_messages m LEFT JOIN local_profiles p ON p.id=m.sender_id WHERE m.channel_id=? ORDER BY name;`,[channel.id]);
    return rows.map(r=>({id:r.id,name:r.name||'Team member',role:(r.role||'mapper') as UserRole}));
  }

  static async getMessageReceiptState(messageId:string,channel:ChatChannel,senderId:string):Promise<'sent'|'delivered'|'read'>{
    const participants=(await this.getChannelParticipants(channel)).filter(p=>p.id!==senderId);
    if(!participants.length)return 'sent';
    const receipts=await this.getMessageReceipts(messageId);
    const byUser=new Map(receipts.map(r=>[r.userId,r]));
    if(participants.every(p=>Boolean(byUser.get(p.id)?.readAt)))return 'read';
    if(participants.every(p=>Boolean(byUser.get(p.id)?.deliveredAt)))return 'delivered';
    return 'sent';
  }

}
