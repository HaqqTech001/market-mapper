/**
 * Path Recording State Machine Hook — Phase 3 Production Engine
 * Handles GPS subscriptions, durable SQLite incremental persistence,
 * multi-segment pause/resume, field undos/trims, and cold-start crash recovery.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ActivePathSession,
  RawGpsSample,
  PathSegment,
  LocalPathJunction,
  JunctionType,
  GpsQualityStatus,
  GpsDiagnosticInfo,
  MarketPath,
  LocationCoordinates,
} from '../types';
import { PathRepository } from '../db/repositories/PathRepository';
import {
  validateLocationSample,
  computeGpsQualityStatus,
  calculatePolylineDistanceMeters,
  MovementDetector,
  MovementEvaluation,
} from '../lib/location/gpsQuality';
import { locationService, LocationSubscription } from '../lib/location/locationService';
import { resolveOperationalCoordinates } from '../lib/location/operationalContext';

export function usePathRecording(activeMissionId: string = '') {
  // Session State Machine
  const [status, setStatus] = useState<
    'idle' | 'starting' | 'recording' | 'paused' | 'reviewing' | 'saving' | 'discarded'
  >('idle');
  const [activeSession, setActiveSession] = useState<ActivePathSession | null>(null);
  const [currentSegment, setCurrentSegment] = useState<PathSegment | null>(null);
  const [segments, setSegments] = useState<PathSegment[]>([]);
  const [rawPoints, setRawPoints] = useState<RawGpsSample[]>([]);
  const [junctions, setJunctions] = useState<LocalPathJunction[]>([]);

  // Telemetry
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [activeDurationSeconds, setActiveDurationSeconds] = useState(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);

  // Realtime GPS
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [gpsQuality, setGpsQuality] = useState<GpsQualityStatus>('searching');
  const [rejectedCount, setRejectedCount] = useState(0);
  const [persistenceStatus, setPersistenceStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [latestEvaluation, setLatestEvaluation] = useState<MovementEvaluation | null>(null);

  // Cold Start / Crash Recovery
  const [unfinishedSession, setUnfinishedSession] = useState<ActivePathSession | null>(null);

  // Movement Detector Instance (preserves stationary anchor and rolling history across GPS updates)
  const movementDetectorRef = useRef<MovementDetector>(new MovementDetector());

  // Refs for tracking across timers and callbacks without re-render lag
  const statusRef = useRef(status);
  statusRef.current = status;

  const activeSessionRef = useRef(activeSession);
  activeSessionRef.current = activeSession;

  const currentSegmentRef = useRef(currentSegment);
  currentSegmentRef.current = currentSegment;

  const rawPointsRef = useRef(rawPoints);
  rawPointsRef.current = rawPoints;

  const distanceRef = useRef(distanceMeters);
  distanceRef.current = distanceMeters;

  const activeDurationRef = useRef(activeDurationSeconds);
  activeDurationRef.current = activeDurationSeconds;

  const totalDurationRef = useRef(totalDurationSeconds);
  totalDurationRef.current = totalDurationSeconds;

  const junctionsRef = useRef(junctions);
  junctionsRef.current = junctions;

  const lastAcceptedSampleRef = useRef<RawGpsSample | null>(null);
  const locationSubRef = useRef<LocationSubscription | null>(null);
  const timerRef = useRef<any>(null);

  /**
   * 1. Cold Start Check: Detect unfinished session in SQLite
   */
  useEffect(() => {
    let isMounted = true;
    async function checkUnfinished() {
      try {
        const recovered = await PathRepository.getActiveSession();
        if (isMounted && recovered.session && (recovered.session.status === 'recording' || recovered.session.status === 'paused')) {
          setUnfinishedSession(recovered.session);
        }
      } catch (err) {
        console.warn('Cold start recovery check warning:', err);
      }
    }
    checkUnfinished();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * 2. Active duration & total duration seconds timer
   * Only increments active duration while status === 'recording'
   */
  useEffect(() => {
    if (status === 'recording' || status === 'paused') {
      timerRef.current = setInterval(() => {
        setTotalDurationSeconds((prev) => prev + 1);
        if (statusRef.current === 'recording') {
          setActiveDurationSeconds((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  /**
   * 3. Periodic SQLite telemetry checkpoint (every 3 seconds during recording)
   */
  useEffect(() => {
    if (status !== 'recording' && status !== 'paused') return;

    const interval = setInterval(async () => {
      if (activeSessionRef.current) {
        setPersistenceStatus('saving');
        try {
          await PathRepository.updateSessionTelemetry(
            activeSessionRef.current.sessionId,
            distanceRef.current,
            totalDurationRef.current,
            activeDurationRef.current,
            junctionsRef.current.length,
            statusRef.current === 'paused',
            statusRef.current === 'paused' ? 'paused' : 'recording'
          );
          setPersistenceStatus('saved');
        } catch {
          setPersistenceStatus('error');
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status]);

  /**
   * 4. GPS Position Update Handler
   */
  const handleLocationUpdate = useCallback((loc: { coords: LocationCoordinates; timestamp: number }) => {
    const coords = loc.coords;
    setCurrentLocation(coords);

    const quality = computeGpsQualityStatus(
      { accuracy: coords.accuracy, timestamp: loc.timestamp },
      Date.now()
    );
    setGpsQuality(quality);

    // If not actively recording, do not append to recorded path
    if (statusRef.current !== 'recording') {
      return;
    }

    const currentSeg = currentSegmentRef.current;
    const session = activeSessionRef.current;
    if (!currentSeg || !session) return;

    // Process sample through accuracy-aware Movement Detector
    const evaluation = movementDetectorRef.current.processSample(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: loc.timestamp,
        accuracy: coords.accuracy,
        speed: coords.speed,
        heading: coords.heading,
        altitude: coords.altitude,
        altitudeAccuracy: coords.altitudeAccuracy,
      },
      Date.now()
    );

    setLatestEvaluation(evaluation);

    const sampleId = `gps_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nextSeq = rawPointsRef.current.length + 1;

    const sample: RawGpsSample = {
      id: sampleId,
      sessionId: session.sessionId,
      segmentId: currentSeg.id,
      sequenceNumber: nextSeq,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: loc.timestamp,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      speed: coords.speed,
      accepted: evaluation.accepted,
      rejectionReason: evaluation.rejectionReason,
      createdAt: new Date(loc.timestamp).toISOString(),
    };

    // Incremental write to SQLite immediately
    PathRepository.appendRawPoint(sample).catch((err) =>
      console.error('Error persisting raw GPS point:', err)
    );

    setRawPoints((prev) => [...prev, sample]);

    if (evaluation.accepted) {
      lastAcceptedSampleRef.current = sample;
      // Derived strictly from confirmed movement geometry — ZERO distance accumulated while stationary
      if (evaluation.distanceAddedToPathMeters > 0) {
        setDistanceMeters((prev) => Math.round((prev + evaluation.distanceAddedToPathMeters) * 10) / 10);
      }
    } else {
      setRejectedCount((prev) => prev + 1);
    }
  }, []);

  /**
   * 5. Start Location Watcher
   */
  useEffect(() => {
    let sub: LocationSubscription | null = null;
    locationService
      .watchPositionAsync({ timeInterval: 1000, distanceInterval: 0.5 }, handleLocationUpdate)
      .then((s) => {
        sub = s;
        locationSubRef.current = s;
      });

    return () => {
      if (sub) {
        sub.remove();
      }
    };
  }, [handleLocationUpdate]);

  /**
   * Start Recording Action
   */
  const startRecording = useCallback(async (missionId: string = activeMissionId) => {
    // Single active path enforcement: if session is already recording or paused, preserve current active session
    if (statusRef.current === 'recording' || statusRef.current === 'paused') {
      return;
    }

    setStatus('starting');
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const session = await PathRepository.startSession(sessionId, missionId);
    const initialSegment = await PathRepository.createSegment(sessionId, 0);

    // Reset movement detector anchor and rolling history
    movementDetectorRef.current.reset();
    setLatestEvaluation(null);

    setActiveSession(session);
    setCurrentSegment(initialSegment);
    setSegments([initialSegment]);
    setRawPoints([]);
    setJunctions([]);
    setDistanceMeters(0);
    setActiveDurationSeconds(0);
    setTotalDurationSeconds(0);
    setRejectedCount(0);
    lastAcceptedSampleRef.current = null;
    setStatus('recording');
  }, [activeMissionId]);

  /**
   * Pause Recording Action
   */
  const pauseRecording = useCallback(async () => {
    if (status !== 'recording' || !activeSession || !currentSegment) return;

    // Close active segment so movements during pause don't connect
    await PathRepository.closeSegment(currentSegment.id);
    await PathRepository.updateSessionTelemetry(
      activeSession.sessionId,
      distanceRef.current,
      totalDurationRef.current,
      activeDurationRef.current,
      junctionsRef.current.length,
      true,
      'paused'
    );

    setStatus('paused');
  }, [status, activeSession, currentSegment]);

  /**
   * Resume Recording Action
   */
  const resumeRecording = useCallback(async () => {
    if (status !== 'paused' || !activeSession) return;

    // Start a brand new segment index to prevent straight connector line across pause
    const nextIndex = segments.length;
    const newSegment = await PathRepository.createSegment(activeSession.sessionId, nextIndex);

    setCurrentSegment(newSegment);
    setSegments((prev) => [...prev, newSegment]);

    // Reset lastAcceptedSampleRef so distance does NOT calculate across the pause gap
    lastAcceptedSampleRef.current = null;

    await PathRepository.updateSessionTelemetry(
      activeSession.sessionId,
      distanceRef.current,
      totalDurationRef.current,
      activeDurationRef.current,
      junctionsRef.current.length,
      false,
      'recording'
    );

    setStatus('recording');
  }, [status, activeSession, segments]);

  /**
   * Add Junction Action
   */
  const addJunction = useCallback(
    async (
      options?:
        | string
        | {
            label?: string;
            name?: string;
            junctionType?: JunctionType;
            latitude?: number;
            longitude?: number;
            marketId?: string;
            missionId?: string;
            createdBy?: string;
          },
      secondParamName?: string
    ) => {
      if (!activeSession) return;

      const juncCount = junctions.length + 1;
      let label: string | undefined;
      let name: string | undefined;
      let junctionType: JunctionType = 'unknown';
      let customLat: number | undefined;
      let customLng: number | undefined;
      let marketId: string | undefined;
      let createdBy: string | undefined;

      if (typeof options === 'string') {
        label = options;
        name = secondParamName;
      } else if (options && typeof options === 'object') {
        label = options.label;
        name = options.name;
        junctionType = options.junctionType || 'unknown';
        customLat = options.latitude;
        customLng = options.longitude;
        marketId = options.marketId;
        createdBy = options.createdBy;
      }

      const operationalLabel =
        label || `Junction J${String(juncCount).padStart(3, '0')}`;
      const juncId = `junc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // Use current location or fallback to last known point or operational context
      const defaultCoord = resolveOperationalCoordinates({
        currentLocation: currentLocation ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude } : null,
      });
      const lat =
        customLat ??
        currentLocation?.latitude ??
        (rawPoints.length > 0 ? rawPoints[rawPoints.length - 1].latitude : defaultCoord.latitude);
      const lng =
        customLng ??
        currentLocation?.longitude ??
        (rawPoints.length > 0 ? rawPoints[rawPoints.length - 1].longitude : defaultCoord.longitude);

      const junction: LocalPathJunction = {
        id: juncId,
        sessionId: activeSession.sessionId,
        missionId: activeSession.missionId,
        marketId,
        operationalLabel,
        displayName: name || undefined,
        junctionType,
        createdBy,
        latitude: lat,
        longitude: lng,
        sequenceNumber: rawPoints.length,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
      };

      await PathRepository.addJunction(junction);
      setJunctions((prev) => [...prev, junction]);

      await PathRepository.updateSessionTelemetry(
        activeSession.sessionId,
        distanceRef.current,
        totalDurationRef.current,
        activeDurationRef.current,
        juncCount,
        status === 'paused',
        status === 'paused' ? 'paused' : 'recording'
      );
    },
    [activeSession, junctions, currentLocation, rawPoints, status]
  );

  /**
   * Field Correction: Undo by Distance (e.g. 10m, 25m, 50m, 100m)
   */
  const undoByDistance = useCallback(
    async (meters: number) => {
      if (!activeSession) return;
      const res = await PathRepository.applyUndoDistance(activeSession.sessionId, meters);

      // Reload updated points and junctions from SQLite
      const updated = await PathRepository.getActiveSession();
      setRawPoints(updated.points);
      setJunctions(updated.junctions);
      setDistanceMeters(res.newDistance);
      const remainingAccepted = updated.points.filter((p) => p.accepted);
      lastAcceptedSampleRef.current = remainingAccepted.length > 0 ? remainingAccepted[remainingAccepted.length - 1] : null;
    },
    [activeSession]
  );

  /**
   * Field Correction: Undo by Time (e.g. 30s, 1m, 2m, 5m)
   */
  const undoByTime = useCallback(
    async (seconds: number) => {
      if (!activeSession) return;
      const res = await PathRepository.applyUndoTime(activeSession.sessionId, seconds);

      const updated = await PathRepository.getActiveSession();
      setRawPoints(updated.points);
      setJunctions(updated.junctions);
      setDistanceMeters(res.newDistance);
      const remainingAccepted = updated.points.filter((p) => p.accepted);
      lastAcceptedSampleRef.current = remainingAccepted.length > 0 ? remainingAccepted[remainingAccepted.length - 1] : null;
    },
    [activeSession]
  );

  /**
   * Field Correction: Select Prior Point
   */
  const selectPreviousPoint = useCallback(
    async (pointId: string) => {
      if (!activeSession) return;
      await PathRepository.applySelectPreviousPoint(activeSession.sessionId, pointId);

      const updated = await PathRepository.getActiveSession();
      setRawPoints(updated.points);
      setJunctions(updated.junctions);
      const remainingAccepted = updated.points.filter((p) => p.accepted);
      const newDist = calculatePolylineDistanceMeters(
        remainingAccepted.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))
      );
      setDistanceMeters(newDist);
      lastAcceptedSampleRef.current = remainingAccepted.length > 0 ? remainingAccepted[remainingAccepted.length - 1] : null;
    },
    [activeSession]
  );

  /**
   * Field Correction: Restart from Junction
   */
  const restartFromJunction = useCallback(
    async (junctionId: string) => {
      if (!activeSession) return;
      await PathRepository.applyRestartFromJunction(activeSession.sessionId, junctionId);

      const updated = await PathRepository.getActiveSession();
      setRawPoints(updated.points);
      setJunctions(updated.junctions);
      const remainingAccepted = updated.points.filter((p) => p.accepted);
      const newDist = calculatePolylineDistanceMeters(
        remainingAccepted.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))
      );
      setDistanceMeters(newDist);
      lastAcceptedSampleRef.current = remainingAccepted.length > 0 ? remainingAccepted[remainingAccepted.length - 1] : null;
    },
    [activeSession]
  );

  /**
   * Trim Start by Points (Review screen)
   */
  const trimStart = useCallback(
    async (count: number) => {
      if (!activeSession) return;
      await PathRepository.trimStartPoints(activeSession.sessionId, count);
      const updated = await PathRepository.getActiveSession();
      setRawPoints(updated.points);
      setJunctions(updated.junctions);
      const remainingAccepted = updated.points.filter((p) => p.accepted);
      const newDist = calculatePolylineDistanceMeters(
        remainingAccepted.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))
      );
      setDistanceMeters(newDist);
    },
    [activeSession]
  );

  /**
   * Trim Start by Distance in Meters (Review screen)
   */
  const trimStartMeters = useCallback(
    async (meters: number) => {
      if (!activeSession) return;
      const res = await PathRepository.trimStartMeters(activeSession.sessionId, meters);
      const updated = await PathRepository.getActiveSession();
      setRawPoints(updated.points);
      setJunctions(updated.junctions);
      setDistanceMeters(res.newDistance);
    },
    [activeSession]
  );

  /**
   * Trim End by Points (Review screen)
   */
  const trimEnd = useCallback(
    async (count: number) => {
      if (!activeSession) return;
      await PathRepository.trimEndPoints(activeSession.sessionId, count);
      const updated = await PathRepository.getActiveSession();
      setRawPoints(updated.points);
      setJunctions(updated.junctions);
      const remainingAccepted = updated.points.filter((p) => p.accepted);
      const newDist = calculatePolylineDistanceMeters(
        remainingAccepted.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))
      );
      setDistanceMeters(newDist);
    },
    [activeSession]
  );

  /**
   * Trim End by Distance in Meters (Review screen)
   */
  const trimEndMeters = useCallback(
    async (meters: number) => {
      if (!activeSession) return;
      const res = await PathRepository.trimEndMeters(activeSession.sessionId, meters);
      const updated = await PathRepository.getActiveSession();
      setRawPoints(updated.points);
      setJunctions(updated.junctions);
      setDistanceMeters(res.newDistance);
    },
    [activeSession]
  );

  /**
   * Finish Recording -> Transitions to Review Screen
   */
  const finishRecording = useCallback(async () => {
    if (!activeSession) return;
    if (currentSegment) {
      await PathRepository.closeSegment(currentSegment.id);
    }
    await PathRepository.updateSessionTelemetry(
      activeSession.sessionId,
      distanceRef.current,
      totalDurationRef.current,
      activeDurationRef.current,
      junctionsRef.current.length,
      true,
      'reviewing'
    );
    setStatus('reviewing');
  }, [activeSession, currentSegment]);

  /**
   * Save Final Path to SQLite & Outbox
   */
  const saveFinalPath = useCallback(
    async (pathName: string, userId: string = 'usr_mapper_01'): Promise<MarketPath | null> => {
      if (!activeSession) return null;
      setStatus('saving');

      // Group accepted points by segmentId
      const segmentMap = new Map<string, Array<[number, number]>>();
      segments.forEach((seg) => segmentMap.set(seg.id, []));

      rawPoints
        .filter((p) => p.accepted)
        .forEach((p) => {
          let coords = segmentMap.get(p.segmentId);
          if (!coords) {
            coords = [];
            segmentMap.set(p.segmentId, coords);
          }
          coords.push([p.longitude, p.latitude]);
        });

      const segmentCoords = Array.from(segmentMap.values()).filter((arr) => arr.length > 0);

      const pathId = `path_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const finalizedPath: MarketPath = {
        id: pathId,
        missionId: activeSession.missionId,
        name: pathName || `Path P${String(Date.now()).slice(-3)}`,
        distanceMeters: Math.round(distanceMeters),
        durationSeconds: activeDurationSeconds,
        junctionsCount: junctions.length,
        rawPoints: rawPoints.filter((p) => p.accepted).map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          timestamp: p.timestamp,
          accuracy: p.accuracy,
          speed: p.speed ?? undefined,
          heading: p.heading ?? undefined,
        })),
        segments: segmentCoords,
        isVerified: false,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clientCreatedAt: activeSession.startedAt,
        isDeleted: false,
        syncStatus: 'local_only',
      };

      const saved = await PathRepository.finalizePath(finalizedPath, activeSession.sessionId);

      setStatus('idle');
      setActiveSession(null);
      setCurrentSegment(null);
      setSegments([]);
      setRawPoints([]);
      setJunctions([]);
      setDistanceMeters(0);
      setActiveDurationSeconds(0);
      setTotalDurationSeconds(0);

      return saved;
    },
    [activeSession, segments, rawPoints, distanceMeters, activeDurationSeconds, junctions]
  );

  /**
   * Discard Active Path
   */
  const discardPath = useCallback(async () => {
    await PathRepository.clearActiveSession();
    setStatus('idle');
    setActiveSession(null);
    setCurrentSegment(null);
    setSegments([]);
    setRawPoints([]);
    setJunctions([]);
    setDistanceMeters(0);
    setActiveDurationSeconds(0);
    setTotalDurationSeconds(0);
    setUnfinishedSession(null);
  }, []);

  /**
   * Crash Recovery: Resume Unfinished Session
   */
  const resumeUnfinishedSession = useCallback(async () => {
    const recovered = await PathRepository.getActiveSession();
    if (!recovered.session) {
      setUnfinishedSession(null);
      return;
    }

    setActiveSession(recovered.session);
    setSegments(recovered.segments);
    setRawPoints(recovered.points);
    setJunctions(recovered.junctions);
    setDistanceMeters(recovered.session.distanceMeters);
    setActiveDurationSeconds(recovered.session.activeDurationSeconds);
    setTotalDurationSeconds(recovered.session.durationSeconds);

    // Open a new segment upon recovery
    const nextIndex = recovered.segments.length;
    const newSeg = await PathRepository.createSegment(recovered.session.sessionId, nextIndex);
    setCurrentSegment(newSeg);
    setSegments((prev) => [...prev, newSeg]);

    setUnfinishedSession(null);
    setStatus('recording');
  }, []);

  /**
   * Crash Recovery: Review & Finish Unfinished Session
   */
  const reviewUnfinishedSession = useCallback(async () => {
    const recovered = await PathRepository.getActiveSession();
    if (!recovered.session) {
      setUnfinishedSession(null);
      return;
    }

    setActiveSession(recovered.session);
    setSegments(recovered.segments);
    setRawPoints(recovered.points);
    setJunctions(recovered.junctions);
    setDistanceMeters(recovered.session.distanceMeters);
    setActiveDurationSeconds(recovered.session.activeDurationSeconds);
    setTotalDurationSeconds(recovered.session.durationSeconds);

    setUnfinishedSession(null);
    setStatus('reviewing');
  }, []);

  /**
   * Crash Recovery: Discard Unfinished Session
   */
  const discardUnfinishedSession = useCallback(async () => {
    await PathRepository.clearActiveSession();
    setUnfinishedSession(null);
    setStatus('idle');
  }, []);

  /**
   * Working polyline coordinates split by segment
   */
  const activeSegmentsCoordinates = useMemo(() => {
    const segMap = new Map<string, Array<{ latitude: number; longitude: number }>>();
    segments.forEach((s) => segMap.set(s.id, []));

    rawPoints
      .filter((p) => p.accepted)
      .forEach((p) => {
        let pts = segMap.get(p.segmentId);
        if (!pts) {
          pts = [];
          segMap.set(p.segmentId, pts);
        }
        pts.push({ latitude: p.latitude, longitude: p.longitude });
      });

    return Array.from(segMap.values()).filter((arr) => arr.length > 0);
  }, [segments, rawPoints]);

  /**
   * Diagnostic summary info
   */
  const diagnosticInfo: GpsDiagnosticInfo = useMemo(() => {
    const acceptedPoints = rawPoints.filter((p) => p.accepted);
    return {
      latitude: currentLocation?.latitude || 0,
      longitude: currentLocation?.longitude || 0,
      accuracy: currentLocation?.accuracy || 0,
      speed: currentLocation?.speed ?? null,
      heading: currentLocation?.heading ?? null,
      sampleCount: rawPoints.length,
      acceptedCount: acceptedPoints.length,
      rejectedCount,
      activeSegmentIndex: currentSegment?.segmentIndex ?? (segments.length > 0 ? segments.length - 1 : 0),
      quality: gpsQuality,
      persistenceStatus,
      isSimulatorActive: locationService.getIsSimulationMode(),
      movementState: latestEvaluation?.movementState || (status === 'recording' ? 'STATIONARY' : 'SEARCHING'),
      rawDisplacementMeters: latestEvaluation?.rawDisplacementMeters || 0,
      distanceFromAnchorMeters: latestEvaluation?.distanceFromAnchorMeters || 0,
      acceptedDisplacementMeters: latestEvaluation?.distanceFromPreviousMeters || 0,
      distanceAddedMeters: latestEvaluation?.distanceAddedToPathMeters || 0,
      lastRejectionReason: latestEvaluation?.rejectionReason || null,
    };
  }, [
    currentLocation,
    rawPoints,
    rejectedCount,
    currentSegment,
    segments,
    gpsQuality,
    persistenceStatus,
    latestEvaluation,
    status,
  ]);

  return {
    status,
    activeSession,
    currentSegment,
    segments,
    rawPoints,
    junctions,
    distanceMeters,
    activeDurationSeconds,
    totalDurationSeconds,
    currentLocation,
    gpsQuality,
    unfinishedSession,
    activeSegmentsCoordinates,
    diagnosticInfo,
    startRecording,
    pauseRecording,
    resumeRecording,
    addJunction,
    undoByDistance,
    undoByTime,
    selectPreviousPoint,
    restartFromJunction,
    trimStart,
    trimStartMeters,
    trimEnd,
    trimEndMeters,
    finishRecording,
    saveFinalPath,
    discardPath,
    resumeUnfinishedSession,
    reviewUnfinishedSession,
    discardUnfinishedSession,
  };
}
