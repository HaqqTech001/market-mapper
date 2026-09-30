/**
 * Field Issue Repository (Local SQLite)
 * Manages physical roadblocks, access blocks, safety hazards, and dispute alerts
 * reported by field mappers during survey sweeps.
 */

import { getDatabase } from '../sqlite';
import {
  FieldIssue,
  FieldIssueType,
  FieldIssueSeverity,
  FieldIssueStatus,
  UserRole,
  SyncStatus,
} from '../../types';
import { OutboxRepository } from './OutboxRepository';
import { NotificationRepository } from './NotificationRepository';

export class FieldIssueRepository {
  private static get db() { return getDatabase(); }

  static async reportIssue(item: {
    id?: string;
    missionId: string;
    missionTitle?: string;
    areaId?: string;
    areaName?: string;
    reportedBy: string;
    reportedByName?: string;
    reportedByRole?: UserRole;
    issueType: FieldIssueType;
    severity?: FieldIssueSeverity;
    title: string;
    description: string;
    latitude?: number;
    longitude?: number;
    locationLabel?: string;
    photoUri?: string;
    teamLeadUserId?: string;
  }): Promise<FieldIssue> {
    const id = item.id || `iss_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const severity = item.severity || 'medium';
    const status: FieldIssueStatus = 'open';
    const syncStatus: SyncStatus = 'local_only';

    const issue: FieldIssue = {
      id,
      missionId: item.missionId,
      missionTitle: item.missionTitle || 'Field Mission',
      areaId: item.areaId,
      areaName: item.areaName,
      reportedBy: item.reportedBy,
      reportedByName: item.reportedByName || 'Mapper',
      reportedByRole: item.reportedByRole || 'mapper',
      issueType: item.issueType,
      severity,
      title: item.title,
      description: item.description,
      latitude: item.latitude,
      longitude: item.longitude,
      locationLabel: item.locationLabel,
      photoUri: item.photoUri,
      status,
      createdAt: now,
      updatedAt: now,
      syncStatus,
    };

    await this.db.runAsync(
      `INSERT INTO local_field_issues (
        id, mission_id, mission_title, area_id, area_name,
        reported_by, reported_by_name, reported_by_role,
        issue_type, severity, title, description,
        latitude, longitude, location_label, photo_uri,
        status, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, 'local_only');`,
      [
        id,
        issue.missionId,
        issue.missionTitle,
        issue.areaId || null,
        issue.areaName || null,
        issue.reportedBy,
        issue.reportedByName,
        issue.reportedByRole,
        issue.issueType,
        issue.severity,
        issue.title,
        issue.description,
        issue.latitude || null,
        issue.longitude || null,
        issue.locationLabel || null,
        issue.photoUri || null,
        now,
        now,
      ]
    );

    // If critical or high, notify team lead
    if (item.teamLeadUserId && (severity === 'high' || severity === 'critical')) {
      await NotificationRepository.createNotification({
        recipientId: item.teamLeadUserId,
        type: 'field_issue_alert',
        title: `⚠️ ${severity.toUpperCase()} Field Issue: ${issue.title}`,
        body: `${issue.reportedByName} flagged an issue in ${issue.areaName || 'Mission Area'}: ${issue.description.slice(0, 100)}`,
        entityReferenceType: 'issue',
        entityReferenceId: issue.id,
      });
    }

    await OutboxRepository.enqueue('local_field_issues', id, 'INSERT', issue as unknown as Record<string, unknown>);

    return issue;
  }

  static async getIssueById(id: string): Promise<FieldIssue | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM local_field_issues WHERE id = ?;`,
      [id]
    );
    if (!row) return null;
    return this.mapIssueRow(row);
  }

  static async getIssuesForMission(missionId: string): Promise<FieldIssue[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_field_issues WHERE mission_id = ? ORDER BY created_at DESC;`,
      [missionId]
    );
    return rows.map((r) => this.mapIssueRow(r));
  }

  static async getAllIssues(): Promise<FieldIssue[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_field_issues ORDER BY created_at DESC;`
    );
    return rows.map((r) => this.mapIssueRow(r));
  }

  static async resolveIssue(
    id: string,
    resolvedBy: string,
    resolvedByName: string,
    resolutionNotes: string
  ): Promise<boolean> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_field_issues
       SET status = 'resolved', resolved_by = ?, resolved_by_name = ?,
           resolution_notes = ?, resolved_at = ?, updated_at = ?
       WHERE id = ?;`,
      [resolvedBy, resolvedByName, resolutionNotes, now, now, id]
    );

    await OutboxRepository.enqueue('local_field_issues', id, 'UPDATE', {
      status: 'resolved',
      resolved_by: resolvedBy,
      resolved_by_name: resolvedByName,
      resolution_notes: resolutionNotes,
      resolved_at: now,
      updated_at: now,
    });

    return true;
  }

  static async dismissIssue(id: string, notes?: string): Promise<boolean> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_field_issues
       SET status = 'dismissed', resolution_notes = ?, updated_at = ?
       WHERE id = ?;`,
      [notes || null, now, id]
    );

    await OutboxRepository.enqueue('local_field_issues', id, 'UPDATE', {
      status: 'dismissed',
      resolution_notes: notes || null,
      updated_at: now,
    });

    return true;
  }

  private static mapIssueRow(r: any): FieldIssue {
    return {
      id: r.id,
      missionId: r.mission_id || r.missionId,
      missionTitle: r.mission_title || r.missionTitle || 'Field Mission',
      areaId: r.area_id || r.areaId,
      areaName: r.area_name || r.areaName,
      reportedBy: r.reported_by || r.reportedBy,
      reportedByName: r.reported_by_name || r.reportedByName || 'Mapper',
      reportedByRole: (r.reported_by_role || r.reportedByRole || 'mapper') as UserRole,
      issueType: (r.issue_type || r.issueType || 'other') as FieldIssueType,
      severity: (r.severity || 'medium') as FieldIssueSeverity,
      title: r.title,
      description: r.description,
      latitude: r.latitude ? Number(r.latitude) : undefined,
      longitude: r.longitude ? Number(r.longitude) : undefined,
      locationLabel: r.location_label || r.locationLabel,
      photoUri: r.photo_uri || r.photoUri,
      status: (r.status || 'open') as FieldIssueStatus,
      resolvedBy: r.resolved_by || r.resolvedBy,
      resolvedByName: r.resolved_by_name || r.resolvedByName,
      resolutionNotes: r.resolution_notes || r.resolutionNotes,
      resolvedAt: r.resolved_at || r.resolvedAt,
      createdAt: r.created_at || r.createdAt,
      updatedAt: r.updated_at || r.updatedAt,
      syncStatus: r.sync_status || r.syncStatus || 'local_only',
    };
  }
}
