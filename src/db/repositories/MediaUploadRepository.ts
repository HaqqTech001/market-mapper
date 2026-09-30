/**
 * Separate Local Media Upload Queue Repository
 * Isolates binary photo uploads from relational entity synchronization.
 */

import { getDatabase } from '../sqlite';
import { MediaUploadQueueItem, MediaUploadStatus } from '../../types';

export class MediaUploadRepository {
  private static get db() { return getDatabase(); }

  /**
   * Enqueues a locally staged field photo for upload
   */
  static async enqueue(item: Omit<MediaUploadQueueItem, 'id' | 'createdAt' | 'updatedAt' | 'retryCount' | 'status'>): Promise<MediaUploadQueueItem> {
    const id = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const record: MediaUploadQueueItem = {
      ...item,
      id,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.runAsync(
      `INSERT INTO local_media_upload_queue (
        id, local_uri, bucket, remote_path, entity_type, entity_id, media_type,
        status, retry_count, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?, ?);`,
      [
        record.id,
        record.localUri,
        record.bucket,
        record.remotePath,
        record.entityType,
        record.entityId,
        record.mediaType,
        now,
        now,
      ]
    );

    return record;
  }

  /**
   * Updates media job status
   */
  static async updateStatus(
    id: string,
    status: MediaUploadStatus,
    errorMessage?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_media_upload_queue SET
        status = ?, error_message = ?, updated_at = ?, retry_count = retry_count + 1
       WHERE id = ?;`,
      [status, errorMessage || null, now, id]
    );
  }

  /**
   * Gets pending upload items
   */
  static async getPending(): Promise<MediaUploadQueueItem[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_media_upload_queue WHERE status IN ('pending', 'failed') ORDER BY created_at ASC;`
    );
    return rows.map((r) => ({
      id: r.id,
      localUri: r.local_uri,
      bucket: r.bucket,
      remotePath: r.remote_path,
      entityType: r.entity_type,
      entityId: r.entity_id,
      mediaType: r.media_type,
      status: r.status,
      retryCount: Number(r.retry_count || 0),
      errorMessage: r.error_message,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  static async countPending(): Promise<number> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT id FROM local_media_upload_queue WHERE status = 'pending';`
    );
    return rows.length;
  }
}
