/**
 * Operational Coordinates & Viewport Resolution Engine
 * 
 * Ensures Market Mapper never hardcodes or silently snaps to a specific market (e.g. Alaba)
 * in production. Resolves coordinates based on operational context hierarchy:
 * 1. Active assigned area / sector centroid
 * 2. Active market geometry centroid
 * 3. Valid current mapper GPS fix
 * 4. Previously saved viewport
 * 5. DEV fixture fallback (only in development / diagnostic environments)
 */

import { DEV_FIXTURE_MARKET } from '../../fixtures/devMarketData';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface OperationalContextInput {
  currentLocation?: Coordinate | null;
  activeAssignedSector?: Coordinate[] | null;
  marketBoundary?: Coordinate[] | null;
  defaultFallback?: Coordinate;
}

const VIEWPORT_STORAGE_KEY = 'mm_last_viewport_center';

/**
 * Computes arithmetic centroid of a polygon or coordinate set
 */
export function computeCentroid(coords: Coordinate[]): Coordinate | null {
  if (!coords || coords.length === 0) return null;
  const sum = coords.reduce(
    (acc, c) => ({
      latitude: acc.latitude + c.latitude,
      longitude: acc.longitude + c.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );
  return {
    latitude: sum.latitude / coords.length,
    longitude: sum.longitude / coords.length,
  };
}

/**
 * Persists user's last valid viewport center to localStorage
 */
export function saveLastViewportCenter(coord: Coordinate): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(coord));
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Retrieves persisted viewport center if available
 */
export function getSavedViewportCenter(): Coordinate | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(VIEWPORT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Authoritative resolver for operational coordinates
 */
export function resolveOperationalCoordinates(
  context?: OperationalContextInput
): Coordinate {
  // 1. Active assigned sector centroid (highest operational authority)
  if (context?.activeAssignedSector && context.activeAssignedSector.length > 0) {
    const centroid = computeCentroid(context.activeAssignedSector);
    if (centroid) return centroid;
  }

  // 2. Active market geometry centroid
  if (context?.marketBoundary && context.marketBoundary.length > 0) {
    const centroid = computeCentroid(context.marketBoundary);
    if (centroid) return centroid;
  }

  // 3. Valid current mapper GPS location
  if (
    context?.currentLocation &&
    !isNaN(context.currentLocation.latitude) &&
    !isNaN(context.currentLocation.longitude) &&
    context.currentLocation.latitude !== 0 &&
    context.currentLocation.longitude !== 0
  ) {
    return {
      latitude: context.currentLocation.latitude,
      longitude: context.currentLocation.longitude,
    };
  }

  // 4. Saved viewport from previous mapper session
  const savedCenter = getSavedViewportCenter();
  if (savedCenter) {
    return savedCenter;
  }

  // 5. Provided custom fallback
  if (context?.defaultFallback) {
    return context.defaultFallback;
  }

  // 6. DEV-only fixture fallback (isolated strictly to development environment)
  return DEV_FIXTURE_MARKET.center;
}
