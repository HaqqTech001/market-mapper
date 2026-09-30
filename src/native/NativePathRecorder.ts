import { MovementDetector, type MovementState } from '@/src/lib/location/movementDetector';
import { PathRepository } from '@/src/db/repositories/PathRepository';
import type { RawGpsSample } from '@/src/types';

type RecorderSnapshot = {
  sessionId: string | null;
  segmentId: string | null;
  missionId: string | null;
  status: 'idle' | 'recording' | 'paused' | 'reviewing';
  movementState: MovementState;
  distanceMeters: number;
  sequenceNumber: number;
  startedAtMs: number | null;
  activeStartedAtMs: number | null;
  activeDurationSeconds: number;
  durationSeconds: number;
  acceptedPoints: RawGpsSample[];
};

export class NativePathRecorder {
  private detector = new MovementDetector();
  private snapshot: RecorderSnapshot = {
    sessionId: null, segmentId: null, missionId: null, status: 'idle',
    movementState: 'SEARCHING', distanceMeters: 0, sequenceNumber: 0, startedAtMs: null, activeStartedAtMs: null, activeDurationSeconds: 0, durationSeconds: 0, acceptedPoints: [],
  };

  getSnapshot(): RecorderSnapshot { return { ...this.snapshot, acceptedPoints: [...this.snapshot.acceptedPoints] }; }

  async start(missionId: string): Promise<RecorderSnapshot> {
    if (this.snapshot.status !== 'idle') return this.getSnapshot();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await PathRepository.startSession(sessionId, missionId);
    const segment = await PathRepository.createSegment(sessionId, 0);
    this.detector.reset();
    this.snapshot = { sessionId, segmentId: segment.id, missionId, status: 'recording', movementState: 'SEARCHING', distanceMeters: 0, sequenceNumber: 0, startedAtMs: Date.now(), activeStartedAtMs: Date.now(), activeDurationSeconds: 0, durationSeconds: 0, acceptedPoints: [] };
    return this.getSnapshot();
  }

  async ingest(coords: { latitude: number; longitude: number; accuracy: number; timestamp: number; altitude?: number | null; altitudeAccuracy?: number | null; heading?: number | null; speed?: number | null }): Promise<RecorderSnapshot> {
    if (this.snapshot.status !== 'recording' || !this.snapshot.sessionId || !this.snapshot.segmentId) return this.getSnapshot();

    const evaluation = this.detector.processSample(coords, Date.now());
    const sequenceNumber = this.snapshot.sequenceNumber + 1;
    const sample: RawGpsSample = {
      id: `gps_${coords.timestamp}_${sequenceNumber}`,
      sessionId: this.snapshot.sessionId,
      segmentId: this.snapshot.segmentId,
      sequenceNumber,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: coords.timestamp,
      accuracy: coords.accuracy,
      altitude: coords.altitude ?? null,
      altitudeAccuracy: coords.altitudeAccuracy ?? null,
      heading: coords.heading ?? null,
      speed: coords.speed ?? null,
      accepted: evaluation.accepted,
      rejectionReason: evaluation.rejectionReason,
      createdAt: new Date(coords.timestamp).toISOString(),
    };
    await PathRepository.appendRawPoint(sample);

    this.snapshot.sequenceNumber = sequenceNumber;
    this.snapshot.movementState = evaluation.movementState;
    this.snapshot.distanceMeters += evaluation.distanceAddedToPathMeters;
    if (sample.accepted) this.snapshot.acceptedPoints.push(sample);
    this.refreshDurations();
    await PathRepository.updateSessionTelemetry(this.snapshot.sessionId, this.snapshot.distanceMeters, this.snapshot.durationSeconds, this.snapshot.activeDurationSeconds, 0, false);
    return this.getSnapshot();
  }

  async pause(): Promise<RecorderSnapshot> {
    if (this.snapshot.status !== 'recording' || !this.snapshot.sessionId || !this.snapshot.segmentId) return this.getSnapshot();
    await PathRepository.closeSegment(this.snapshot.segmentId);
    this.refreshDurations();
    this.snapshot.activeStartedAtMs = null;
    this.snapshot.status = 'paused';
    await PathRepository.updateSessionTelemetry(this.snapshot.sessionId, this.snapshot.distanceMeters, this.snapshot.durationSeconds, this.snapshot.activeDurationSeconds, 0, true);
    return this.getSnapshot();
  }

  async resume(): Promise<RecorderSnapshot> {
    if (this.snapshot.status !== 'paused' || !this.snapshot.sessionId) return this.getSnapshot();
    const recovered = await PathRepository.getActiveSession();
    const nextIndex = recovered.segments.length;
    const segment = await PathRepository.createSegment(this.snapshot.sessionId, nextIndex);
    this.detector.reset();
    this.snapshot.segmentId = segment.id;
    this.snapshot.status = 'recording';
    this.snapshot.activeStartedAtMs = Date.now();
    this.refreshDurations();
    await PathRepository.updateSessionTelemetry(this.snapshot.sessionId, this.snapshot.distanceMeters, this.snapshot.durationSeconds, this.snapshot.activeDurationSeconds, 0, false);
    return this.getSnapshot();
  }

  private refreshDurations(): void {
    const now = Date.now();
    if (this.snapshot.startedAtMs) this.snapshot.durationSeconds = Math.max(0, Math.floor((now - this.snapshot.startedAtMs) / 1000));
    if (this.snapshot.activeStartedAtMs) {
      const elapsed = Math.max(0, Math.floor((now - this.snapshot.activeStartedAtMs) / 1000));
      this.snapshot.activeDurationSeconds += elapsed;
      this.snapshot.activeStartedAtMs = now;
    }
  }

  async recover(): Promise<RecorderSnapshot> {
    const recovered = await PathRepository.getActiveSession();
    if (!recovered.session) return this.getSnapshot();
    const accepted = recovered.points.filter((p) => p.accepted);
    const open = [...recovered.segments].reverse().find((s) => !s.isClosed);
    this.detector.reset();
    this.snapshot = {
      sessionId: recovered.session.sessionId,
      segmentId: open?.id ?? null,
      missionId: recovered.session.missionId,
      status: recovered.session.status === 'reviewing' ? 'reviewing' : recovered.session.isPaused ? 'paused' : 'recording',
      movementState: 'SEARCHING',
      distanceMeters: recovered.session.distanceMeters,
      sequenceNumber: recovered.points.reduce((m, p) => Math.max(m, p.sequenceNumber), 0),
      startedAtMs: Date.parse(recovered.session.startedAt),
      activeStartedAtMs: recovered.session.status === 'reviewing' || recovered.session.isPaused ? null : Date.now(),
      activeDurationSeconds: recovered.session.activeDurationSeconds,
      durationSeconds: recovered.session.durationSeconds,
      acceptedPoints: accepted,
    };
    return this.getSnapshot();
  }

  async finish(): Promise<RecorderSnapshot> {
    if (!this.snapshot.sessionId || this.snapshot.status === 'idle') return this.getSnapshot();
    if (this.snapshot.segmentId && this.snapshot.status === 'recording') await PathRepository.closeSegment(this.snapshot.segmentId);
    this.refreshDurations();
    this.snapshot.activeStartedAtMs = null;
    await PathRepository.updateSessionTelemetry(this.snapshot.sessionId, this.snapshot.distanceMeters, this.snapshot.durationSeconds, this.snapshot.activeDurationSeconds, 0, false, 'reviewing');
    this.snapshot.status = 'reviewing';
    return this.getSnapshot();
  }



  async getReviewTargets() {
    if (!this.snapshot.sessionId) return { points: [], junctions: [] };
    const recovered = await PathRepository.getActiveSession();
    if (!recovered.session || recovered.session.sessionId !== this.snapshot.sessionId) {
      return { points: [], junctions: [] };
    }
    return {
      points: recovered.points.filter((p) => p.accepted),
      junctions: recovered.junctions.filter((j) => !j.isExcluded),
    };
  }

  async restartFromPoint(pointId: string) {
    if (this.snapshot.status !== 'reviewing' || !this.snapshot.sessionId) throw new Error('Path must be in review before correcting it.');
    await PathRepository.applySelectPreviousPoint(this.snapshot.sessionId, pointId);
    await this.reloadReviewGeometry();
  }

  async restartFromJunction(junctionId: string) {
    if (this.snapshot.status !== 'reviewing' || !this.snapshot.sessionId) throw new Error('Path must be in review before correcting it.');
    await PathRepository.applyRestartFromJunction(this.snapshot.sessionId, junctionId);
    await this.reloadReviewGeometry();
  }

  async undoDistance(meters: number) {
    if (this.snapshot.status !== 'reviewing' || !this.snapshot.sessionId) throw new Error('Path must be in review before correcting it.');
    await PathRepository.applyUndoDistance(this.snapshot.sessionId, meters);
    await this.reloadReviewGeometry();
  }

  async undoTime(seconds: number) {
    if (this.snapshot.status !== 'reviewing' || !this.snapshot.sessionId) throw new Error('Path must be in review before correcting it.');
    await PathRepository.applyUndoTime(this.snapshot.sessionId, seconds);
    await this.reloadReviewGeometry();
  }

  async trimStart(meters: number) {
    if (this.snapshot.status !== 'reviewing' || !this.snapshot.sessionId) throw new Error('Path must be in review before correcting it.');
    await PathRepository.trimStartMeters(this.snapshot.sessionId, meters);
    await this.reloadReviewGeometry();
  }

  async trimEnd(meters: number) {
    if (this.snapshot.status !== 'reviewing' || !this.snapshot.sessionId) throw new Error('Path must be in review before correcting it.');
    await PathRepository.trimEndMeters(this.snapshot.sessionId, meters);
    await this.reloadReviewGeometry();
  }

  private async reloadReviewGeometry() {
    if (!this.snapshot.sessionId) return;
    const raw = await PathRepository.getRawPointsForSession(this.snapshot.sessionId);
    const accepted = raw.filter((p) => p.accepted).sort((a,b)=>a.sequenceNumber-b.sequenceNumber);
    const distance = accepted.slice(1).reduce((sum,p,i)=>sum + distanceMeters(accepted[i],p),0);
    this.snapshot = { ...this.snapshot, acceptedPoints: accepted, sequenceNumber: raw.reduce((max, p) => Math.max(max, p.sequenceNumber), 0), distanceMeters: distance };
  }

  async save(userId: string, name?: string) {
    if (!this.snapshot.sessionId || !this.snapshot.missionId || this.snapshot.status !== 'reviewing') {
      throw new Error('Path must be in review before it can be saved.');
    }
    const recovered = await PathRepository.getRawPointsForSession(this.snapshot.sessionId);
    const accepted = recovered.filter((p) => p.accepted);
    const now = new Date().toISOString();
    const pathId = `path_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const path = await PathRepository.finalizePath({
      id: pathId,
      sessionId: this.snapshot.sessionId,
      missionId: this.snapshot.missionId,
      name: name?.trim() || `Mapped path ${new Date().toLocaleString()}`,
      distanceMeters: this.snapshot.distanceMeters,
      durationSeconds: this.snapshot.durationSeconds,
      junctionsCount: 0,
      rawPoints: accepted.map((p) => ({ latitude: p.latitude, longitude: p.longitude, timestamp: p.timestamp, accuracy: p.accuracy, speed: p.speed ?? undefined, heading: p.heading ?? undefined })),
      isVerified: false,
      version: 1,
      createdBy: userId,
      updatedBy: userId,
      createdAt: now,
      updatedAt: now,
      clientCreatedAt: now,
      isDeleted: false,
      syncStatus: 'local_only',
    }, this.snapshot.sessionId);
    this.detector.reset();
    this.snapshot = { sessionId: null, segmentId: null, missionId: null, status: 'idle', movementState: 'SEARCHING', distanceMeters: 0, sequenceNumber: 0, startedAtMs: null, activeStartedAtMs: null, activeDurationSeconds: 0, durationSeconds: 0, acceptedPoints: [] };
    return path;
  }

  async discard(): Promise<void> {
    if (this.snapshot.sessionId) await PathRepository.discardActiveSession(this.snapshot.sessionId);
    this.detector.reset();
    this.snapshot = { sessionId: null, segmentId: null, missionId: null, status: 'idle', movementState: 'SEARCHING', distanceMeters: 0, sequenceNumber: 0, startedAtMs: null, activeStartedAtMs: null, activeDurationSeconds: 0, durationSeconds: 0, acceptedPoints: [] };
  }
}

function distanceMeters(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){const R=6371000;const toRad=(d:number)=>d*Math.PI/180;const dLat=toRad(b.latitude-a.latitude),dLon=toRad(b.longitude-a.longitude);const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
