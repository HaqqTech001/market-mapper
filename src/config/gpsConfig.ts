/**
 * Centralized GPS & Path Processing Configuration
 * 
 * Defines operational thresholds for:
 * - GPS sample acceptance / rejection
 * - Quality classification
 * - Jitter and physical movement filtering
 * - Rejection reasons
 * 
 * Allows tuning from physical field tests without altering core business logic.
 */

export interface GpsProcessingConfig {
  /** Target preferred accuracy for optimal mapping in open sky (meters) */
  goodAccuracyMeters: number;
  /** Acceptable accuracy under open stalls / awnings (meters) */
  fairAccuracyMeters: number;
  /** Degraded accuracy under dense zinc/concrete multi-story roofs (meters) */
  poorAccuracyMeters: number;
  /** Hard rejection threshold: samples worse than this are definitely invalid (meters) */
  hardRejectAccuracyMeters: number;
  /** Maximum plausible human walking speed in a market corridor (m/s). ~12.6 km/h */
  maxPlausibleWalkingSpeedMps: number;
  /** Radius around stationary anchor where coordinate jitter is treated as stationary noise (meters) */
  stationaryRadiusMeters: number;
  /** Number of consecutive sustained displacement samples required to confirm transition to MOVING */
  movementConfirmationSamples: number;
  /** Minimum sustained displacement evidence required to confirm genuine walking (meters) */
  minimumMovementEvidenceMeters: number;
  /** Stale sample limit: timestamps older than this are rejected (milliseconds) */
  staleSampleMilliseconds: number;
  /** Minimum distance to consider two consecutive samples duplicates (meters) */
  duplicateToleranceMeters: number;
  /** Duration of low/no displacement before entering STATIONARY cluster (milliseconds) */
  stationaryConfirmationDurationMs: number;
  /** Timeout without fix before status transitions to 'searching' (milliseconds) */
  searchingTimeoutMs: number;

  // Backward compatibility aliases
  maxPreferredAccuracyMeters: number;
  minimumMovementMeters: number;
  duplicateDistanceTolerance: number;
}

export const DEFAULT_GPS_CONFIG: GpsProcessingConfig = {
  goodAccuracyMeters: 8.0,
  fairAccuracyMeters: 18.0,
  poorAccuracyMeters: 35.0,
  hardRejectAccuracyMeters: 50.0,
  maxPlausibleWalkingSpeedMps: 3.5, // ~12.6 km/h max plausible walking speed
  stationaryRadiusMeters: 3.0,
  movementConfirmationSamples: 3,
  minimumMovementEvidenceMeters: 3.5,
  staleSampleMilliseconds: 15000,
  duplicateToleranceMeters: 0.5,
  stationaryConfirmationDurationMs: 3000,
  searchingTimeoutMs: 10000,

  // Compatibility aliases
  get maxPreferredAccuracyMeters() {
    return this.goodAccuracyMeters;
  },
  get minimumMovementMeters() {
    return this.minimumMovementEvidenceMeters;
  },
  get duplicateDistanceTolerance() {
    return this.duplicateToleranceMeters;
  },
};

/**
 * Standardized, machine-readable rejection and exclusion reasons
 */
export type GpsEngineRejectionReason =
  | 'duplicate'
  | 'stale'
  | 'invalid_coordinate'
  | 'impossible_jump'
  | 'poor_accuracy_excluded'
  | 'stationary_noise';

export type MapperCorrectionReason =
  | 'undo_distance'
  | 'undo_time'
  | 'trim_start'
  | 'trim_end'
  | 'restart_from_point'
  | 'restart_from_junction'
  | 'manual_exclusion';

export type PathPointRejectionReason = GpsEngineRejectionReason | MapperCorrectionReason;

export type GpsSampleQuality = 'good' | 'fair' | 'poor' | 'unusable';

/**
 * Classifies an incoming sample accuracy into quality tiers
 */
export function classifyAccuracyQuality(accuracy: number, config: GpsProcessingConfig = activeConfig): GpsSampleQuality {
  if (isNaN(accuracy) || accuracy <= 0 || accuracy > config.hardRejectAccuracyMeters) {
    return 'unusable';
  }
  if (accuracy <= config.goodAccuracyMeters) {
    return 'good';
  }
  if (accuracy <= config.fairAccuracyMeters) {
    return 'fair';
  }
  return 'poor';
}

/**
 * Active runtime configuration (can be adjusted during field diagnostics)
 */
let activeConfig: GpsProcessingConfig = { ...DEFAULT_GPS_CONFIG };

export function getGpsConfig(): GpsProcessingConfig {
  return activeConfig;
}

export function updateGpsConfig(partial: Partial<GpsProcessingConfig>): GpsProcessingConfig {
  activeConfig = { ...activeConfig, ...partial };
  return activeConfig;
}

export function resetGpsConfig(): GpsProcessingConfig {
  activeConfig = { ...DEFAULT_GPS_CONFIG };
  return activeConfig;
}
