/**
 * Audit Repository (Local SQLite)
 * Logs administrative actions, mission lifecycle shifts, role reassignments,
 * and operational overrides for security & governance tracking.
 */

import { getDatabase } from '../sqlite';
import { OutboxRepository } from './OutboxRepository';

export interface AuditLogItem {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorName?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export class AuditRepository {
  private static db = getDatabase();

  static async logAction(item: {
    actionType: string;
    entityType: string;
    entityId: string;
    actorId: string;
    actorName?: string;
    details?: Record<string, unknown>;
  }): Promise<AuditLogItem> {
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const entry: AuditLogItem = {
      id,
      actionType: item.actionType,
      entityType: item.entityType,
      entityId: item.entityId,
      actorId: item.actorId,
      actorName: item.actorName || 'System/Admin',
      details: item.details,
      createdAt: now,
    };

    await this.db.runAsync(
      `INSERT INTO local_audit_logs (
        id, action_type, entity_type, entity_id, actor_id, actor_name, details_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        entry.actionType,
        entry.entityType,
        entry.entityId,
        entry.actorId,
        entry.actorName,
        entry.details ? JSON.stringify(entry.details) : null,
        now,
      ]
    );

    await OutboxRepository.enqueue('local_audit_logs', id, 'INSERT', entry as unknown as Record<string, unknown>);

    return entry;
  }

  static async getLogsForEntity(entityType: string, entityId: string): Promise<AuditLogItem[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC;`,
      [entityType, entityId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  static async getAllLogs(limit = 100): Promise<AuditLogItem[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_audit_logs ORDER BY created_at DESC LIMIT ?;`,
      [limit]
    );
    return rows.map((r) => this.mapRow(r));
  }

  private static mapRow(r: any): AuditLogItem {
    let details = undefined;
    if (r.details_json) {
      try {
        details = JSON.parse(r.details_json);
      } catch {}
    }

    return {
      id: r.id,
      actionType: r.action_type || r.actionType,
      entityType: r.entity_type || r.entityType,
      entityId: r.entity_id || r.entityId,
      actorId: r.actor_id || r.actorId,
      actorName: r.actor_name || r.actorName,
      details,
      createdAt: r.created_at || r.createdAt,
    };
  }
}
