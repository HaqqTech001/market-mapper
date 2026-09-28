/**
 * Authoritative Native Map Component for Mobile Android & iOS
 * 
 * Directly imports react-native-maps:
 * MapView, Marker, Polyline, Polygon, Circle, PROVIDER_GOOGLE
 * 
 * Used in production native builds.
 * Metro bundler automatically resolves this file on native runtimes (.native.tsx).
 */
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Polyline, Polygon, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { LocationCoordinates, LocalPathJunction, MarketPath, LayerVisibilityState } from '../../types';

export interface NativeMapProps {
  currentLocation: LocationCoordinates | null;
  activeSegmentsCoordinates: Array<Array<{ latitude: number; longitude: number }>>;
  junctions: LocalPathJunction[];
  savedPaths: MarketPath[];
  layers: LayerVisibilityState;
  mapType?: 'standard' | 'satellite' | 'terrain' | 'offline_vector';
  isRecording: boolean;
  assignedAreaGeometry?: Array<{ latitude: number; longitude: number }>;
  marketBoundaryGeometry?: Array<{ latitude: number; longitude: number }>;
  onSelectEntity?: (entity: any) => void;
}

export const NativeMapView: React.FC<NativeMapProps> = ({
  currentLocation,
  activeSegmentsCoordinates,
  junctions,
  savedPaths,
  layers,
  mapType = 'standard',
  isRecording,
  assignedAreaGeometry,
  marketBoundaryGeometry,
  onSelectEntity,
}) => {
  const mapRef = useRef<MapView>(null);

  // Determine initial camera region using production hierarchy:
  // 1. Assigned mission/area geometry
  // 2. Market boundary geometry
  // 3. User's valid GPS location
  // 4. Default regional centroid
  const initialRegion = React.useMemo(() => {
    if (assignedAreaGeometry && assignedAreaGeometry.length > 0) {
      return {
        latitude: assignedAreaGeometry[0].latitude,
        longitude: assignedAreaGeometry[0].longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }
    if (marketBoundaryGeometry && marketBoundaryGeometry.length > 0) {
      return {
        latitude: marketBoundaryGeometry[0].latitude,
        longitude: marketBoundaryGeometry[0].longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };
    }
    if (currentLocation && currentLocation.latitude) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      };
    }
    return {
      latitude: 6.5244,
      longitude: 3.3792,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [assignedAreaGeometry, marketBoundaryGeometry, currentLocation]);

  // Track user location smoothly in camera
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      }, 500);
    }
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        mapType={mapType === 'satellite' ? 'satellite' : 'standard'}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={false}
        rotateEnabled={false}
        showsUserLocation={false}
        showsCompass={true}
        showsScale={true}
        toolbarEnabled={false}
        loadingEnabled={true}
        moveOnMarkerPress={false}
      >
        {/* Market Boundary Polygon */}
        {layers.showAreas && marketBoundaryGeometry && marketBoundaryGeometry.length > 2 && (
          <Polygon
            coordinates={marketBoundaryGeometry}
            strokeColor="#10b981"
            fillColor="rgba(16, 185, 129, 0.08)"
            strokeWidth={2}
          />
        )}

        {/* Assigned Mission / Sector Area */}
        {layers.showAreas && assignedAreaGeometry && assignedAreaGeometry.length > 2 && (
          <Polygon
            coordinates={assignedAreaGeometry}
            strokeColor="#3b82f6"
            fillColor="rgba(59, 130, 246, 0.12)"
            strokeWidth={2}
            lineDashPattern={[4, 4]}
          />
        )}

        {/* Saved Prior Paths (Multi-segment support) */}
        {layers.showPaths &&
          savedPaths.map((p) => {
            const segs = p.segments && p.segments.length > 0
              ? p.segments.map((seg) => seg.map(([lon, lat]) => ({ latitude: lat, longitude: lon })))
              : [p.rawPoints.map((pt) => ({ latitude: pt.latitude, longitude: pt.longitude }))];

            return segs.map((coords, sIdx) => (
              <Polyline
                key={`saved_${p.id}_${sIdx}`}
                coordinates={coords}
                strokeColor="#64748b"
                strokeWidth={3}
                lineDashPattern={[2, 2]}
              />
            ));
          })}

        {/* Active Recording Multi-Segment Polylines (Each segment separate - NO FALSE CONNECTORS) */}
        {activeSegmentsCoordinates.map((segmentCoords, sIdx) => (
          <Polyline
            key={`active_seg_${sIdx}`}
            coordinates={segmentCoords}
            strokeColor="#10b981"
            strokeWidth={4}
          />
        ))}

        {/* Active Operational Junction Markers */}
        {layers.showJunctions &&
          junctions
            .filter((j) => !j.isExcluded)
            .map((j) => (
              <Marker
                key={j.id}
                coordinate={{ latitude: j.latitude, longitude: j.longitude }}
                title={j.operationalLabel}
                description={j.displayName || `Seq #${j.sequenceNumber}`}
                pinColor="#f59e0b"
                onPress={() => onSelectEntity?.(j)}
              />
            ))}

        {/* Mapper Current Position & Accuracy Halo */}
        {currentLocation && (
          <>
            <Circle
              center={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              radius={Math.max(2, currentLocation.accuracy)}
              fillColor="rgba(16, 185, 129, 0.18)"
              strokeColor="rgba(16, 185, 129, 0.5)"
              strokeWidth={1}
            />
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              flat
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.userMarkerDot} />
            </Marker>
          </>
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  userMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});

export default NativeMapView;
