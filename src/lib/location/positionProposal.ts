import { RelativeBusinessPosition } from '../../types';

export type HeadingSource = 'movement_vector' | 'compass' | 'manual' | 'none';
export type DirectionConfidence = 'high' | 'medium' | 'low' | 'none';

export interface DirectionProvenance {
  heading: number | null;
  source: HeadingSource;
  confidence: DirectionConfidence;
  description: string;
}

export interface DirectionResolveOptions {
  recentPoints?: Array<{ latitude: number; longitude: number; timestamp?: string | number }>;
  deviceHeading?: number | null;
  deviceSpeed?: number | null; // in m/s
  deviceAccuracy?: number | null; // in meters
}

export interface ProposedLocationResult {
  latitude: number;
  longitude: number;
  isEstimated: boolean;
  offsetHeadingDegrees: number;
  offsetMeters: number;
  headingSource: HeadingSource;
  directionConfidence: DirectionConfidence;
  confidenceAdvisory?: string;
}

/**
 * Calculates Great Circle bearing between two lat/lng points in degrees [0, 360)
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Calculates Great Circle distance between two lat/lng points in meters
 */
export function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371008.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Evaluates direction reliability following strict preference order:
 * A. Recent confirmed movement/path direction (high confidence)
 * B. Reliable device compass heading if movement unavailable (medium confidence)
 * C. Poor/uncertain direction -> confidence is 'low' or 'none' (no confident side offset)
 */
export function resolveDirectionProvenance(options?: DirectionResolveOptions): DirectionProvenance {
  if (!options) {
    return {
      heading: null,
      source: 'none',
      confidence: 'none',
      description: 'No heading or movement vector available',
    };
  }

  const { recentPoints, deviceHeading, deviceSpeed, deviceAccuracy } = options;

  // Preference A: Recent confirmed movement/path direction
  if (recentPoints && recentPoints.length >= 2) {
    const latest = recentPoints[recentPoints.length - 1];
    for (let i = recentPoints.length - 2; i >= 0; i--) {
      const prev = recentPoints[i];
      const dist = calculateDistanceMeters(prev.latitude, prev.longitude, latest.latitude, latest.longitude);
      if (dist >= 2.0) {
        const movementBearing = calculateBearing(prev.latitude, prev.longitude, latest.latitude, latest.longitude);
        return {
          heading: Math.round(movementBearing),
          source: 'movement_vector',
          confidence: 'high',
          description: `Confirmed movement direction (${dist.toFixed(1)}m vector)`,
        };
      }
    }
  }

  if (deviceSpeed && deviceSpeed >= 0.4 && recentPoints && recentPoints.length >= 2) {
    const p1 = recentPoints[recentPoints.length - 2];
    const p2 = recentPoints[recentPoints.length - 1];
    const dist = calculateDistanceMeters(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    if (dist >= 1.2) {
      const movementBearing = calculateBearing(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
      return {
        heading: Math.round(movementBearing),
        source: 'movement_vector',
        confidence: 'high',
        description: 'Movement vector while walking',
      };
    }
  }

  // Preference B: Reliable device heading if movement direction unavailable
  const hasValidHeading =
    typeof deviceHeading === 'number' && !isNaN(deviceHeading) && deviceHeading >= 0 && deviceHeading <= 360;
  const isAccuracyAcceptable = !deviceAccuracy || deviceAccuracy <= 15;

  if (hasValidHeading && isAccuracyAcceptable) {
    return {
      heading: Math.round(deviceHeading),
      source: 'compass',
      confidence: 'medium',
      description: 'Device compass orientation',
    };
  }

  // Preference C: Poor / uncertain direction
  if (hasValidHeading && deviceAccuracy && deviceAccuracy > 15) {
    return {
      heading: Math.round(deviceHeading),
      source: 'compass',
      confidence: 'low',
      description: 'Weak compass orientation (high GPS uncertainty)',
    };
  }

  return {
    heading: null,
    source: 'none',
    confidence: 'none',
    description: 'Direction uncertain (no confirmed movement or heading)',
  };
}

/**
 * Calculates a proposed business coordinate relative to the mapper's direction of travel.
 * - If direction confidence is low or none, does NOT generate a false side position.
 *   Keeps coordinate at current GPS and alerts user to "Adjust on Map".
 * - Left: 90 degrees left of heading (-90°)
 * - Right: 90 degrees right of heading (+90°)
 * - Ahead: directly along heading (0°)
 * - Unclear / Default: original current GPS coordinate (0m offset)
 */
export function proposeBusinessCoordinate(
  currentLat: number,
  currentLng: number,
  headingOrOptions: number | null | undefined | DirectionResolveOptions,
  position: RelativeBusinessPosition | null | undefined,
  offsetMeters: number = 4.0
): ProposedLocationResult {
  // Determine direction provenance
  let provenance: DirectionProvenance;
  if (typeof headingOrOptions === 'object' && headingOrOptions !== null) {
    provenance = resolveDirectionProvenance(headingOrOptions);
  } else if (typeof headingOrOptions === 'number' && !isNaN(headingOrOptions)) {
    provenance = {
      heading: headingOrOptions,
      source: 'compass',
      confidence: 'medium',
      description: 'Device compass heading',
    };
  } else {
    provenance = {
      heading: null,
      source: 'none',
      confidence: 'none',
      description: 'No heading provided',
    };
  }

  // If unclear or no position, return current GPS coordinate directly
  if (!position || position === 'unclear') {
    return {
      latitude: currentLat,
      longitude: currentLng,
      isEstimated: false,
      offsetHeadingDegrees: 0,
      offsetMeters: 0,
      headingSource: provenance.source,
      directionConfidence: provenance.confidence,
    };
  }

  // Reliable direction (High or Medium), or fallback to North (0°) if no heading provided
  const baseHeading = provenance.heading !== null && provenance.heading !== undefined ? provenance.heading : 0;
  let offsetAngle = 0;
  if (position === 'left') {
    offsetAngle = -90;
  } else if (position === 'right') {
    offsetAngle = 90;
  } else if (position === 'ahead') {
    offsetAngle = 0;
  }

  const targetHeading = (baseHeading + offsetAngle + 360) % 360;

  // Convert offset distance & heading to lat/lng displacement
  const R = 6371008.8; // Earth radius in meters
  const radHeading = (targetHeading * Math.PI) / 180;
  const radLat = (currentLat * Math.PI) / 180;

  const deltaLat = (offsetMeters * Math.cos(radHeading)) / R;
  const deltaLng = (offsetMeters * Math.sin(radHeading)) / (R * Math.cos(radLat));

  const newLat = currentLat + (deltaLat * 180) / Math.PI;
  const newLng = currentLng + (deltaLng * 180) / Math.PI;

  return {
    latitude: Number(newLat.toFixed(7)),
    longitude: Number(newLng.toFixed(7)),
    isEstimated: true,
    offsetHeadingDegrees: targetHeading,
    offsetMeters,
    headingSource: provenance.source,
    directionConfidence: provenance.confidence,
    confidenceAdvisory:
      provenance.confidence === 'none' || provenance.confidence === 'low'
        ? 'Heading was estimated/uncertain. Pin placed relative to assumed direction. Tap "Adjust on Map" if needed.'
        : undefined,
  };
}
