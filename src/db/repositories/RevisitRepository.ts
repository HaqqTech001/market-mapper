/**
 * Revisit Repository (Local SQLite)
 * Structured handling of field items flagged for follow-up or verification.
 */

import { getDatabase } from '../sqlite';
import { Revisit, RevisitReason, RevisitEntityType } from '../../types';
import { OutboxRepository } from './OutboxRepository';

export class RevisitRepository {
  private static get db() { return getDatabase(); }

  static async flag(revisit: Omit<Revisit, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'status'>): Promise<Revisit> {
    const id = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const record: Revisit = {
      ...revisit,
      id,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local_only',
    };

    await this.db.runAsync(
      `INSERT INTO local_revisits (
        id, mission_id, entity_type, entity_id, entity_title, reason, notes,
        status, assigned_to, flagged_by, resolved_by, resolution_notes,
        resolved_at, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, NULL, NULL, NULL, ?, ?, 'local_only');`,
      [
        record.id,
        record.missionId,
        record.entityType,
        record.entityId,
        record.entityTitle || null,
        record.reason,
        record.notes || null,
        record.assignedTo || null,
        record.flaggedBy,
        now,
        now,
      ]
    );

    await OutboxRepository.enqueue('local_revisits', id, 'INSERT', record as unknown as Record<string, unknown>);
    return record;
  }

  static async getAll(missionId?: string): Promise<Revisit[]> {
    const sql = missionId
      ? `SELECT * FROM local_revisits WHERE mission_id = ? ORDER BY created_at DESC;`
      : `SELECT * FROM local_revisits ORDER BY created_at DESC;`;
    const params = missionId ? [missionId] : [];

    const rows = await this.db.getAllAsync<any>(sql, params);
    return rows.map((r) => ({
      id: r.id,
      missionId: r.mission_id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      entityTitle: r.entity_title,
      reason: r.reason,
      notes: r.notes,
      status: r.status,
      assignedTo: r.assigned_to,
      flaggedBy: r.flagged_by,
      resolvedBy: r.resolved_by,
      resolutionNotes: r.resolution_notes,
      resolvedAt: r.resolved_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      syncStatus: r.sync_status,
    }));
  }

  static async resolve(id: string, resolvedBy: string, resolutionNotes?: string): Promise<boolean> {
    const now = new Date().toISOString();
    await this.db.runAsync("UPDATE local_revisits SET status='resolved', resolved_by=?, resolution_notes=?, resolved_at=?, updated_at=? WHERE id=?;", [resolvedBy, resolutionNotes || null, now, now, id]);
    await OutboxRepository.enqueue('local_revisits', id, 'UPDATE', { status:'resolved', resolvedBy, resolutionNotes:resolutionNotes || null, resolvedAt:now, updatedAt:now });
    return true;
  }

  static async countOpen(): Promise<number> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT id FROM local_revisits WHERE status = 'open';`
    );
    return rows.length;
  }
}
