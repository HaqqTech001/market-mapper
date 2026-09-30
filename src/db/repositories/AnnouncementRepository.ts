/**
 * Mission Announcement Repository (Local SQLite)
 * Authoritative single source of truth for mission announcements & directives.
 * Synchronized across mission header banners, persistent notifications, and pinned chat.
 */

import { getDatabase } from '../sqlite';
import { OutboxRepository } from './OutboxRepository';
import { NotificationRepository } from './NotificationRepository';
import { ChatRepository } from './ChatRepository';

export interface MissionAnnouncement {
  id: string;
  missionId: string;
  authorId: string;
  authorName?: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export class AnnouncementRepository {
  private static get db() { return getDatabase(); }

  static async createAnnouncement(item: {
    id?: string;
    missionId: string;
    authorId: string;
    authorName?: string;
    title: string;
    content: string;
    isPinned?: boolean;
    notifyMembers?: boolean;
    channelId?: string;
  }): Promise<MissionAnnouncement> {
    const id = item.id || `anc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const isPinned = item.isPinned !== false;

    const anc: MissionAnnouncement = {
      id,
      missionId: item.missionId,
      authorId: item.authorId,
      authorName: item.authorName || 'Team Lead',
      title: item.title,
      content: item.content,
      isPinned,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.runAsync(
      `INSERT INTO local_mission_announcements (
        id, mission_id, author_id, author_name, title, content, is_pinned, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        anc.missionId,
        anc.authorId,
        anc.authorName,
        anc.title,
        anc.content,
        anc.isPinned ? 1 : 0,
        now,
        now,
      ]
    );

    // If channel provided or default channel exists, pin in chat
    if (item.channelId) {
      await ChatRepository.sendMessage({
        channelId: item.channelId,
        senderId: item.authorId,
        senderName: item.authorName || 'Team Lead',
        senderRole: 'team_lead',
        text: `📢 ANNOUNCEMENT: ${anc.title}\n${anc.content}`,
        isPinned: true,
      });
    }

    await OutboxRepository.enqueue('local_mission_announcements', id, 'INSERT', anc as unknown as Record<string, unknown>);

    return anc;
  }

  static async getAnnouncementsForMission(missionId: string): Promise<MissionAnnouncement[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_mission_announcements WHERE mission_id = ? ORDER BY created_at DESC;`,
      [missionId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  static async getLatestPinnedForMission(missionId: string): Promise<MissionAnnouncement | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM local_mission_announcements WHERE mission_id = ? AND is_pinned = 1 ORDER BY created_at DESC LIMIT 1;`,
      [missionId]
    );
    if (!row) return null;
    return this.mapRow(row);
  }

  private static mapRow(r: any): MissionAnnouncement {
    return {
      id: r.id,
      missionId: r.mission_id || r.missionId,
      authorId: r.author_id || r.authorId,
      authorName: r.author_name || r.authorName,
      title: r.title,
      content: r.content,
      isPinned: Number(r.is_pinned ?? r.isPinned ?? 1) === 1,
      createdAt: r.created_at || r.createdAt,
      updatedAt: r.updated_at || r.updatedAt,
    };
  }
}
