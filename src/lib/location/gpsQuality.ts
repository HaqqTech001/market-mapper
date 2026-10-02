/**
 * GPS Quality & Geodesic Calculation Engine
 * Centralizes thresholds, conservative quality classification,
 * raw sample validation, and geodesic distance accumulation.
 */

import { GpsQualityStatus, GpsRejectionReason, RawGpsSample } from '../../types';
import { getGpsConfig } from '../../config/gpsConfig';

/**
 * Calculates geodesic distance between two coordinates using the Haversine formula (WGS84)
 * Returns distance in meters
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const R = 6371008.8; // Mean Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates total travelled distance in meters across a sequence of points
 */
export function calculatePolylineDistanceMeters(
  points: Array<{ latitude: number; longitude: number }>
): number {
  if (points.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += calculateHaversineDistanceMeters(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude
    );
  }
  return total;
}

/**
 * Computes the GPS quality badge state from the latest sample and current clock
 */
export function computeGpsQualityStatus(
  sample: { accuracy?: number; timestamp: number } | null,
  nowMs: number = Date.now()
): GpsQualityStatus {
  const config = getGpsConfig();

  if (!sample || !sample.accuracy || isNaN(sample.accuracy)) {
    return 'searching';
  }

  const ageMs = nowMs - sample.timestamp;
  if (ageMs > config.searchingTimeoutMs) {
    return 'searching';
  }

  if (sample.accuracy <= config.goodAccuracyMeters) {
    return 'good';
  }

  if (sample.accuracy <= config.fairAccuracyMeters) {
    return 'fair';
  }

  if (sample.accuracy <= config.poorAccuracyMeters) {
    return 'poor';
  }

  return 'searching';
}

/**
 * Validates an incoming raw GPS sample against conservative physical filters.
 * Returns acceptance flag and standardized rejection reason if excluded from working path polyline.
 * Note: Raw sample is ALWAYS preserved in SQLite regardless of acceptance!
 * 
 * Distinct handling:
 * - Low-quality sample (e.g. 24m accuracy in difficult market alleys) is STILL ACCEPTED
 *   if it doesn't violate physical speed limits, avoiding false holes in paths.
 * - Definitely invalid sample (>50m, impossible speed >4m/s, or stale >15s) is rejected.
 */
export function validateLocationSample(
  newSample: {
    latitude: number;
    longitude: number;
    timestamp: number;
    accuracy: number;
    speed?: number | null;
  },
  previousAcceptedSample: RawGpsSample | null,
  nowMs: number = Date.now()
): {
  accepted: boolean;
  rejectionReason?: GpsRejectionReason | null;
  distanceFromPreviousMeters: number;
  isLowQuality?: boolean;
} {
  const config = getGpsConfig();

  // 1. Hard rejection: Extreme inaccuracy beyond physical utility threshold
  if (newSample.accuracy > config.hardRejectAccuracyMeters) {
    return {
      accepted: false,
      rejectionReason: 'poor_accuracy_excluded',
      distanceFromPreviousMeters: 0,
    };
  }

  // 2. Stale sample check
  const ageMs = nowMs - newSample.timestamp;
  if (ageMs > config.staleSampleMilliseconds) {
    return {
      accepted: false,
      rejectionReason: 'stale',
      distanceFromPreviousMeters: 0,
    };
  }

  const isLowQuality = newSample.accuracy > config.maxPreferredAccuracyMeters;

  // If this is the first point in segment, accept it if accuracy passed
  if (!previousAcceptedSample) {
    return {
      accepted: true,
      rejectionReason: null,
      distanceFromPreviousMeters: 0,
      isLowQuality,
    };
  }

  // Calculate physical displacement and time elapsed
  const distance = calculateHaversineDistanceMeters(
    previousAcceptedSample.latitude,
    previousAcceptedSample.longitude,
    newSample.latitude,
    newSample.longitude
  );

  const deltaSeconds = Math.max(
    0.1,
    (newSample.timestamp - previousAcceptedSample.timestamp) / 1000
  );

  // 3. Stationary noise & duplicate sample filter
  if (distance < config.duplicateDistanceTolerance && deltaSeconds < 2) {
    return {
      accepted: false,
      rejectionReason: 'duplicate',
      distanceFromPreviousMeters: 0,
    };
  }

  if (distance < config.minimumMovementMeters && deltaSeconds < 3) {
    return {
      accepted: false,
      rejectionReason: 'stationary_noise',
      distanceFromPreviousMeters: 0,
    };
  }

  // 4. Implausible jump check (impossible speed)
  const computedSpeedMps = distance / deltaSeconds;
  if (computedSpeedMps > config.maxPlausibleWalkingSpeedMps) {
    return {
      accepted: false,
      rejectionReason: 'impossible_jump',
      distanceFromPreviousMeters: distance,
    };
  }

  return {
    accepted: true,
    rejectionReason: null,
    distanceFromPreviousMeters: distance,
    isLowQuality,
  };
}
