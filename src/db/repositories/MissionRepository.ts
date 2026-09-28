/**
 * Mission Repository (Local SQLite)
 * Handles full Phase 5 Mission Lifecycle, team assignments, area allocation,
 * and real-time operational progress calculation for field mappers and leads.
 */

import { getDatabase } from '../sqlite';
import {
  Mission,
  MissionMember,
  MissionAreaAssignment,
  MissionProgress,
  MissionStatus,
  MissionType,
  MissionPriority,
  SyncStatus,
} from '../../types';
import { OutboxRepository } from './OutboxRepository';

export class MissionRepository {
  private static db = getDatabase();

  static async createMission(mission: {
    id?: string;
    marketId: string;
    marketName?: string;
    title: string;
    missionType: MissionType;
    status?: MissionStatus;
    priority?: MissionPriority;
    teamId?: string;
    teamName?: string;
    leadUserId?: string;
    description?: string;
    targetStalls?: number;
    estimatedHours?: number;
    dueDate?: string;
    createdBy: string;
  }): Promise<Mission> {
    const id = mission.id || `msn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const status = mission.status || 'draft';
    const priority = mission.priority || 'medium';
    const targetStalls = mission.targetStalls || 100;
    const estimatedHours = mission.estimatedHours || 8;
    const syncStatus: SyncStatus = 'local_only';

    const newMission: Mission = {
      id,
      marketId: mission.marketId,
      marketName: mission.marketName || 'Market Area',
      title: mission.title,
      missionType: mission.missionType,
      status,
      priority,
      teamId: mission.teamId,
      teamName: mission.teamName,
      leadUserId: mission.leadUserId,
      description: mission.description,
      targetStalls,
      estimatedHours,
      dueDate: mission.dueDate,
      createdBy: mission.createdBy,
      createdAt: now,
      updatedAt: now,
      syncStatus,
    };

    await this.db.runAsync(
      `INSERT INTO local_missions (
        id, market_id, market_name, title, mission_type, status, priority,
        team_id, team_name, lead_user_id, description, target_stalls,
        estimated_hours, due_date, created_by, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newMission.id,
        newMission.marketId,
        newMission.marketName,
        newMission.title,
        newMission.missionType,
        newMission.status,
        newMission.priority,
        newMission.teamId || null,
        newMission.teamName || null,
        newMission.leadUserId || null,
        newMission.description || null,
        newMission.targetStalls,
        newMission.estimatedHours,
        newMission.dueDate || null,
        newMission.createdBy,
        newMission.createdAt,
        newMission.updatedAt,
        newMission.syncStatus,
      ]
    );

    await OutboxRepository.enqueue('local_missions', id, 'INSERT', newMission as unknown as Record<string, unknown>);

    return newMission;
  }

  static async getMissionById(id: string): Promise<Mission | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM local_missions WHERE id = ?;`,
      [id]
    );
    if (!row) return null;
    return this.mapMissionRow(row);
  }

  static async getAllMissions(): Promise<Mission[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_missions ORDER BY created_at DESC;`
    );
    return rows.map((r) => this.mapMissionRow(r));
  }

  static async getMissionsByStatus(status: MissionStatus): Promise<Mission[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_missions WHERE status = ? ORDER BY created_at DESC;`,
      [status]
    );
    return rows.map((r) => this.mapMissionRow(r));
  }

  static async getMissionsForUser(userId: string): Promise<Mission[]> {
    // Check if user is lead or assigned to mission areas or a member
    const memberRows = await this.db.getAllAsync<any>(
      `SELECT DISTINCT mission_id FROM local_mission_members WHERE user_id = ?;`,
      [userId]
    );
    const assignedRows = await this.db.getAllAsync<any>(
      `SELECT DISTINCT mission_id FROM local_mission_area_assignments WHERE assigned_to_user_id = ?;`,
      [userId]
    );
    const directRows = await this.db.getAllAsync<any>(
      `SELECT id as mission_id FROM local_missions WHERE lead_user_id = ? OR created_by = ?;`,
      [userId, userId]
    );

    const missionIds = Array.from(
      new Set([
        ...memberRows.map((r) => r.mission_id),
        ...assignedRows.map((r) => r.mission_id),
        ...directRows.map((r) => r.mission_id),
      ])
    ).filter(Boolean);

    if (missionIds.length === 0) {
      // Return active/scheduled missions as fallbacks
      return this.getAllMissions();
    }

    const all = await this.getAllMissions();
    return all.filter((m) => missionIds.includes(m.id));
  }

  static async updateMissionStatus(id: string, newStatus: MissionStatus): Promise<boolean> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_missions SET status = ?, updated_at = ? WHERE id = ?;`,
      [newStatus, now, id]
    );

    await OutboxRepository.enqueue('local_missions', id, 'UPDATE', {
      status: newStatus,
      updated_at: now,
    });

    return true;
  }

  static async updateMission(id: string, updates: Partial<Mission>): Promise<Mission | null> {
    const current = await this.getMissionById(id);
    if (!current) return null;

    const now = new Date().toISOString();
    const updated: Mission = {
      ...current,
      ...updates,
      updatedAt: now,
    };

    await this.db.runAsync(
      `UPDATE local_missions SET
        title = ?, mission_type = ?, status = ?, priority = ?,
        team_id = ?, team_name = ?, lead_user_id = ?, description = ?,
        target_stalls = ?, estimated_hours = ?, due_date = ?, updated_at = ?
      WHERE id = ?;`,
      [
        updated.title,
        updated.missionType,
        updated.status,
        updated.priority || 'medium',
        updated.teamId || null,
        updated.teamName || null,
        updated.leadUserId || null,
        updated.description || null,
        updated.targetStalls || 100,
        updated.estimatedHours || 8,
        updated.dueDate || null,
        now,
        id,
      ]
    );

    await OutboxRepository.enqueue('local_missions', id, 'UPDATE', updated as unknown as Record<string, unknown>);

    return updated;
  }

  // --- Members & Team Assignment ---
  static async addMember(
    missionId: string,
    userId: string,
    userName: string,
    role: 'lead' | 'mapper' = 'mapper',
    userAvatar?: string
  ): Promise<MissionMember> {
    const id = `mm_${missionId}_${userId}`;
    const now = new Date().toISOString();

    const member: MissionMember = {
      id,
      missionId,
      userId,
      userName,
      userAvatar,
      roleInMission: role,
      assignedAt: now,
      syncStatus: 'local_only',
    };

    await this.db.runAsync(
      `INSERT OR REPLACE INTO local_mission_members (
        id, mission_id, user_id, user_name, user_avatar, role_in_mission, assigned_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local_only');`,
      [id, missionId, userId, userName, userAvatar || null, role, now]
    );

    return member;
  }

  static async getMembers(missionId: string): Promise<MissionMember[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_mission_members WHERE mission_id = ? ORDER BY assigned_at ASC;`,
      [missionId]
    );
    return rows.map((r) => ({
      id: r.id,
      missionId: r.mission_id,
      userId: r.user_id,
      userName: r.user_name || r.userName || 'Team Member',
      userAvatar: r.user_avatar || r.userAvatar,
      roleInMission: r.role_in_mission || r.roleInMission || 'mapper',
      assignedAt: r.assigned_at || r.assignedAt,
      syncStatus: r.sync_status || 'local_only',
    }));
  }

  // --- Area Assignments ---
  static async assignArea(
    missionId: string,
    areaId: string,
    areaName: string,
    assignedToUserId?: string,
    assignedToUserName?: string,
    notes?: string
  ): Promise<MissionAreaAssignment> {
    const id = `maa_${missionId}_${areaId}`;
    const now = new Date().toISOString();

    const assignment: MissionAreaAssignment = {
      id,
      missionId,
      areaId,
      areaName,
      assignedToUserId,
      assignedToUserName,
      status: assignedToUserId ? 'in_progress' : 'assigned',
      assignedAt: now,
      notes,
      syncStatus: 'local_only',
    };

    await this.db.runAsync(
      `INSERT OR REPLACE INTO local_mission_area_assignments (
        id, mission_id, area_id, area_name, assigned_to_user_id, assigned_to_user_name,
        status, assigned_at, notes, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only');`,
      [
        id,
        missionId,
        areaId,
        areaName,
        assignedToUserId || null,
        assignedToUserName || null,
        assignment.status,
        now,
        notes || null,
      ]
    );

    return assignment;
  }

  static async getAreaAssignments(missionId: string): Promise<MissionAreaAssignment[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_mission_area_assignments WHERE mission_id = ? ORDER BY assigned_at ASC;`,
      [missionId]
    );
    return rows.map((r) => ({
      id: r.id,
      missionId: r.mission_id,
      areaId: r.area_id,
      areaName: r.area_name || r.areaName || 'Market Sector',
      assignedToUserId: r.assigned_to_user_id || r.assignedToUserId,
      assignedToUserName: r.assigned_to_user_name || r.assignedToUserName,
      status: r.status || 'assigned',
      assignedAt: r.assigned_at || r.assignedAt,
      completedAt: r.completed_at || r.completedAt,
      notes: r.notes,
      syncStatus: r.sync_status || 'local_only',
    }));
  }

  static async updateAreaAssignmentStatus(
    missionId: string,
    areaId: string,
    status: 'assigned' | 'in_progress' | 'completed'
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const completedAt = status === 'completed' ? now : null;

    await this.db.runAsync(
      `UPDATE local_mission_area_assignments
       SET status = ?, completed_at = ?
       WHERE mission_id = ? AND area_id = ?;`,
      [status, completedAt, missionId, areaId]
    );

    return true;
  }

  // --- Real-time Progress Calculation ---
  static async calculateMissionProgress(missionId: string): Promise<MissionProgress> {
    const mission = await this.getMissionById(missionId);
    const targetStalls = mission?.targetStalls || 100;

    // Count businesses in this mission (excluding deleted)
    const bizRows = await this.db.getAllAsync<any>(
      `SELECT id FROM local_businesses WHERE mission_id = ? AND (is_deleted = 0 OR is_deleted IS NULL);`,
      [missionId]
    );
    const stallsMapped = bizRows.length;

    // Count recorded paths
    const pathRows = await this.db.getAllAsync<any>(
      `SELECT id FROM local_paths WHERE mission_id = ? AND (is_deleted = 0 OR is_deleted IS NULL);`,
      [missionId]
    );
    const pathsRecorded = pathRows.length;

    // Count assigned vs completed areas
    const areas = await this.getAreaAssignments(missionId);
    const totalAreas = areas.length;
    const areasCompleted = areas.filter((a) => a.status === 'completed').length;

    // Count open field issues
    const issueRows = await this.db.getAllAsync<any>(
      `SELECT id FROM local_field_issues WHERE mission_id = ? AND status = 'open';`,
      [missionId]
    );
    const openIssuesCount = issueRows.length;

    const percentage = Math.min(
      100,
      Math.round(totalAreas > 0 ? (areasCompleted / totalAreas) * 100 : (stallsMapped / targetStalls) * 100)
    );

    return {
      missionId,
      stallsMapped,
      targetStalls,
      pathsRecorded,
      areasCompleted,
      totalAreas,
      percentage,
      openIssuesCount,
    };
  }

  private static mapMissionRow(r: any): Mission {
    return {
      id: r.id,
      marketId: r.market_id || r.marketId,
      marketName: r.market_name || r.marketName || 'Market Location',
      title: r.title,
      missionType: r.mission_type || r.missionType || 'initial_mapping',
      status: r.status || 'draft',
      priority: r.priority || 'medium',
      teamId: r.team_id || r.teamId,
      teamName: r.team_name || r.teamName,
      leadUserId: r.lead_user_id || r.leadUserId,
      description: r.description,
      targetStalls: Number(r.target_stalls || r.targetStalls || 100),
      estimatedHours: Number(r.estimated_hours || r.estimatedHours || 8),
      dueDate: r.due_date || r.dueDate,
      createdBy: r.created_by || r.createdBy,
      createdAt: r.created_at || r.createdAt,
      updatedAt: r.updated_at || r.updatedAt,
      syncStatus: r.sync_status || r.syncStatus || 'local_only',
    };
  }
}
