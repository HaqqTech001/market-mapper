/**
 * Notification Repository (Local SQLite)
 * Provides persistent in-app notifications, unread counts, and deep-link reference resolving.
 */

import { getDatabase } from '../sqlite';
import { NotificationItem, NotificationType, SyncStatus } from '../../types';
import { OutboxRepository } from './OutboxRepository';

export class NotificationRepository {
  private static db = getDatabase();

  static async createNotification(item: {
    id?: string;
    recipientId: string;
    type: NotificationType;
    title: string;
    body: string;
    entityReferenceType?: string;
    entityReferenceId?: string;
  }): Promise<NotificationItem> {
    const id = item.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const syncStatus: SyncStatus = 'local_only';

    const notif: NotificationItem = {
      id,
      recipientId: item.recipientId,
      type: item.type,
      title: item.title,
      body: item.body,
      entityReferenceType: item.entityReferenceType,
      entityReferenceId: item.entityReferenceId,
      isRead: false,
      createdAt: now,
      syncStatus,
    };

    await this.db.runAsync(
      `INSERT INTO local_notifications (
        id, recipient_id, type, title, body, entity_reference_type, entity_reference_id, is_read, created_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'local_only');`,
      [
        notif.id,
        notif.recipientId,
        notif.type,
        notif.title,
        notif.body,
        notif.entityReferenceType || null,
        notif.entityReferenceId || null,
        notif.createdAt,
      ]
    );

    await OutboxRepository.enqueue('local_notifications', id, 'INSERT', notif as unknown as Record<string, unknown>);

    return notif;
  }

  static async getNotificationsForUser(recipientId: string, limit = 50): Promise<NotificationItem[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT ?;`,
      [recipientId, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      recipientId: r.recipient_id || r.recipientId,
      type: r.type,
      title: r.title,
      body: r.body,
      entityReferenceType: r.entity_reference_type || r.entityReferenceType,
      entityReferenceId: r.entity_reference_id || r.entityReferenceId,
      isRead: Boolean(r.is_read || r.isRead),
      createdAt: r.created_at || r.createdAt,
      syncStatus: r.sync_status || 'local_only',
    }));
  }

  static async getUnreadCount(recipientId: string): Promise<number> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT id FROM local_notifications WHERE recipient_id = ? AND is_read = 0;`,
      [recipientId]
    );
    return rows.length;
  }

  static async markAsRead(id: string): Promise<boolean> {
    await this.db.runAsync(
      `UPDATE local_notifications SET is_read = 1 WHERE id = ?;`,
      [id]
    );
    return true;
  }

  static async markAllAsRead(recipientId: string): Promise<boolean> {
    await this.db.runAsync(
      `UPDATE local_notifications SET is_read = 1 WHERE recipient_id = ?;`,
      [recipientId]
    );
    return true;
  }
}
