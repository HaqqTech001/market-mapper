/**
 * Handover Repository (Local SQLite)
 * Manages shift handovers between mappers with audit trail,
 * safety/sync checklists, and area transfer state.
 */

import { getDatabase } from '../sqlite';
import { Handover, HandoverChecklist, HandoverStatus, SyncStatus } from '../../types';
import { OutboxRepository } from './OutboxRepository';
import { NotificationRepository } from './NotificationRepository';
import { nativeSupabase } from '../../native/supabase';

export class HandoverRepository {
  private static get db() { return getDatabase(); }

  static async createHandover(item: {
    id?: string;
    missionId: string;
    missionTitle?: string;
    areaId: string;
    areaName?: string;
    fromUserId: string;
    fromUserName?: string;
    toUserId: string;
    toUserName?: string;
    notes?: string;
    checklist?: HandoverChecklist;
    stallsCountAtHandover?: number;
    pathsCountAtHandover?: number;
  }): Promise<Handover> {
    const id = item.id || `hnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const syncStatus: SyncStatus = 'local_only';

    const handover: Handover = {
      id,
      missionId: item.missionId,
      missionTitle: item.missionTitle || 'Field Mission',
      areaId: item.areaId,
      areaName: item.areaName || 'Sector',
      fromUserId: item.fromUserId,
      fromUserName: item.fromUserName || 'Mapper',
      toUserId: item.toUserId,
      toUserName: item.toUserName || 'Relieving Mapper',
      status: 'pending',
      notes: item.notes,
      checklist: item.checklist || { safetyChecked: true, dataSynced: true, boundariesClarified: true },
      stallsCountAtHandover: item.stallsCountAtHandover || 0,
      pathsCountAtHandover: item.pathsCountAtHandover || 0,
      createdAt: now,
      updatedAt: now,
      syncStatus,
    };

    await this.db.runAsync(
      `INSERT INTO local_handovers (
        id, mission_id, mission_title, area_id, area_name,
        from_user_id, from_user_name, to_user_id, to_user_name,
        status, notes, checklist_json, stalls_count_at_handover,
        paths_count_at_handover, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only');`,
      [
        id,
        handover.missionId,
        handover.missionTitle,
        handover.areaId,
        handover.areaName,
        handover.fromUserId,
        handover.fromUserName,
        handover.toUserId,
        handover.toUserName,
        handover.status,
        handover.notes || null,
        JSON.stringify(handover.checklist),
        handover.stallsCountAtHandover,
        handover.pathsCountAtHandover,
        now,
        now,
      ]
    );

    // Trigger notification to relieving mapper
    await NotificationRepository.createNotification({
      recipientId: handover.toUserId,
      type: 'handover_request',
      title: `Shift Handover Request: ${handover.areaName}`,
      body: `${handover.fromUserName} has initiated a handover for ${handover.areaName} with ${handover.stallsCountAtHandover} stalls recorded.`,
      entityReferenceType: 'handover',
      entityReferenceId: handover.id,
    });

    await OutboxRepository.enqueue('local_handovers', id, 'INSERT', handover as unknown as Record<string, unknown>);

    return handover;
  }

  static async getAllHandovers(): Promise<Handover[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_handovers ORDER BY created_at DESC;`
    );
    return rows.map((r) => this.mapHandoverRow(r));
  }

  static async getHandoverById(id: string): Promise<Handover | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM local_handovers WHERE id = ?;`,
      [id]
    );
    if (!row) return null;
    return this.mapHandoverRow(row);
  }

  static async getHandoversForMission(missionId: string): Promise<Handover[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_handovers WHERE mission_id = ? ORDER BY created_at DESC;`,
      [missionId]
    );
    return rows.map((r) => this.mapHandoverRow(r));
  }

  static async getHandoversForUser(userId: string): Promise<Handover[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_handovers WHERE from_user_id = ? OR to_user_id = ? ORDER BY created_at DESC;`,
      [userId, userId]
    );
    return rows.map((r) => this.mapHandoverRow(r));
  }

  static async updateStatus(id: string, newStatus: HandoverStatus): Promise<boolean> {
    const handover = await this.getHandoverById(id);
    if (!handover) return false;

    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_handovers SET status = ?, updated_at = ? WHERE id = ?;`,
      [newStatus, now, id]
    );

    if (newStatus === 'accepted') {
      // Prefer authoritative atomic cloud transfer. If offline/unreachable, retain the local
      // acceptance as pending sync; the server will still reject it as stale if assignment changed.
      try {
        const { data, error } = await nativeSupabase.rpc('accept_handover_atomic', { target_handover_id: id });
        if (error) throw error;
        if (!data?.accepted) {
          await this.db.runAsync(`UPDATE local_handovers SET status='stale', updated_at=? WHERE id=?;`, [now, id]);
          return false;
        }
      } catch (error) {
        console.warn('Handover cloud acceptance deferred; local state remains pending sync', error);
      }
      // Local race check protects offline continuity until authoritative sync/reconciliation.
      const currentAssign = await this.db.getFirstAsync<any>(
        `SELECT assigned_to_user_id FROM local_mission_area_assignments WHERE mission_id = ? AND area_id = ?;`,
        [handover.missionId, handover.areaId]
      );
      if (
        currentAssign &&
        currentAssign.assigned_to_user_id &&
        currentAssign.assigned_to_user_id !== handover.fromUserId &&
        currentAssign.assigned_to_user_id !== handover.toUserId
      ) {
        // Assignment changed in the meantime! Mark handover as stale
        await this.db.runAsync(
          `UPDATE local_handovers SET status = 'stale', updated_at = ? WHERE id = ?;`,
          [now, id]
        );
        return false;
      }

      // Notify original mapper
      await NotificationRepository.createNotification({
        recipientId: handover.fromUserId,
        type: 'handover_accepted',
        title: `Handover Accepted: ${handover.areaName}`,
        body: `${handover.toUserName} has accepted handover for ${handover.areaName}. Area responsibility transferred.`,
        entityReferenceType: 'handover',
        entityReferenceId: handover.id,
      });

      // Update area assignment to new mapper
      await this.db.runAsync(
        `UPDATE local_mission_area_assignments
         SET assigned_to_user_id = ?, assigned_to_user_name = ?
         WHERE mission_id = ? AND area_id = ?;`,
        [handover.toUserId, handover.toUserName, handover.missionId, handover.areaId]
      );
    }

    await OutboxRepository.enqueue('local_handovers', id, 'UPDATE', {
      status: newStatus,
      updated_at: now,
    });

    return true;
  }

  private static mapHandoverRow(r: any): Handover {
    let checklist: HandoverChecklist = {
      safetyChecked: true,
      dataSynced: true,
      boundariesClarified: true,
    };
    if (r.checklist_json) {
      try {
        checklist = JSON.parse(r.checklist_json);
      } catch {}
    }

    return {
      id: r.id,
      missionId: r.mission_id || r.missionId,
      missionTitle: r.mission_title || r.missionTitle || 'Field Mission',
      areaId: r.area_id || r.areaId,
      areaName: r.area_name || r.areaName || 'Sector',
      fromUserId: r.from_user_id || r.fromUserId,
      fromUserName: r.from_user_name || r.fromUserName || 'Mapper',
      toUserId: r.to_user_id || r.toUserId,
      toUserName: r.to_user_name || r.toUserName || 'Relieving Mapper',
      status: r.status || 'pending',
      notes: r.notes,
      checklist,
      stallsCountAtHandover: Number(r.stalls_count_at_handover || r.stallsCountAtHandover || 0),
      pathsCountAtHandover: Number(r.paths_count_at_handover || r.pathsCountAtHandover || 0),
      createdAt: r.created_at || r.createdAt,
      updatedAt: r.updated_at || r.updatedAt,
      syncStatus: r.sync_status || r.syncStatus || 'local_only',
    };
  }
}
