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
      `SELECT * FROM local_outbox_queue WHERE status = 'pending' AND retry_count < 5 ORDER BY client_timestamp ASC LIMIT ?;`,
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

  static async markConflict(id: string, errorMessage: string, serverPayload: Record<string, unknown> = {}, serverVersion = 0): Promise<void> {
    const item = (await this.getQueue()).find((x) => x.id === id);
    if (!item) return;
    const local = JSON.parse(item.payload || '{}') as Record<string, unknown>;
    const localVersion = Number(local.version || 1);
    const conflictId = 'conf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const now = new Date().toISOString();
    await this.db.runAsync('UPDATE local_outbox_queue SET status = \'conflict\', error_message = ? WHERE id = ?;', [errorMessage, id]);
    await this.db.runAsync(
      'INSERT INTO local_sync_conflicts (id, table_name, record_id, local_version, server_version, local_payload, server_payload, conflict_detected_at, resolution_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'unresolved\');',
      [conflictId, item.tableName, item.recordId, localVersion, serverVersion, item.payload, JSON.stringify(serverPayload), now]
    );
  }

  static async getConflicts(): Promise<any[]> {
    return this.db.getAllAsync<any>("SELECT * FROM local_sync_conflicts WHERE resolution_status = 'unresolved' ORDER BY conflict_detected_at DESC;");
  }

  static async resolveConflict(conflictId: string, retryLocal = false): Promise<void> {
    const conflict = await this.db.getFirstAsync<any>('SELECT * FROM local_sync_conflicts WHERE id = ?;', [conflictId]);
    if (!conflict) return;
    await this.db.runAsync("UPDATE local_sync_conflicts SET resolution_status = 'resolved' WHERE id = ?;", [conflictId]);
    if (retryLocal) await this.db.runAsync("UPDATE local_outbox_queue SET status = 'pending', error_message = NULL WHERE table_name = ? AND record_id = ? AND status = 'conflict';", [conflict.table_name, conflict.record_id]);
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
      `SELECT id FROM local_outbox_queue WHERE status IN ('pending','failed','conflict');`
    );
    return rows.length;
  }
}
