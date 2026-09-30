/**
 * Chat Repository (Local SQLite)
 * Operational group and mission communications with pinned notices,
 * deep-linked business/path/issue cards, and GPS pin sharing.
 */

import { getDatabase } from '../sqlite';
import { ChatChannel, ChatMessage, UserRole, SyncStatus } from '../../types';
import { OutboxRepository } from './OutboxRepository';

export class ChatRepository {
  private static get db() { return getDatabase(); }

  static async getOrCreateChannel(
    name: string,
    channelType: 'team' | 'mission' | 'announcements' | 'general',
    teamId?: string,
    missionId?: string
  ): Promise<ChatChannel> {
    const existing = await this.db.getFirstAsync<any>(
      `SELECT * FROM local_chat_channels WHERE name = ? OR (channel_type = ? AND (team_id = ? OR mission_id = ?));`,
      [name, channelType, teamId || '', missionId || '']
    );

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
      };
    }

    const id = `chn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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

    await this.db.runAsync(
      `INSERT INTO local_chat_channels (
        id, name, channel_type, team_id, mission_id, unread_count, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?);`,
      [id, name, channelType, teamId || null, missionId || null, now]
    );

    return newChannel;
  }

  static async getAllChannels(): Promise<ChatChannel[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_chat_channels ORDER BY created_at ASC;`
    );

    if (rows.length === 0) {
      // Seed default channels for out-of-the-box operations
      const defaultTeam = await this.getOrCreateChannel('Lagos West Alpha Channel', 'team', 'team_alpha_01');
      const announcements = await this.getOrCreateChannel('Operational Announcements', 'announcements');
      const missionComms = await this.getOrCreateChannel('Alaba Sweep Comms', 'mission', undefined, 'mission_alaba_01');
      return [defaultTeam, announcements, missionComms];
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      channelType: r.channel_type || r.channelType,
      teamId: r.team_id || r.teamId,
      missionId: r.mission_id || r.missionId,
      unreadCount: Number(r.unread_count || 0),
      lastMessageSnippet: r.last_message_snippet || r.lastMessageSnippet,
      lastMessageTime: r.last_message_time || r.lastMessageTime,
      createdAt: r.created_at || r.createdAt,
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
        shared_location_json, created_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only');`,
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
        now,
      ]
    );

    // Update channel snippet
    await this.db.runAsync(
      `UPDATE local_chat_channels
       SET last_message_snippet = ?, last_message_time = ?
       WHERE id = ?;`,
      [newMsg.text.slice(0, 60), now, newMsg.channelId]
    );

    await OutboxRepository.enqueue('local_chat_messages', id, 'INSERT', newMsg as unknown as Record<string, unknown>);

    return newMsg;
  }

  static async togglePin(messageId: string, isPinned: boolean): Promise<boolean> {
    await this.db.runAsync(
      `UPDATE local_chat_messages SET is_pinned = ? WHERE id = ?;`,
      [isPinned ? 1 : 0, messageId]
    );
    return true;
  }

  static async pinMessage(messageId: string): Promise<boolean> {
    return this.togglePin(messageId, true);
  }

  static async getPinnedMessages(channelId: string): Promise<ChatMessage[]> {
    const msgs = await this.getMessages(channelId);
    return msgs.filter((m) => m.isPinned);
  }
}
