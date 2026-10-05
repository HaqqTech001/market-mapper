/**
 * Path Repository (Local SQLite) — Phase 3 Production Engine
 * 
 * Supports:
 * - Incremental active point streaming to local_path_points_raw with UUIDs and quality metadata
 * - Multi-segment recording for pause/resume without artificial corridor lines
 * - Session state & checkpoint tracking for crash recovery
 * - Real undo/correction operations (by distance, by time, select point, restart from junction)
 * - Start/End trimming with durable audit logs
 * - Finalized path persistence with outbox queue
 */

import { getDatabase } from '../sqlite';
import { OutboxRepository } from './OutboxRepository';
import {
  MarketPath,
  PathPointRaw,
  ActivePathSession,
  RawGpsSample,
  PathSegment,
  LocalPathJunction,
  PathCorrectionLog,
  JunctionBranch,
} from '../../types';
import { calculatePolylineDistanceMeters } from '../../lib/location/gpsQuality';
import { generateDefaultBranchesForType } from '../../lib/junctions/branchManager';

export class PathRepository {
  private static get db() { return getDatabase(); }

  /**
   * Starts a new active path recording session in SQLite
   */
  static async startSession(sessionId: string, missionId: string): Promise<ActivePathSession> {
    const now = new Date().toISOString();
    const session: ActivePathSession = {
      sessionId,
      missionId,
      startedAt: now,
      lastSavedAt: now,
      distanceMeters: 0,
      durationSeconds: 0,
      activeDurationSeconds: 0,
      junctionsCount: 0,
      isPaused: false,
      status: 'recording',
    };

    await this.db.runAsync(
      `INSERT OR REPLACE INTO local_path_sessions (
        session_id, mission_id, started_at, last_saved_at, distance_meters,
        duration_seconds, active_duration_seconds, junctions_count, is_paused, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [sessionId, missionId, now, now, 0, 0, 0, 0, 0, 'recording']
    );

    return session;
  }

  /**
   * Starts a new recording segment within an active session
   */
  static async createSegment(sessionId: string, segmentIndex: number): Promise<PathSegment> {
    const id = `seg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const segment: PathSegment = {
      id,
      sessionId,
      segmentIndex,
      startedAt: now,
      endedAt: null,
      isClosed: false,
    };

    await this.db.runAsync(
      `INSERT INTO local_path_segments (
        id, session_id, segment_index, started_at, ended_at, is_closed
      ) VALUES (?, ?, ?, ?, NULL, 0);`,
      [id, sessionId, segmentIndex, now]
    );

    return segment;
  }

  /**
   * Closes an active segment (e.g. upon pause or session finish)
   */
  static async closeSegment(segmentId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_path_segments SET ended_at = ?, is_closed = 1 WHERE id = ?;`,
      [now, segmentId]
    );
  }

  /**
   * Appends an incoming raw GPS sample incrementally
   */
  static async appendRawPoint(sample: RawGpsSample): Promise<void> {
    const now = sample.createdAt || new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO local_path_points_raw (
        id, session_id, segment_id, sequence_number, latitude, longitude,
        timestamp, accuracy, altitude, altitude_accuracy, heading, speed,
        accepted, rejection_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        // V1 shipped this table with INTEGER PRIMARY KEY AUTOINCREMENT. Existing
        // field databases therefore cannot store our string gps_* id in that column.
        // Let SQLite allocate the numeric PK; session/segment/sequence are the durable
        // identity/order for raw samples.
        null,
        sample.sessionId,
        sample.segmentId,
        sample.sequenceNumber,
        sample.latitude,
        sample.longitude,
        sample.timestamp,
        sample.accuracy,
        sample.altitude ?? null,
        sample.altitudeAccuracy ?? null,
        sample.heading ?? null,
        sample.speed ?? null,
        sample.accepted ? 1 : 0,
        sample.rejectionReason ?? null,
        now,
      ]
    );
  }

  /**
   * Updates session telemetry (distance, duration, active duration, status)
   */
  static async updateSessionTelemetry(
    sessionId: string,
    distanceMeters: number,
    durationSeconds: number,
    activeDurationSeconds: number,
    junctionsCount: number,
    isPaused: boolean,
    status: 'recording' | 'paused' | 'reviewing' | 'completed' | 'discarded' = isPaused ? 'paused' : 'recording'
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_path_sessions SET
        distance_meters = ?, duration_seconds = ?, active_duration_seconds = ?,
        junctions_count = ?, is_paused = ?, status = ?, last_saved_at = ?
       WHERE session_id = ?;`,
      [
        distanceMeters,
        durationSeconds,
        activeDurationSeconds,
        junctionsCount,
        isPaused ? 1 : 0,
        status,
        now,
        sessionId,
      ]
    );
  }

  /**
   * Adds an operational junction during an active session
   */
  static async addJunction(junction: LocalPathJunction): Promise<void> {
    const now = junction.createdAt || new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO local_path_junctions (
        id, session_id, path_id, operational_label, display_name,
        junction_type, market_id, mission_id, created_by, verification_state, location_source,
        latitude, longitude, sequence_number, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        junction.id,
        junction.sessionId || null,
        junction.pathId || null,
        junction.operationalLabel,
        junction.displayName || null,
        junction.junctionType || 'unknown',
        junction.marketId || null,
        junction.missionId || null,
        junction.createdBy || null,
        junction.verificationState || 'unverified',
        junction.locationSource || 'current_gps',
        junction.latitude,
        junction.longitude,
        junction.sequenceNumber,
        junction.timestamp,
        now,
      ]
    );
    await OutboxRepository.enqueue('path_junctions', junction.id, 'INSERT', junction as unknown as Record<string, unknown>);
  }

  /**
   * Recovers an unfinished active session after application cold start or crash
   */
  static async getActiveSession(): Promise<{
    session: ActivePathSession | null;
    segments: PathSegment[];
    points: RawGpsSample[];
    junctions: LocalPathJunction[];
  }> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM local_path_sessions WHERE status IN ('recording', 'paused', 'reviewing') ORDER BY last_saved_at DESC LIMIT 1;`
    );
    if (!row) {
      return { session: null, segments: [], points: [], junctions: [] };
    }

    const sessionId = row.session_id;

    // Load segments
    const segmentRows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_path_segments WHERE session_id = ? ORDER BY segment_index ASC;`,
      [sessionId]
    );
    const segments: PathSegment[] = segmentRows.map((s) => ({
      id: s.id,
      sessionId: s.session_id,
      segmentIndex: Number(s.segment_index),
      startedAt: s.started_at,
      endedAt: s.ended_at || null,
      isClosed: Boolean(s.is_closed),
    }));

    // Load raw points in sequence
    const pointRows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_path_points_raw WHERE session_id = ? ORDER BY sequence_number ASC, timestamp ASC;`,
      [sessionId]
    );
    const points: RawGpsSample[] = pointRows.map((p) => ({
      id: `gps_${p.timestamp}_${Number(p.sequence_number || 0)}`,
      sessionId: p.session_id,
      segmentId: p.segment_id || '',
      sequenceNumber: Number(p.sequence_number || 0),
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      timestamp: Number(p.timestamp),
      accuracy: Number(p.accuracy || 10),
      altitude: p.altitude ? Number(p.altitude) : null,
      altitudeAccuracy: p.altitude_accuracy ? Number(p.altitude_accuracy) : null,
      heading: p.heading ? Number(p.heading) : null,
      speed: p.speed ? Number(p.speed) : null,
      accepted: p.accepted === undefined ? true : Boolean(p.accepted),
      rejectionReason: p.rejection_reason || null,
      createdAt: p.created_at || new Date(Number(p.timestamp)).toISOString(),
    }));

    // Load junctions
    const junctionRows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_path_junctions WHERE session_id = ? ORDER BY sequence_number ASC;`,
      [sessionId]
    );
    const junctions: LocalPathJunction[] = junctionRows.map((j) => ({
      id: j.id,
      sessionId: j.session_id,
      pathId: j.path_id || undefined,
      operationalLabel: j.operational_label,
      displayName: j.display_name || undefined,
      junctionType: j.junction_type || 'unknown',
      marketId: j.market_id || undefined,
      missionId: j.mission_id || undefined,
      createdBy: j.created_by || undefined,
      verificationState: j.verification_state || 'unverified',
      locationSource: j.location_source || 'current_gps',
      latitude: Number(j.latitude),
      longitude: Number(j.longitude),
      sequenceNumber: Number(j.sequence_number || 0),
      timestamp: Number(j.timestamp || Date.now()),
      createdAt: j.created_at,
      isExcluded: Boolean(j.is_excluded),
      exclusionReason: j.exclusion_reason || undefined,
    }));

    const session: ActivePathSession = {
      sessionId: row.session_id,
      missionId: row.mission_id,
      startedAt: row.started_at,
      lastSavedAt: row.last_saved_at,
      distanceMeters: Number(row.distance_meters || 0),
      durationSeconds: Number(row.duration_seconds || 0),
      activeDurationSeconds: Number(row.active_duration_seconds || row.duration_seconds || 0),
      junctionsCount: Number(row.junctions_count || junctions.length),
      isPaused: Boolean(row.is_paused),
      status: row.status || (row.is_paused ? 'paused' : 'recording'),
    };

    return { session, segments, points, junctions };
  }

  /**
   * Retrieves all raw GPS points recorded for a given session (including rejected samples)
   */
  static async getRawPointsForSession(sessionId: string): Promise<RawGpsSample[]> {
    const pointRows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_path_points_raw WHERE session_id = ? ORDER BY sequence_number ASC, timestamp ASC;`,
      [sessionId]
    );
    return pointRows.map((p) => ({
      id: `gps_${p.timestamp}_${Number(p.sequence_number || 0)}`,
      sessionId: p.session_id,
      segmentId: p.segment_id || '',
      sequenceNumber: Number(p.sequence_number || 0),
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      timestamp: Number(p.timestamp),
      accuracy: Number(p.accuracy || 10),
      altitude: p.altitude ? Number(p.altitude) : null,
      altitudeAccuracy: p.altitude_accuracy ? Number(p.altitude_accuracy) : null,
      heading: p.heading ? Number(p.heading) : null,
      speed: p.speed ? Number(p.speed) : null,
      accepted: p.accepted === undefined ? true : Boolean(p.accepted),
      rejectionReason: p.rejection_reason || null,
      createdAt: p.created_at || new Date(Number(p.timestamp)).toISOString(),
    }));
  }

  /**
   * Field Correction: Undo by Distance (removes recent accepted path until N meters undone)
   * Also excludes any junctions located in the undone section.
   */
  static async applyUndoDistance(
    sessionId: string,
    metersToUndo: number
  ): Promise<{ pointsRemoved: number; newDistance: number; junctionsExcluded: number }> {
    const points = await this.db.getAllAsync<any>(
      `SELECT * FROM local_path_points_raw WHERE session_id = ? AND accepted = 1 ORDER BY sequence_number DESC, timestamp DESC;`,
      [sessionId]
    );

    let accumulatedDistance = 0;
    const pointsToRevoke: any[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = calculatePolylineDistanceMeters([
        { latitude: Number(p1.latitude), longitude: Number(p1.longitude) },
        { latitude: Number(p2.latitude), longitude: Number(p2.longitude) },
      ]);
      accumulatedDistance += dist;
      if (!pointsToRevoke.some((p) => p.id === p1.id)) {
        pointsToRevoke.push(p1);
      }
      if (accumulatedDistance >= metersToUndo) {
        if (!pointsToRevoke.some((p) => p.id === p2.id)) {
          pointsToRevoke.push(p2);
        }
        break;
      }
    }

    if (pointsToRevoke.length === 0 && points.length > 0) {
      pointsToRevoke.push(points[0]);
    }

    for (const pt of pointsToRevoke) {
      await this.db.runAsync(
        `UPDATE local_path_points_raw SET accepted = 0, rejection_reason = 'undo_distance' WHERE id = ?;`,
        [pt.id]
      );
    }

    // Exclude junctions that occurred on or after the earliest revoked point
    let junctionsExcluded = 0;
    if (pointsToRevoke.length > 0) {
      const minSeq = Math.min(...pointsToRevoke.map((p) => Number(p.sequence_number || 0)));
      const juncResult = await this.db.runAsync(
        `UPDATE local_path_junctions SET is_excluded = 1, exclusion_reason = 'undo_distance' WHERE session_id = ? AND sequence_number >= ? AND (is_excluded = 0 OR is_excluded IS NULL);`,
        [sessionId, minSeq]
      );
      junctionsExcluded = juncResult.changes;
    }

    // Log correction
    await this.logCorrection(
      sessionId,
      'undo_distance',
      `Undid ${metersToUndo}m (${pointsToRevoke.length} points, ${junctionsExcluded} junctions excluded)`,
      pointsToRevoke.length
    );

    // Recalculate remaining distance
    const remainingAccepted = await this.db.getAllAsync<any>(
      `SELECT latitude, longitude FROM local_path_points_raw WHERE session_id = ? AND accepted = 1 ORDER BY sequence_number ASC, timestamp ASC;`,
      [sessionId]
    );
    const newDistance = calculatePolylineDistanceMeters(
      remainingAccepted.map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }))
    );

    return { pointsRemoved: pointsToRevoke.length, newDistance, junctionsExcluded };
  }

  /**
   * Field Correction: Undo by Time (removes points recorded within the last N seconds)
   * Also excludes any junctions located in the undone time window.
   */
  static async applyUndoTime(
    sessionId: string,
    secondsToUndo: number
  ): Promise<{ pointsRemoved: number; newDistance: number; junctionsExcluded: number }> {
    const points = await this.db.getAllAsync<any>(
      `SELECT * FROM local_path_points_raw WHERE session_id = ? AND accepted = 1 ORDER BY timestamp DESC;`,
      [sessionId]
    );

    if (points.length === 0) {
      return { pointsRemoved: 0, newDistance: 0, junctionsExcluded: 0 };
    }

    const newestTimestamp = Number(points[0].timestamp);
    const cutoffTimestamp = newestTimestamp - secondsToUndo * 1000;

    const pointsToRevoke = points.filter((p) => Number(p.timestamp) >= cutoffTimestamp);

    for (const pt of pointsToRevoke) {
      await this.db.runAsync(
        `UPDATE local_path_points_raw SET accepted = 0, rejection_reason = 'undo_time' WHERE id = ?;`,
        [pt.id]
      );
    }

    let junctionsExcluded = 0;
    if (pointsToRevoke.length > 0) {
      const minSeq = Math.min(...pointsToRevoke.map((p) => Number(p.sequence_number || 0)));
      const juncResult = await this.db.runAsync(
        `UPDATE local_path_junctions SET is_excluded = 1, exclusion_reason = 'undo_time' WHERE session_id = ? AND (sequence_number >= ? OR timestamp >= ?) AND (is_excluded = 0 OR is_excluded IS NULL);`,
        [sessionId, minSeq, cutoffTimestamp]
      );
      junctionsExcluded = juncResult.changes;
    }

    await this.logCorrection(
      sessionId,
      'undo_time',
      `Undid ${secondsToUndo}s (${pointsToRevoke.length} points, ${junctionsExcluded} junctions excluded)`,
      pointsToRevoke.length
    );

    const remainingAccepted = await this.db.getAllAsync<any>(
      `SELECT latitude, longitude FROM local_path_points_raw WHERE session_id = ? AND accepted = 1 ORDER BY sequence_number ASC, timestamp ASC;`,
      [sessionId]
    );
    const newDistance = calculatePolylineDistanceMeters(
      remainingAccepted.map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }))
    );

    return { pointsRemoved: pointsToRevoke.length, newDistance, junctionsExcluded };
  }

  /**
   * Field Correction: Select Prior Point (truncates subsequent points after selected point)
   */
  static async applySelectPreviousPoint(
    sessionId: string,
    selectedPointId: string
  ): Promise<{ pointsRemoved: number; junctionsExcluded: number }> {
    const selectedPt = await this.db.getFirstAsync<any>(
      `SELECT sequence_number FROM local_path_points_raw WHERE id = ?;`,
      [selectedPointId]
    );
    if (!selectedPt) return { pointsRemoved: 0, junctionsExcluded: 0 };

    const targetSeq = Number(selectedPt.sequence_number);
    const subsequent = await this.db.getAllAsync<any>(
      `SELECT id FROM local_path_points_raw WHERE session_id = ? AND sequence_number > ? AND accepted = 1;`,
      [sessionId, targetSeq]
    );

    for (const p of subsequent) {
      await this.db.runAsync(
        `UPDATE local_path_points_raw SET accepted = 0, rejection_reason = 'restart_from_point' WHERE id = ?;`,
        [p.id]
      );
    }

    const juncResult = await this.db.runAsync(
      `UPDATE local_path_junctions SET is_excluded = 1, exclusion_reason = 'restart_from_point' WHERE session_id = ? AND sequence_number > ? AND (is_excluded = 0 OR is_excluded IS NULL);`,
      [sessionId, targetSeq]
    );

    await this.logCorrection(
      sessionId,
      'select_point',
      `Rolled back to point #${targetSeq} (${subsequent.length} points, ${juncResult.changes} junctions excluded)`,
      subsequent.length
    );

    return { pointsRemoved: subsequent.length, junctionsExcluded: juncResult.changes };
  }

  /**
   * Field Correction: Restart from Junction (truncates subsequent points after the junction)
   * The junction itself remains active; only points and junctions strictly AFTER it are rolled back.
   */
  static async applyRestartFromJunction(
    sessionId: string,
    junctionId: string
  ): Promise<{ pointsRemoved: number; junctionsExcluded: number }> {
    const junc = await this.db.getFirstAsync<any>(
      `SELECT sequence_number, operational_label FROM local_path_junctions WHERE id = ?;`,
      [junctionId]
    );
    if (!junc) return { pointsRemoved: 0, junctionsExcluded: 0 };

    const targetSeq = Number(junc.sequence_number);
    const subsequent = await this.db.getAllAsync<any>(
      `SELECT id FROM local_path_points_raw WHERE session_id = ? AND sequence_number > ? AND accepted = 1;`,
      [sessionId, targetSeq]
    );

    for (const p of subsequent) {
      await this.db.runAsync(
        `UPDATE local_path_points_raw SET accepted = 0, rejection_reason = 'restart_from_junction' WHERE id = ?;`,
        [p.id]
      );
    }

    // Exclude any junctions created AFTER this junction
    const juncResult = await this.db.runAsync(
      `UPDATE local_path_junctions SET is_excluded = 1, exclusion_reason = 'restart_from_junction' WHERE session_id = ? AND sequence_number > ? AND (is_excluded = 0 OR is_excluded IS NULL);`,
      [sessionId, targetSeq]
    );

    await this.logCorrection(
      sessionId,
      'restart_junction',
      `Restarted from ${junc.operational_label} at seq #${targetSeq} (${subsequent.length} points, ${juncResult.changes} junctions excluded)`,
      subsequent.length
    );

    return { pointsRemoved: subsequent.length, junctionsExcluded: juncResult.changes };
  }

  /**
   * Trim Start (Review screen): Truncates N points from beginning of path
   */
  static async trimStartPoints(sessionId: string, count: number): Promise<{ pointsRemoved: number; junctionsExcluded: number }> {
    const points = await this.db.getAllAsync<any>(
      `SELECT id, sequence_number FROM local_path_points_raw WHERE session_id = ? AND accepted = 1 ORDER BY sequence_number ASC, timestamp ASC LIMIT ?;`,
      [sessionId, count]
    );

    for (const p of points) {
      await this.db.runAsync(
        `UPDATE local_path_points_raw SET accepted = 0, rejection_reason = 'trim_start' WHERE id = ?;`,
        [p.id]
      );
    }

    let junctionsExcluded = 0;
    if (points.length > 0) {
      const maxSeq = Math.max(...points.map((p) => Number(p.sequence_number || 0)));
      const juncResult = await this.db.runAsync(
        `UPDATE local_path_junctions SET is_excluded = 1, exclusion_reason = 'trim_start' WHERE session_id = ? AND sequence_number <= ? AND (is_excluded = 0 OR is_excluded IS NULL);`,
        [sessionId, maxSeq]
      );
      junctionsExcluded = juncResult.changes;
    }

    await this.logCorrection(sessionId, 'trim_start', `Trimmed start ${points.length} points (${junctionsExcluded} junctions excluded)`, points.length);
    return { pointsRemoved: points.length, junctionsExcluded };
  }

  /**
   * Trim Start by Distance in Meters
   */
  static async trimStartMeters(sessionId: string, metersToTrim: number): Promise<{ pointsRemoved: number; newDistance: number; junctionsExcluded: number }> {
    const points = await this.db.getAllAsync<any>(
      `SELECT * FROM local_path_points_raw WHERE session_id = ? AND accepted = 1 ORDER BY sequence_number ASC, timestamp ASC;`,
      [sessionId]
    );

    let accumulatedDistance = 0;
    const pointsToTrim: any[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = calculatePolylineDistanceMeters([
        { latitude: Number(p1.latitude), longitude: Number(p1.longitude) },
        { latitude: Number(p2.latitude), longitude: Number(p2.longitude) },
      ]);
      accumulatedDistance += dist;
      if (!pointsToTrim.some((p) => p.id === p1.id)) {
        pointsToTrim.push(p1);
      }
      if (accumulatedDistance >= metersToTrim) {
        if (!pointsToTrim.some((p) => p.id === p2.id)) {
          pointsToTrim.push(p2);
        }
        break;
      }
    }

    for (const pt of pointsToTrim) {
      await this.db.runAsync(
        `UPDATE local_path_points_raw SET accepted = 0, rejection_reason = 'trim_start' WHERE id = ?;`,
        [pt.id]
      );
    }

    let junctionsExcluded = 0;
    if (pointsToTrim.length > 0) {
      const maxSeq = Math.max(...pointsToTrim.map((p) => Number(p.sequence_number || 0)));
      const juncResult = await this.db.runAsync(
        `UPDATE local_path_junctions SET is_excluded = 1, exclusion_reason = 'trim_start' WHERE session_id = ? AND sequence_number <= ? AND (is_excluded = 0 OR is_excluded IS NULL);`,
        [sessionId, maxSeq]
      );
      junctionsExcluded = juncResult.changes;
    }

    await this.logCorrection(
      sessionId,
      'trim_start',
      `Trimmed start ${metersToTrim}m (${pointsToTrim.length} points, ${junctionsExcluded} junctions excluded)`,
      pointsToTrim.length
    );

    const remainingAccepted = await this.db.getAllAsync<any>(
      `SELECT latitude, longitude FROM local_path_points_raw WHERE session_id = ? AND accepted = 1 ORDER BY sequence_number ASC, timestamp ASC;`,
      [sessionId]
    );
    const newDistance = calculatePolylineDistanceMeters(
      remainingAccepted.map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }))
    );

    return { pointsRemoved: pointsToTrim.length, newDistance, junctionsExcluded };
  }

  /**
   * Trim End (Review screen): Truncates N points from end of path
   */
  static async trimEndPoints(sessionId: string, count: number): Promise<{ pointsRemoved: number; junctionsExcluded: number }> {
    const points = await this.db.getAllAsync<any>(
      `SELECT id, sequence_number FROM local_path_points_raw WHERE session_id = ? AND accepted = 1 ORDER BY sequence_number DESC, timestamp DESC LIMIT ?;`,
      [sessionId, count]
    );

    for (const p of points) {
      await this.db.runAsync(
        `UPDATE local_path_points_raw SET accepted = 0, rejection_reason = 'trim_end' WHERE id = ?;`,
        [p.id]
      );
    }

    let junctionsExcluded = 0;
    if (points.length > 0) {
      const minSeq = Math.min(...points.map((p) => Number(p.sequence_number || 0)));
      const juncResult = await this.db.runAsync(
        `UPDATE local_path_junctions SET is_excluded = 1, exclusion_reason = 'trim_end' WHERE session_id = ? AND sequence_number >= ? AND (is_excluded = 0 OR is_excluded IS NULL);`,
        [sessionId, minSeq]
      );
      junctionsExcluded = juncResult.changes;
    }

    await this.logCorrection(sessionId, 'trim_end', `Trimmed end ${points.length} points (${junctionsExcluded} junctions excluded)`, points.length);
    return { pointsRemoved: points.length, junctionsExcluded };
  }

  /**
   * Trim End by Distance in Meters
   */
  static async trimEndMeters(sessionId: string, metersToTrim: number): Promise<{ pointsRemoved: number; newDistance: number; junctionsExcluded: number }> {
    const points = await this.db.getAllAsync<any>(
      `SELECT * FROM local_path_points_raw WHERE session_id = ? AND accepted = 1 ORDER BY sequence_number DESC, timestamp DESC;`,
      [sessionId]
    );

    let accumulatedDistance = 0;
    const pointsToTrim: any[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = calculatePolylineDistanceMeters([
        { latitude: Number(p1.latitude), longitude: Number(p1.longitude) },
        { latitude: Number(p2.latitude), longitude: Number(p2.longitude) },
      ]);
      accumulatedDistance += dist;
      if (!pointsToTrim.some((p) => p.id === p1.id)) {
        pointsToTrim.push(p1);
      }
      if (accumulatedDistance >= metersToTrim) {
        if (!pointsToTrim.some((p) => p.id === p2.id)) {
          pointsToTrim.push(p2);
        }
        break;
      }
    }

    for (const pt of pointsToTrim) {
      await this.db.runAsync(
        `UPDATE local_path_points_raw SET accepted = 0, rejection_reason = 'trim_end' WHERE id = ?;`,
        [pt.id]
      );
    }

    let junctionsExcluded = 0;
    if (pointsToTrim.length > 0) {
      const minSeq = Math.min(...pointsToTrim.map((p) => Number(p.sequence_number || 0)));
      const juncResult = await this.db.runAsync(
        `UPDATE local_path_junctions SET is_excluded = 1, exclusion_reason = 'trim_end' WHERE session_id = ? AND sequence_number >= ? AND (is_excluded = 0 OR is_excluded IS NULL);`,
        [sessionId, minSeq]
      );
      junctionsExcluded = juncResult.changes;
    }

    await this.logCorrection(
      sessionId,
      'trim_end',
      `Trimmed end ${metersToTrim}m (${pointsToTrim.length} points, ${junctionsExcluded} junctions excluded)`,
      pointsToTrim.length
    );

    const remainingAccepted = await this.db.getAllAsync<any>(
      `SELECT latitude, longitude FROM local_path_points_raw WHERE session_id = ? AND accepted = 1 ORDER BY sequence_number ASC, timestamp ASC;`,
      [sessionId]
    );
    const newDistance = calculatePolylineDistanceMeters(
      remainingAccepted.map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }))
    );

    return { pointsRemoved: pointsToTrim.length, newDistance, junctionsExcluded };
  }

  private static async logCorrection(
    sessionId: string,
    type: 'undo_distance' | 'undo_time' | 'select_point' | 'restart_junction' | 'trim_start' | 'trim_end',
    details: string,
    pointsAffected: number
  ): Promise<void> {
    const id = `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await this.db.runAsync(
      `INSERT INTO local_path_corrections_log (
        id, session_id, correction_type, details, points_affected, created_at
      ) VALUES (?, ?, ?, ?, ?, ?);`,
      [id, sessionId, type, details, pointsAffected, new Date().toISOString()]
    );
  }

  /**
   * Finalizes and saves a completed path to local_paths and queues sync.
   * 
   * CRITICAL GUARANTEE:
   * Finalizing does NOT delete local_path_points_raw or local_path_segments!
   * The source session transitions: active -> reviewing -> completed.
   * All raw GPS measurements, timestamps, and segment boundaries survive in SQLite.
   */
  static async finalizePath(path: MarketPath, sessionId?: string): Promise<MarketPath> {
    const now = new Date().toISOString();
    const isMultiSegment = Boolean(path.segments && path.segments.length > 1);

    const geojsonGeometry = {
      type: isMultiSegment ? 'MultiLineString' : 'LineString',
      coordinates: path.segments && path.segments.length > 0
        ? (isMultiSegment ? path.segments : path.segments[0])
        : [path.rawPoints.map((p) => [p.longitude, p.latitude])],
    };

    await this.db.runAsync(
      `INSERT INTO local_paths (
        id, session_id, mission_id, name, distance_meters, duration_seconds, junctions_count,
        geojson_geometry, raw_points_json, is_multi_segment, is_verified, version, created_by,
        updated_by, created_at, updated_at, client_created_at, is_deleted, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        path.id,
        sessionId || path.sessionId || null,
        path.missionId,
        path.name,
        path.distanceMeters,
        path.durationSeconds,
        path.junctionsCount,
        JSON.stringify(geojsonGeometry),
        JSON.stringify(path.rawPoints),
        isMultiSegment ? 1 : 0,
        path.isVerified ? 1 : 0,
        path.version,
        path.createdBy,
        path.updatedBy,
        path.createdAt || now,
        path.updatedAt || now,
        path.clientCreatedAt || now,
        0,
        'local_only',
      ]
    );

    // Update associated non-excluded junctions with finalized pathId
    if (sessionId) {
      await this.db.runAsync(
        `UPDATE local_path_junctions SET path_id = ? WHERE session_id = ? AND (is_excluded = 0 OR is_excluded IS NULL);`,
        [path.id, sessionId]
      );

      // Transition session state to 'completed' without destroying raw GPS points or segments!
      await this.db.runAsync(
        `UPDATE local_path_sessions SET status = 'completed', last_saved_at = ? WHERE session_id = ?;`,
        [now, sessionId]
      );
    }

    // Enqueue Outbox event
    const outboxId = `out_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await this.db.runAsync(
      `INSERT INTO local_outbox_queue (
        id, table_name, record_id, action, payload, client_timestamp, status, retry_count
      ) VALUES (?, 'market_paths', ?, 'INSERT', ?, ?, 'pending', 0);`,
      [outboxId, path.id, JSON.stringify(path), Date.now()]
    );

    return { ...path, sessionId, isMultiSegment };
  }

  /**
   * Explicitly discards an active recording session (ONLY when user taps "Discard Path")
   */
  static async discardActiveSession(sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.db.runAsync(
        `UPDATE local_path_sessions SET status = 'discarded' WHERE session_id = ?;`,
        [sessionId]
      );
      await this.db.runAsync(`DELETE FROM local_path_sessions WHERE session_id = ?;`, [sessionId]);
      await this.db.runAsync(`DELETE FROM local_path_segments WHERE session_id = ?;`, [sessionId]);
      await this.db.runAsync(`DELETE FROM local_path_points_raw WHERE session_id = ?;`, [sessionId]);
      await this.db.runAsync(`DELETE FROM local_path_junctions WHERE session_id = ? AND path_id IS NULL;`, [sessionId]);
    } else {
      await this.db.runAsync(`DELETE FROM local_path_sessions WHERE status IN ('recording', 'paused');`);
    }
  }

  /**
   * Deprecated backward compatibility alias
   */
  static async clearActiveSession(): Promise<void> {
    await this.discardActiveSession();
  }

  static async count(): Promise<number> {
    const rows = await this.db.getAllAsync<any>(`SELECT id FROM local_paths WHERE is_deleted = 0;`);
    return rows.length;
  }

  /**
   * Reopens a saved path by ID with all its segments, raw points, and junctions
   */
  static async getPathById(pathId: string): Promise<{
    path: MarketPath;
    junctions: LocalPathJunction[];
    rawPoints: PathPointRaw[];
  } | null> {
    const r = await this.db.getFirstAsync<any>(
      `SELECT * FROM local_paths WHERE id = ? AND is_deleted = 0;`,
      [pathId]
    );
    if (!r) return null;

    let geojson: any = null;
    try {
      geojson = JSON.parse(r.geojson_geometry);
    } catch {
      geojson = { coordinates: [] };
    }

    let rawPoints: PathPointRaw[] = [];
    try {
      rawPoints = JSON.parse(r.raw_points_json);
    } catch {
      rawPoints = [];
    }

    // Load junctions associated with this path
    const juncRows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_path_junctions WHERE path_id = ? AND (is_excluded = 0 OR is_excluded IS NULL) ORDER BY sequence_number ASC;`,
      [pathId]
    );

    const junctions: LocalPathJunction[] = juncRows.map((j) => ({
      id: j.id,
      sessionId: j.session_id,
      pathId: j.path_id,
      operationalLabel: j.operational_label,
      displayName: j.display_name || undefined,
      junctionType: j.junction_type || 'unknown',
      marketId: j.market_id || undefined,
      missionId: j.mission_id || undefined,
      createdBy: j.created_by || undefined,
      verificationState: j.verification_state || 'unverified',
      locationSource: j.location_source || 'current_gps',
      latitude: Number(j.latitude),
      longitude: Number(j.longitude),
      sequenceNumber: Number(j.sequence_number || 0),
      timestamp: Number(j.timestamp || 0),
      createdAt: j.created_at,
      isExcluded: Boolean(j.is_excluded),
      exclusionReason: j.exclusion_reason || undefined,
    }));

    // If segments are stored in geojson
    const segments: Array<Array<[number, number]>> =
      geojson?.type === 'MultiLineString'
        ? geojson.coordinates
        : geojson?.type === 'LineString'
        ? [geojson.coordinates]
        : [];

    const path: MarketPath = {
      id: r.id,
      sessionId: r.session_id || undefined,
      missionId: r.mission_id,
      name: r.name,
      distanceMeters: Number(r.distance_meters),
      durationSeconds: Number(r.duration_seconds),
      junctionsCount: Number(r.junctions_count || junctions.length),
      rawPoints,
      segments,
      geojsonGeometry: geojson,
      isMultiSegment: Boolean(r.is_multi_segment),
      isVerified: Boolean(r.is_verified),
      version: Number(r.version || 1),
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      clientCreatedAt: r.client_created_at,
      isDeleted: Boolean(r.is_deleted),
      syncStatus: r.sync_status,
    };

    return { path, junctions, rawPoints };
  }

  static async getAllSavedPaths(): Promise<MarketPath[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_paths WHERE is_deleted = 0 ORDER BY created_at DESC;`
    );
    return rows.map((r) => {
      let geojson: any = null;
      try {
        geojson = JSON.parse(r.geojson_geometry);
      } catch {
        geojson = { coordinates: [] };
      }

      let rawPoints: PathPointRaw[] = [];
      try {
        rawPoints = JSON.parse(r.raw_points_json);
      } catch {
        rawPoints = [];
      }

      return {
        id: r.id,
        missionId: r.mission_id,
        name: r.name,
        distanceMeters: Number(r.distance_meters),
        durationSeconds: Number(r.duration_seconds),
        junctionsCount: Number(r.junctions_count),
        rawPoints,
        segments: geojson?.coordinates || [],
        isVerified: Boolean(r.is_verified),
        version: Number(r.version || 1),
        createdBy: r.created_by,
        updatedBy: r.updated_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        clientCreatedAt: r.client_created_at,
        isDeleted: Boolean(r.is_deleted),
        syncStatus: r.sync_status,
      };
    });
  }

  /**
   * Retrieves all saved junctions across paths in SQLite, with their branches
   */
  static async getAllSavedJunctions(marketId?: string): Promise<LocalPathJunction[]> {
    let query = `SELECT * FROM local_path_junctions WHERE (is_excluded = 0 OR is_excluded IS NULL)`;
    const params: any[] = [];
    if (marketId) {
      query += ` AND (market_id = ? OR market_id IS NULL)`;
      params.push(marketId);
    }
    query += ` ORDER BY sequence_number ASC;`;

    const juncRows = await this.db.getAllAsync<any>(query, params).catch(() => []);

    // Load individual branch records if local_junction_branches table exists
    const allBranchesRows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_junction_branches ORDER BY created_at ASC;`
    ).catch(() => []);

    const branchesByJunction = new Map<string, JunctionBranch[]>();
    for (const b of allBranchesRows) {
      const list = branchesByJunction.get(b.junction_id) || [];
      list.push({
        id: b.id,
        junctionId: b.junction_id,
        label: b.label,
        relativeSide: b.relative_side,
        status: b.status,
        connectedPathId: b.connected_path_id || undefined,
        connectedTargetJunctionId: b.connected_target_junction_id || undefined,
        notes: b.notes || undefined,
        mappedAt: b.mapped_at || undefined,
        mappedBy: b.mapped_by || undefined,
      });
      branchesByJunction.set(b.junction_id, list);
    }

    return juncRows.map((j) => {
      let branches: JunctionBranch[] = branchesByJunction.get(j.id) || [];
      if (branches.length === 0 && j.branches_json) {
        try {
          branches = JSON.parse(j.branches_json);
        } catch {
          branches = [];
        }
      }
      if (branches.length === 0) {
        branches = generateDefaultBranchesForType(j.id, j.junction_type || 'unknown', j.path_id || undefined);
      }

      return {
        id: j.id,
        sessionId: j.session_id,
        pathId: j.path_id || undefined,
        operationalLabel: j.operational_label,
        displayName: j.display_name || undefined,
        junctionType: j.junction_type || 'unknown',
        marketId: j.market_id || undefined,
        missionId: j.mission_id || undefined,
        createdBy: j.created_by || undefined,
        verificationState: j.verification_state || 'unverified',
        locationSource: j.location_source || 'current_gps',
        latitude: Number(j.latitude),
        longitude: Number(j.longitude),
        sequenceNumber: Number(j.sequence_number || 0),
        timestamp: Number(j.timestamp || 0),
        createdAt: j.created_at,
        isExcluded: Boolean(j.is_excluded),
        exclusionReason: j.exclusion_reason || undefined,
        branches,
      };
    });
  }


  static async getRemainingJunctionBranches(missionId?: string): Promise<Array<{ junction: LocalPathJunction; branch: JunctionBranch }>> {
    const junctions = await this.getAllSavedJunctions();
    const rows: Array<{ junction: LocalPathJunction; branch: JunctionBranch }> = [];
    for (const junction of junctions) {
      if (missionId && junction.missionId !== missionId) continue;
      for (const branch of junction.branches ?? []) {
        if (branch.status === 'unmapped' || branch.status === 'in_progress') rows.push({ junction, branch });
      }
    }
    return rows;
  }

  static async markBranchInProgress(branchId: string, mappedBy: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE local_junction_branches SET status = 'in_progress', mapped_by = ? WHERE id = ? AND status IN ('unmapped', 'in_progress');`,
      [mappedBy, branchId]
    );
    await OutboxRepository.enqueue('junction_branches', branchId, 'UPDATE', { id: branchId, status: 'in_progress', mappedBy });
  }

  static async markBranchMapped(branchId: string, connectedPathId: string, mappedBy: string, connectedTargetJunctionId?: string): Promise<void> {
    const mappedAt = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_junction_branches SET status = 'mapped', connected_path_id = ?, connected_target_junction_id = ?, mapped_at = ?, mapped_by = ? WHERE id = ?;`,
      [connectedPathId, connectedTargetJunctionId || null, mappedAt, mappedBy, branchId]
    );
    await OutboxRepository.enqueue('junction_branches', branchId, 'UPDATE', { id: branchId, status: 'mapped', connectedPathId, connectedTargetJunctionId: connectedTargetJunctionId || null, mappedAt, mappedBy });
  }

  /**
   * Marks a junction branch as blocked (e.g. locked gate, impassable stall, or construction barrier)
   */
  static async markBranchBlocked(branchId: string, notes?: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE local_junction_branches SET status = 'blocked', notes = ? WHERE id = ?;`,
      [notes || null, branchId]
    ).catch(() => {});
  }
}
