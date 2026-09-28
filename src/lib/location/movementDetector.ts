/**
 * Movement Detector & Stationary Anchor Engine
 * 
 * Implements an accuracy-aware, history-aware movement detector to resolve
 * physical device GPS stationary drift in dense Nigerian market environments.
 * 
 * Internal State Model:
 * - SEARCHING: Waiting for first valid GPS observation
 * - STATIONARY: Mapper is standing/sitting; GPS wander is absorbed by stationary anchor
 * - POSSIBLY_MOVING: Sustained displacement away from anchor detected; evaluating confirmation
 * - MOVING: Verified genuine walking movement; path geometry and distance accumulate
 */

import {
  GpsProcessingConfig,
  getGpsConfig,
  classifyAccuracyQuality,
  GpsSampleQuality,
  PathPointRejectionReason,
} from '../../config/gpsConfig';
import { calculateHaversineDistanceMeters } from './gpsQuality';

export type MovementState = 'SEARCHING' | 'STATIONARY' | 'POSSIBLY_MOVING' | 'MOVING';

export interface LocationObservation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
}

export interface StationaryAnchor {
  latitude: number;
  longitude: number;
  accuracy: number;
  establishedAt: number;
  lastSampleTimestamp: number;
  sampleCount: number;
}

export interface MovementEvaluation {
  accepted: boolean;
  rejectionReason: PathPointRejectionReason | null;
  movementState: MovementState;
  /** Raw geometric displacement from previous observation */
  rawDisplacementMeters: number;
  /** Distance between this observation and the last accepted point */
  distanceFromPreviousMeters: number;
  /** Actual distance to add to path recording (0 when stationary/rejected) */
  distanceAddedToPathMeters: number;
  /** Distance from the active stationary cluster anchor */
  distanceFromAnchorMeters: number;
  /** Accuracy-based quality classification */
  quality: GpsSampleQuality;
  /** Whether the detector currently considers the mapper stationary */
  isStationary: boolean;
  /** Current stationary cluster anchor coordinate */
  stationaryAnchor: StationaryAnchor | null;
}

export class MovementDetector {
  private config: GpsProcessingConfig;
  private state: MovementState = 'SEARCHING';
  private stationaryAnchor: StationaryAnchor | null = null;
  private lastObservation: LocationObservation | null = null;
  private lastAcceptedSample: LocationObservation | null = null;
  private candidateMovingSamples: LocationObservation[] = [];
  private recentSamples: LocationObservation[] = [];
  private stationaryCandidateCount = 0;

  constructor(customConfig?: GpsProcessingConfig) {
    this.config = customConfig || getGpsConfig();
  }

  public reset(): void {
    this.state = 'SEARCHING';
    this.stationaryAnchor = null;
    this.lastObservation = null;
    this.lastAcceptedSample = null;
    this.candidateMovingSamples = [];
    this.recentSamples = [];
    this.stationaryCandidateCount = 0;
  }

  public getState(): MovementState {
    return this.state;
  }

  public getStationaryAnchor(): StationaryAnchor | null {
    return this.stationaryAnchor;
  }

  public getLastAcceptedSample(): LocationObservation | null {
    return this.lastAcceptedSample;
  }

  /**
   * Processes a raw GPS observation and returns the movement evaluation.
   */
  public processSample(
    sample: LocationObservation,
    currentTime: number = Date.now()
  ): MovementEvaluation {
    const quality = classifyAccuracyQuality(sample.accuracy, this.config);

    // 1. Basic Validity Checks
    if (
      isNaN(sample.latitude) ||
      isNaN(sample.longitude) ||
      sample.latitude < -90 ||
      sample.latitude > 90 ||
      sample.longitude < -180 ||
      sample.longitude > 180
    ) {
      return this.createEvaluation(false, 'invalid_coordinate', 0, 0, 0, quality);
    }

    // Hard rejection for unusable accuracy
    if (quality === 'unusable') {
      return this.createEvaluation(false, 'poor_accuracy_excluded', 0, 0, 0, quality);
    }

    // Stale or backward timestamp check
    if (this.lastObservation) {
      if (sample.timestamp < this.lastObservation.timestamp) {
        return this.createEvaluation(false, 'stale', 0, 0, 0, quality);
      }
      if (currentTime - sample.timestamp > this.config.staleSampleMilliseconds) {
        return this.createEvaluation(false, 'stale', 0, 0, 0, quality);
      }
    }

    // Raw displacement from immediately preceding observation
    const rawDisplacement = this.lastObservation
      ? calculateHaversineDistanceMeters(
          this.lastObservation.latitude,
          this.lastObservation.longitude,
          sample.latitude,
          sample.longitude
        )
      : 0;

    const timeDeltaFromLastSec = this.lastObservation
      ? Math.max(0.1, (sample.timestamp - this.lastObservation.timestamp) / 1000)
      : 1;

    // Duplicate detection: virtually no displacement in very short time window
    if (
      this.lastObservation &&
      rawDisplacement < this.config.duplicateToleranceMeters &&
      timeDeltaFromLastSec < 1.5
    ) {
      return this.createEvaluation(false, 'duplicate', rawDisplacement, 0, 0, quality);
    }

    // Update rolling sample history (keep last 5)
    this.recentSamples.push(sample);
    if (this.recentSamples.length > 5) {
      this.recentSamples.shift();
    }

    // 2. Impossible Jump Check against last accepted sample
    if (this.lastAcceptedSample) {
      const distFromAccepted = calculateHaversineDistanceMeters(
        this.lastAcceptedSample.latitude,
        this.lastAcceptedSample.longitude,
        sample.latitude,
        sample.longitude
      );
      const timeFromAcceptedSec = Math.max(
        0.1,
        (sample.timestamp - this.lastAcceptedSample.timestamp) / 1000
      );
      const speedFromAccepted = distFromAccepted / timeFromAcceptedSec;

      // Allow small displacements to pass speed check if within reasonable corridor distances
      if (
        distFromAccepted > 15 &&
        speedFromAccepted > this.config.maxPlausibleWalkingSpeedMps
      ) {
        this.lastObservation = sample;
        return this.createEvaluation(
          false,
          'impossible_jump',
          rawDisplacement,
          distFromAccepted,
          0,
          quality
        );
      }
    }

    // 3. Initial Sample / SEARCHING State
    if (!this.stationaryAnchor || this.state === 'SEARCHING') {
      this.stationaryAnchor = {
        latitude: sample.latitude,
        longitude: sample.longitude,
        accuracy: sample.accuracy,
        establishedAt: sample.timestamp,
        lastSampleTimestamp: sample.timestamp,
        sampleCount: 1,
      };

      // Check if device already reports clear walking speed with good accuracy
      if (sample.speed && sample.speed > 0.6 && sample.accuracy <= this.config.goodAccuracyMeters) {
        this.state = 'MOVING';
      } else {
        this.state = 'STATIONARY';
      }

      this.lastObservation = sample;
      this.lastAcceptedSample = sample;

      return this.createEvaluation(true, null, rawDisplacement, 0, 0, quality);
    }

    // 4. Distance from Active Stationary Anchor
    const distFromAnchor = calculateHaversineDistanceMeters(
      this.stationaryAnchor.latitude,
      this.stationaryAnchor.longitude,
      sample.latitude,
      sample.longitude
    );

    // Accuracy-aware effective stationary cluster radius
    // Larger reported inaccuracy = wider GPS wander circle
    const effectiveStationaryRadius = Math.max(
      this.config.stationaryRadiusMeters,
      Math.min(sample.accuracy * 0.75, 12.0)
    );

    // 5. Handling STATIONARY / POSSIBLY_MOVING State
    if (this.state === 'STATIONARY' || this.state === 'POSSIBLY_MOVING') {
      if (distFromAnchor <= effectiveStationaryRadius) {
        // Point is within stationary jitter cluster
        this.candidateMovingSamples = [];
        this.state = 'STATIONARY';

        // Slowly nudge anchor towards center of cluster (weighted average)
        this.stationaryAnchor.latitude =
          this.stationaryAnchor.latitude * 0.92 + sample.latitude * 0.08;
        this.stationaryAnchor.longitude =
          this.stationaryAnchor.longitude * 0.92 + sample.longitude * 0.08;
        this.stationaryAnchor.sampleCount += 1;
        this.stationaryAnchor.lastSampleTimestamp = sample.timestamp;

        this.lastObservation = sample;
        return this.createEvaluation(
          false,
          'stationary_noise',
          rawDisplacement,
          0,
          0,
          quality,
          distFromAnchor
        );
      }

      // Point is beyond stationary radius: candidate movement detected
      this.candidateMovingSamples.push(sample);
      this.state = 'POSSIBLY_MOVING';

      // Check if we have gathered sufficient evidence of sustained walking
      const isConfirmed = this.evaluateMovementConfirmation(
        this.candidateMovingSamples,
        distFromAnchor,
        effectiveStationaryRadius
      );

      if (!isConfirmed) {
        // Not enough sustained evidence yet; absorb sample without accumulating distance
        this.lastObservation = sample;
        return this.createEvaluation(
          false,
          'stationary_noise',
          rawDisplacement,
          0,
          0,
          quality,
          distFromAnchor
        );
      }

      // Movement CONFIRMED! Transition to MOVING state
      this.state = 'MOVING';
      this.stationaryAnchor = null;
      this.candidateMovingSamples = [];
      this.stationaryCandidateCount = 0;

      const distFromAccepted = this.lastAcceptedSample
        ? calculateHaversineDistanceMeters(
            this.lastAcceptedSample.latitude,
            this.lastAcceptedSample.longitude,
            sample.latitude,
            sample.longitude
          )
        : rawDisplacement;

      this.lastObservation = sample;
      this.lastAcceptedSample = sample;

      return this.createEvaluation(
        true,
        null,
        rawDisplacement,
        distFromAccepted,
        distFromAccepted,
        quality,
        distFromAnchor
      );
    }

    // 6. Handling MOVING State
    if (this.state === 'MOVING') {
      // Check if mapper has stopped moving (Walk -> Stop -> Walk)
      const isPossibleStop =
        (sample.speed !== null && sample.speed !== undefined && sample.speed < 0.25) ||
        rawDisplacement < 1.0;

      if (isPossibleStop) {
        this.stationaryCandidateCount += 1;
        if (this.stationaryCandidateCount >= 2) {
          // Mapper has confirmed stopped walking! Establish new stationary anchor at current location
          this.state = 'STATIONARY';
          this.stationaryAnchor = {
            latitude: sample.latitude,
            longitude: sample.longitude,
            accuracy: sample.accuracy,
            establishedAt: sample.timestamp,
            lastSampleTimestamp: sample.timestamp,
            sampleCount: 1,
          };
          this.candidateMovingSamples = [];
          this.stationaryCandidateCount = 0;
          this.lastObservation = sample;

          return this.createEvaluation(
            false,
            'stationary_noise',
            rawDisplacement,
            0,
            0,
            quality,
            0
          );
        }

        // First deceleration sample: absorb without accumulating distance to prevent stopping-jitter creep
        this.lastObservation = sample;
        return this.createEvaluation(
          false,
          'stationary_noise',
          rawDisplacement,
          0,
          0,
          quality,
          0
        );
      }

      // Mapper continues genuine walking!
      this.stationaryCandidateCount = 0;
      const distFromAccepted = this.lastAcceptedSample
        ? calculateHaversineDistanceMeters(
            this.lastAcceptedSample.latitude,
            this.lastAcceptedSample.longitude,
            sample.latitude,
            sample.longitude
          )
        : rawDisplacement;

      this.lastObservation = sample;
      this.lastAcceptedSample = sample;

      return this.createEvaluation(
        true,
        null,
        rawDisplacement,
        distFromAccepted,
        distFromAccepted,
        quality,
        0
      );
    }

    // Default fallback
    this.lastObservation = sample;
    return this.createEvaluation(false, null, rawDisplacement, 0, 0, quality);
  }

  /**
   * Evaluates whether candidate samples constitute sustained genuine movement
   */
  private evaluateMovementConfirmation(
    candidates: LocationObservation[],
    distFromAnchor: number,
    effectiveRadius: number
  ): boolean {
    if (candidates.length === 0) return false;

    // Strong speed evidence: device speed > 0.4 m/s for at least 2 samples
    const highSpeedSamples = candidates.filter((s) => s.speed && s.speed >= 0.4);
    if (highSpeedSamples.length >= 2) {
      return true;
    }

    // Sufficient sample count beyond stationary radius
    if (candidates.length >= this.config.movementConfirmationSamples) {
      // Check that samples are progressing or sustained away from anchor
      const lastCandidate = candidates[candidates.length - 1];
      const firstCandidate = candidates[0];
      const candidateDist = calculateHaversineDistanceMeters(
        firstCandidate.latitude,
        firstCandidate.longitude,
        lastCandidate.latitude,
        lastCandidate.longitude
      );

      // Either progressive spread or cumulative distance beyond minimum movement evidence
      if (
        distFromAnchor >= this.config.minimumMovementEvidenceMeters ||
        candidateDist >= 1.5
      ) {
        return true;
      }
    }

    // Slow walking test: sustained distance beyond effective radius + 1.0m over >= 2 seconds
    const timeSpanSec = (candidates[candidates.length - 1].timestamp - candidates[0].timestamp) / 1000;
    if (distFromAnchor > effectiveRadius + 1.0 && timeSpanSec >= 2.0) {
      return true;
    }

    return false;
  }

  /**
   * Evaluates whether mapper has stopped walking while in MOVING state
   */
  private evaluateStationaryTransition(
    current: LocationObservation,
    rawDisplacement: number
  ): boolean {
    // If device reports virtually 0 speed with reasonable accuracy
    if (
      current.speed !== null &&
      current.speed !== undefined &&
      current.speed < 0.2 &&
      rawDisplacement < 1.2
    ) {
      this.stationaryCandidateCount += 1;
      if (this.stationaryCandidateCount >= 2) {
        return true;
      }
    } else if (rawDisplacement < 1.0) {
      this.stationaryCandidateCount += 1;
      if (this.stationaryCandidateCount >= 3) {
        return true;
      }
    } else {
      this.stationaryCandidateCount = 0;
    }

    // Check rolling window spread: if last 4 samples are all within a 2.5m bounding circle
    if (this.recentSamples.length >= 4) {
      let maxSpread = 0;
      for (let i = 0; i < this.recentSamples.length; i++) {
        for (let j = i + 1; j < this.recentSamples.length; j++) {
          const d = calculateHaversineDistanceMeters(
            this.recentSamples[i].latitude,
            this.recentSamples[i].longitude,
            this.recentSamples[j].latitude,
            this.recentSamples[j].longitude
          );
          if (d > maxSpread) maxSpread = d;
        }
      }
      if (maxSpread <= 2.2) {
        return true;
      }
    }

    return false;
  }

  private createEvaluation(
    accepted: boolean,
    rejectionReason: PathPointRejectionReason | null,
    rawDisplacement: number,
    distFromPrevious: number,
    distAdded: number,
    quality: GpsSampleQuality,
    distFromAnchor: number = 0
  ): MovementEvaluation {
    return {
      accepted,
      rejectionReason,
      movementState: this.state,
      rawDisplacementMeters: Math.round(rawDisplacement * 10) / 10,
      distanceFromPreviousMeters: Math.round(distFromPrevious * 10) / 10,
      distanceAddedToPathMeters: Math.round(distAdded * 10) / 10,
      distanceFromAnchorMeters: Math.round(distFromAnchor * 10) / 10,
      quality,
      isStationary: this.state === 'STATIONARY' || this.state === 'SEARCHING',
      stationaryAnchor: this.stationaryAnchor,
    };
  }
}
