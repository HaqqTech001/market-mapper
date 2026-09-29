import { MovementDetector, type MovementState } from '@/src/lib/location/movementDetector';
import { PathRepository } from '@/src/db/repositories/PathRepository';
import type { RawGpsSample } from '@/src/types';

type RecorderSnapshot = {
  sessionId: string | null;
  segmentId: string | null;
  missionId: string | null;
  status: 'idle' | 'recording' | 'paused';
  movementState: MovementState;
  distanceMeters: number;
  sequenceNumber: number;
  acceptedPoints: RawGpsSample[];
};

export class NativePathRecorder {
  private detector = new MovementDetector();
  private snapshot: RecorderSnapshot = {
    sessionId: null, segmentId: null, missionId: null, status: 'idle',
    movementState: 'SEARCHING', distanceMeters: 0, sequenceNumber: 0, acceptedPoints: [],
  };

  getSnapshot(): RecorderSnapshot { return { ...this.snapshot, acceptedPoints: [...this.snapshot.acceptedPoints] }; }

  async start(missionId: string): Promise<RecorderSnapshot> {
    if (this.snapshot.status !== 'idle') return this.getSnapshot();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await PathRepository.startSession(sessionId, missionId);
    const segment = await PathRepository.createSegment(sessionId, 0);
    this.detector.reset();
    this.snapshot = { sessionId, segmentId: segment.id, missionId, status: 'recording', movementState: 'SEARCHING', distanceMeters: 0, sequenceNumber: 0, acceptedPoints: [] };
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
    await PathRepository.updateSessionTelemetry(this.snapshot.sessionId, this.snapshot.distanceMeters, 0, 0, 0, false);
    return this.getSnapshot();
  }

  async pause(): Promise<RecorderSnapshot> {
    if (this.snapshot.status !== 'recording' || !this.snapshot.sessionId || !this.snapshot.segmentId) return this.getSnapshot();
    await PathRepository.closeSegment(this.snapshot.segmentId);
    this.snapshot.status = 'paused';
    await PathRepository.updateSessionTelemetry(this.snapshot.sessionId, this.snapshot.distanceMeters, 0, 0, 0, true);
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
    await PathRepository.updateSessionTelemetry(this.snapshot.sessionId, this.snapshot.distanceMeters, 0, 0, 0, false);
    return this.getSnapshot();
  }
}
