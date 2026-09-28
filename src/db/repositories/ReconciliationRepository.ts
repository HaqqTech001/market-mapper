/**
 * Area Reconciliation Repository (Local SQLite)
 * Manages area survey sign-offs, stall/path tallying,
 * team lead review workflows, and revisit sweeps.
 */

import { getDatabase } from '../sqlite';
import { AreaReconciliation, ReconciliationStatus, SyncStatus } from '../../types';
import { OutboxRepository } from './OutboxRepository';
import { NotificationRepository } from './NotificationRepository';
import { MissionRepository } from './MissionRepository';

export class ReconciliationRepository {
  private static db = getDatabase();

  static async submitReconciliation(item: {
    id?: string;
    missionId: string;
    missionTitle?: string;
    areaId: string;
    areaName: string;
    reconciledBy: string;
    reconciledByName?: string;
    reviewNotes?: string;
    teamLeadUserId?: string;
  }): Promise<AreaReconciliation> {
    const id = item.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const syncStatus: SyncStatus = 'local_only';

    // Count stalls mapped in this area/mission
    const bizRows = await this.db.getAllAsync<any>(
      `SELECT id FROM local_businesses WHERE mission_id = ? AND (area_id = ? OR area_id IS NULL) AND (is_deleted = 0 OR is_deleted IS NULL);`,
      [item.missionId, item.areaId]
    );
    const stallsCounted = bizRows.length;

    // Count paths recorded
    const pathRows = await this.db.getAllAsync<any>(
      `SELECT id FROM local_paths WHERE mission_id = ? AND (is_deleted = 0 OR is_deleted IS NULL);`,
      [item.missionId]
    );
    const pathsRecorded = pathRows.length;

    // Count open issues
    const issueRows = await this.db.getAllAsync<any>(
      `SELECT id FROM local_field_issues WHERE mission_id = ? AND (area_id = ? OR area_id IS NULL) AND status = 'open';`,
      [item.missionId, item.areaId]
    );
    const unresolvedIssuesCount = issueRows.length;

    const reconciliation: AreaReconciliation = {
      id,
      missionId: item.missionId,
      missionTitle: item.missionTitle || 'Field Mission',
      areaId: item.areaId,
      areaName: item.areaName,
      reconciledBy: item.reconciledBy,
      reconciledByName: item.reconciledByName || 'Mapper',
      stallsCounted,
      pathsRecorded,
      unresolvedIssuesCount,
      status: 'pending_lead_review',
      reviewNotes: item.reviewNotes,
      createdAt: now,
      updatedAt: now,
      syncStatus,
    };

    await this.db.runAsync(
      `INSERT INTO local_area_reconciliations (
        id, mission_id, mission_title, area_id, area_name,
        reconciled_by, reconciled_by_name, stalls_counted,
        paths_recorded, unresolved_issues_count, status,
        review_notes, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_lead_review', ?, ?, ?, 'local_only');`,
      [
        id,
        reconciliation.missionId,
        reconciliation.missionTitle,
        reconciliation.areaId,
        reconciliation.areaName,
        reconciliation.reconciledBy,
        reconciliation.reconciledByName,
        reconciliation.stallsCounted,
        reconciliation.pathsRecorded,
        reconciliation.unresolvedIssuesCount,
        reconciliation.reviewNotes || null,
        now,
        now,
      ]
    );

    if (item.teamLeadUserId) {
      await NotificationRepository.createNotification({
        recipientId: item.teamLeadUserId,
        type: 'reconciliation_review',
        title: `Area Ready for Review: ${reconciliation.areaName}`,
        body: `${reconciliation.reconciledByName} submitted ${reconciliation.areaName} with ${stallsCounted} stalls and ${pathsRecorded} paths recorded.`,
        entityReferenceType: 'reconciliation',
        entityReferenceId: reconciliation.id,
      });
    }

    await OutboxRepository.enqueue('local_area_reconciliations', id, 'INSERT', reconciliation as unknown as Record<string, unknown>);

    return reconciliation;
  }

  static async getReconciliationsForMission(missionId: string): Promise<AreaReconciliation[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_area_reconciliations WHERE mission_id = ? ORDER BY created_at DESC;`,
      [missionId]
    );
    return rows.map((r) => this.mapReconciliationRow(r));
  }

  static async reviewReconciliation(
    id: string,
    status: 'approved' | 'requires_revisit',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<boolean> {
    const recRow = await this.db.getFirstAsync<any>(
      `SELECT * FROM local_area_reconciliations WHERE id = ?;`,
      [id]
    );
    if (!recRow) return false;

    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_area_reconciliations
       SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?;`,
      [status, reviewedBy, reviewNotes || null, now, now, id]
    );

    if (status === 'approved') {
      await MissionRepository.updateAreaAssignmentStatus(recRow.mission_id, recRow.area_id, 'completed');
    }

    // Notify mapper
    await NotificationRepository.createNotification({
      recipientId: recRow.reconciled_by,
      type: status === 'approved' ? 'record_correction' : 'verification_request',
      title: status === 'approved' ? `Area Approved: ${recRow.area_name}` : `Revisit Requested: ${recRow.area_name}`,
      body: status === 'approved'
        ? `Lead approved survey reconciliation for ${recRow.area_name}. Great job!`
        : `Lead requested a sweep revisit for ${recRow.area_name}: ${reviewNotes || 'Check unverified areas.'}`,
      entityReferenceType: 'reconciliation',
      entityReferenceId: id,
    });

    await OutboxRepository.enqueue('local_area_reconciliations', id, 'UPDATE', {
      status,
      reviewed_by: reviewedBy,
      review_notes: reviewNotes || null,
      reviewed_at: now,
      updated_at: now,
    });

    return true;
  }

  private static mapReconciliationRow(r: any): AreaReconciliation {
    return {
      id: r.id,
      missionId: r.mission_id || r.missionId,
      missionTitle: r.mission_title || r.missionTitle || 'Field Mission',
      areaId: r.area_id || r.areaId,
      areaName: r.area_name || r.areaName || 'Sector',
      reconciledBy: r.reconciled_by || r.reconciledBy,
      reconciledByName: r.reconciled_by_name || r.reconciledByName || 'Mapper',
      stallsCounted: Number(r.stalls_counted || r.stallsCounted || 0),
      pathsRecorded: Number(r.paths_recorded || r.pathsRecorded || 0),
      unresolvedIssuesCount: Number(r.unresolved_issues_count || r.unresolvedIssuesCount || 0),
      status: (r.status || 'pending_lead_review') as ReconciliationStatus,
      reviewNotes: r.review_notes || r.reviewNotes,
      reviewedBy: r.reviewed_by || r.reviewedBy,
      reviewedAt: r.reviewed_at || r.reviewedAt,
      createdAt: r.created_at || r.createdAt,
      updatedAt: r.updated_at || r.updatedAt,
      syncStatus: r.sync_status || r.syncStatus || 'local_only',
    };
  }
}
