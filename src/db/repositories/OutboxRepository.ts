/**
 * Outbox Repository (Local SQLite)
 * Manages atomic change event logs for offline synchronization.
 */

import { getDatabase } from '../sqlite';
import { OutboxQueueItem, OutboxAction } from '../../types';

export class OutboxRepository {
  private static get db() { return getDatabase(); }

  static async enqueue(
    tableName: string,
    recordId: string,
    action: OutboxAction,
    payload: Record<string, unknown>
  ): Promise<OutboxQueueItem> {
    const id = `out_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = Date.now();

    const item: OutboxQueueItem = {
      id,
      tableName,
      recordId,
      action,
      payload: JSON.stringify(payload),
      clientTimestamp: timestamp,
      status: 'pending',
      retryCount: 0,
    };

    await this.db.runAsync(
      `INSERT INTO local_outbox_queue (
        id, table_name, record_id, action, payload, client_timestamp, status, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0);`,
      [item.id, item.tableName, item.recordId, item.action, item.payload, item.clientTimestamp]
    );

    return item;
  }

  static async getPending(limit = 50): Promise<OutboxQueueItem[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_outbox_queue WHERE status IN ('pending','failed') AND retry_count < 5 ORDER BY client_timestamp ASC LIMIT ?;`,
      [limit]
    );

    return rows.map((r) => ({
      id: r.id,
      tableName: r.table_name,
      recordId: r.record_id,
      action: r.action,
      payload: r.payload,
      clientTimestamp: Number(r.client_timestamp),
      status: r.status,
      retryCount: Number(r.retry_count || 0),
      errorMessage: r.error_message,
    }));
  }

  static async markSynced(id: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM local_outbox_queue WHERE id = ?;`, [id]);
  }

  static async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE local_outbox_queue SET
        status = 'failed', error_message = ?, retry_count = retry_count + 1
       WHERE id = ?;`,
      [errorMessage, id]
    );
  }

  static async retryFailed(id?: string): Promise<void> {
    if (id) await this.db.runAsync(`UPDATE local_outbox_queue SET status = 'pending', error_message = NULL WHERE id = ? AND status = 'failed';`, [id]);
    else await this.db.runAsync(`UPDATE local_outbox_queue SET status = 'pending', error_message = NULL WHERE status = 'failed' AND retry_count < 5;`);
  }

  static async getQueue(limit = 200): Promise<OutboxQueueItem[]> {
    const rows = await this.db.getAllAsync<any>(`SELECT * FROM local_outbox_queue ORDER BY client_timestamp ASC LIMIT ?;`, [limit]);
    return rows.map((r) => ({ id:r.id, tableName:r.table_name, recordId:r.record_id, action:r.action, payload:r.payload, clientTimestamp:Number(r.client_timestamp), status:r.status, retryCount:Number(r.retry_count||0), errorMessage:r.error_message }));
  }

  static async countPending(): Promise<number> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT id FROM local_outbox_queue WHERE status IN ('pending','failed');`
    );
    return rows.length;
  }
}
