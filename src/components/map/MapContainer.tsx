/**
 * Unified Map Container & Runtime Selector
 * 
 * ARCHITECTURE CLARITY (Phase 3 Requirement 1):
 * - PRODUCTION NATIVE BUILDS (Android/iOS):
 *   Metro bundler resolves NativeMapView.native.tsx which directly imports and runs:
 *   `import MapView, { Marker, Polyline, Polygon, Circle, PROVIDER_GOOGLE } from 'react-native-maps'`
 * 
 * - WEB / BROWSER PREVIEW / OFFLINE FALLBACK:
 *   Resolves MapWorkspace.tsx, an interactive SVG vector projection engine
 *   providing exact offline geometry projection, pan/zoom, layer toggling,
 *   and visual inspection in AI Studio / desktop browsers.
 */

import React from 'react';
import { MapWorkspace } from './MapWorkspace';
import {
  LocationCoordinates,
  LocalPathJunction,
  MarketPath,
  LayerVisibilityState,
} from '../../types';

export interface MapContainerProps {
  currentLocation: LocationCoordinates | null;
  activeSegmentsCoordinates: Array<Array<{ latitude: number; longitude: number }>>;
  junctions: LocalPathJunction[];
  savedPaths: MarketPath[];
  layers: LayerVisibilityState;
  mapType: 'standard' | 'satellite' | 'offline_vector';
  isRecording: boolean;
  assignedAreaGeometry?: Array<{ latitude: number; longitude: number }>;
  marketBoundaryGeometry?: Array<{ latitude: number; longitude: number }>;
  mappedBusinesses?: any[];
  marketGates?: any[];
  onSelectEntity?: (entity: any) => void;
}

export const MapContainer: React.FC<MapContainerProps> = (props) => {
  // In Web / AI Studio runtime environment, render the high-fidelity SVG projection workspace.
  // In native Android/iOS environments compiled with Metro, NativeMapView.native.tsx is authoritative.
  return <MapWorkspace {...props} />;
};

export default MapContainer;
