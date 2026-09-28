import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Navigation,
  Compass,
  Plus,
  Minus,
  Crosshair,
  Store,
  GitBranch,
  Flag,
  Wrench,
  AlertCircle,
  Eye,
  Info,
  Layers,
  MapPin,
} from 'lucide-react';
import {
  LocationCoordinates,
  LocalPathJunction,
  RawGpsSample,
  LayerVisibilityState,
  MarketPath,
} from '../../types';
import { DEV_FIXTURE_MARKET } from '../../fixtures/devMarketData';

export interface MapWorkspaceProps {
  currentLocation: LocationCoordinates | null;
  activeSegmentsCoordinates: Array<Array<{ latitude: number; longitude: number }>>;
  junctions: LocalPathJunction[];
  savedPaths: MarketPath[];
  layers: LayerVisibilityState;
  mapType: 'standard' | 'satellite' | 'offline_vector';
  isRecording: boolean;
  assignedAreaGeometry?: Array<{ latitude: number; longitude: number }>;
  marketBoundaryGeometry?: Array<{ latitude: number; longitude: number }>;
  mappedBusinesses?: Array<{
    id: string;
    operationalLabel?: string;
    name?: string;
    stallNumber?: string;
    activity?: string;
    businessType?: string;
    latitude: number;
    longitude: number;
    revisitNeeded?: boolean;
    revisitReason?: string;
    completenessScore?: number;
  }>;
  marketGates?: Array<{ id: string; name: string; latitude: number; longitude: number }>;
  selectedEntityId?: string | null;
  onSelectEntity?: (entity: any) => void;
}

export const MapWorkspace: React.FC<MapWorkspaceProps> = ({
  currentLocation,
  activeSegmentsCoordinates,
  junctions,
  savedPaths,
  layers,
  mapType,
  isRecording,
  assignedAreaGeometry,
  marketBoundaryGeometry,
  mappedBusinesses,
  marketGates,
  selectedEntityId,
  onSelectEntity,
}) => {
  // Production Camera Position Resolution Hierarchy:
  // 1. Active assigned area/mission geometry
  // 2. Active market boundary centroid
  // 3. Mapper valid current location
  // 4. Last locally saved viewport
  // 5. Dev fallback coordinate ONLY in DEV mode
  const initialResolvedCenter = useMemo(() => {
    if (assignedAreaGeometry && assignedAreaGeometry.length > 0) {
      return { lat: assignedAreaGeometry[0].latitude, lng: assignedAreaGeometry[0].longitude };
    }
    if (marketBoundaryGeometry && marketBoundaryGeometry.length > 0) {
      return { lat: marketBoundaryGeometry[0].latitude, lng: marketBoundaryGeometry[0].longitude };
    }
    if (currentLocation && typeof currentLocation.latitude === 'number' && !isNaN(currentLocation.latitude)) {
      return { lat: currentLocation.latitude, lng: currentLocation.longitude };
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('mm_last_viewport');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.lat && parsed.lng) return { lat: parsed.lat, lng: parsed.lng };
        }
      } catch {}
    }
    if (process.env.NODE_ENV !== 'production') {
      return DEV_FIXTURE_MARKET.center;
    }
    return { lat: 0, lng: 0 };
  }, [assignedAreaGeometry, marketBoundaryGeometry, currentLocation]);

  // Isolate fallback demo boundaries to DEV mode only
  const activeMarketBoundary = useMemo(() => {
    if (marketBoundaryGeometry && marketBoundaryGeometry.length > 0) {
      return marketBoundaryGeometry;
    }
    return process.env.NODE_ENV !== 'production' ? DEV_FIXTURE_MARKET.boundary : [];
  }, [marketBoundaryGeometry]);

  const activeAssignedArea = useMemo(() => {
    if (assignedAreaGeometry && assignedAreaGeometry.length > 0) {
      return assignedAreaGeometry;
    }
    return process.env.NODE_ENV !== 'production' ? DEV_FIXTURE_MARKET.assignedSector : [];
  }, [assignedAreaGeometry]);

  const activeBusinesses = useMemo(() => {
    if (mappedBusinesses && mappedBusinesses.length > 0) {
      return mappedBusinesses;
    }
    return process.env.NODE_ENV !== 'production' ? DEV_FIXTURE_MARKET.businesses : [];
  }, [mappedBusinesses]);

  const activeGates = useMemo(() => {
    if (marketGates && marketGates.length > 0) {
      return marketGates;
    }
    return process.env.NODE_ENV !== 'production' ? DEV_FIXTURE_MARKET.gates : [];
  }, [marketGates]);

  // Viewport transformation: center, zoom, pan offset
  const [zoom, setZoom] = useState(18.2); // Map zoom level (approx 15.0 to 21.0)
  const [center, setCenter] = useState<{ lat: number; lng: number }>(initialResolvedCenter);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFollowingLocation, setIsFollowingLocation] = useState(true);

  // Drag & Pinch interaction state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchPinchDistRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Update container dimensions with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width || 800,
          height: entry.contentRect.height || 600,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Follow location effect
  useEffect(() => {
    if (
      isFollowingLocation &&
      currentLocation &&
      typeof currentLocation.latitude === 'number' &&
      !isNaN(currentLocation.latitude) &&
      typeof currentLocation.longitude === 'number' &&
      !isNaN(currentLocation.longitude)
    ) {
      setCenter({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
      });
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isFollowingLocation, currentLocation]);

  // Coordinate projection: WGS84 Lat/Lng to Container SVG X/Y
  const scale = useMemo(() => {
    return Math.pow(2, zoom) * 2.2;
  }, [zoom]);

  const projectCoord = (lat?: number | null, lng?: number | null) => {
    const validCenterLat =
      typeof center?.lat === 'number' && !isNaN(center.lat) ? center.lat : initialResolvedCenter.lat;
    const validCenterLng =
      typeof center?.lng === 'number' && !isNaN(center.lng) ? center.lng : initialResolvedCenter.lng;

    const validLat = typeof lat === 'number' && !isNaN(lat) ? lat : validCenterLat;
    const validLng = typeof lng === 'number' && !isNaN(lng) ? lng : validCenterLng;

    const dLat = validLat - validCenterLat;
    const dLng = validLng - validCenterLng;

    // Mercator approximation for small local market distances
    const cosLat = Math.cos((validCenterLat * Math.PI) / 180);
    const validScale = typeof scale === 'number' && !isNaN(scale) && scale > 0 ? scale : 1000;
    const width = containerSize?.width || 800;
    const height = containerSize?.height || 600;
    const x = width / 2 + dLng * validScale * cosLat + (panOffset.x || 0);
    const y = height / 2 - dLat * validScale + (panOffset.y || 0);

    return {
      x: isNaN(x) ? width / 2 : x,
      y: isNaN(y) ? height / 2 : y,
    };
  };

  // Convert polyline coordinates array into SVG path data "M x1 y1 L x2 y2..."
  const coordinatesToPathString = (coords: Array<{ latitude: number; longitude: number }>) => {
    if (!coords || coords.length < 2) return '';
    const validCoords = coords.filter(
      (c) =>
        c &&
        typeof c.latitude === 'number' &&
        !isNaN(c.latitude) &&
        typeof c.longitude === 'number' &&
        !isNaN(c.longitude)
    );
    if (validCoords.length < 2) return '';
    const pts = validCoords.map((c) => projectCoord(c.latitude, c.longitude));
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }
    return d;
  };

  // Convert polygon coordinates to SVG polygon points string
  const polygonToPointsString = (coords: Array<{ latitude: number; longitude: number }>) => {
    if (!coords) return '';
    return coords
      .filter(
        (c) =>
          c &&
          typeof c.latitude === 'number' &&
          !isNaN(c.latitude) &&
          typeof c.longitude === 'number' &&
          !isNaN(c.longitude)
      )
      .map((c) => {
        const pt = projectCoord(c.latitude, c.longitude);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Helper for touch distance (Pinch-to-zoom)
  const getTouchDistance = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return 0;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Mouse / Touch Drag handlers for 1-Finger Pan & 2-Finger Pinch-to-Zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setIsFollowingLocation(false);
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y,
      };
      touchPinchDistRef.current = null;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      touchPinchDistRef.current = getTouchDistance(e);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      setIsFollowingLocation(false);
      setPanOffset({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    } else if (e.touches.length === 2 && touchPinchDistRef.current !== null) {
      const currentDist = getTouchDistance(e);
      const diff = currentDist - touchPinchDistRef.current;
      if (Math.abs(diff) > 5) {
        setZoom((z) => Math.min(Math.max(z + (diff > 0 ? 0.04 : -0.04), 15.0), 21.0));
        touchPinchDistRef.current = currentDist;
      }
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchPinchDistRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoom((z) => Math.min(Math.max(z + delta, 15.0), 21.0));
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 0.5, 20.5));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 0.5, 15.5));
  };

  const handleCenterOnUser = () => {
    setIsFollowingLocation(true);
    if (
      currentLocation &&
      typeof currentLocation.latitude === 'number' &&
      !isNaN(currentLocation.latitude) &&
      typeof currentLocation.longitude === 'number' &&
      !isNaN(currentLocation.longitude)
    ) {
      setCenter({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
      });
      setPanOffset({ x: 0, y: 0 });
    } else {
      setCenter({
        lat: initialResolvedCenter.lat,
        lng: initialResolvedCenter.lng,
      });
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // User location projection & accuracy halo radius
  const userLat =
    currentLocation &&
    typeof currentLocation.latitude === 'number' &&
    !isNaN(currentLocation.latitude)
      ? currentLocation.latitude
      : initialResolvedCenter.lat;
  const userLng =
    currentLocation &&
    typeof currentLocation.longitude === 'number' &&
    !isNaN(currentLocation.longitude)
      ? currentLocation.longitude
      : initialResolvedCenter.lng;

  const userScreenPt = projectCoord(userLat, userLng);

  const rawAccuracy = currentLocation?.accuracy;
  const accuracyRadiusPixels =
    typeof rawAccuracy === 'number' && !isNaN(rawAccuracy) && rawAccuracy > 0
      ? (rawAccuracy / 111111) * scale
      : 18;
  const safeAccuracyRadius = isNaN(accuracyRadiusPixels)
    ? 18
    : Math.max(14, Math.min(accuracyRadiusPixels, 140));

  // Progressive Disclosure Zoom Level Buckets:
  // - isNearZoom: zoom >= 17.5 (show high-contrast labels and badges)
  // - isDetailedZoom: zoom >= 16.8 (disclose all individual business pins off the path line)
  // - wide zoom (< 16.8): cluster nearby markers to prevent dense-market clutter
  const isNearZoom = zoom >= 17.5;
  const isDetailedZoom = zoom >= 16.8;
  const isMediumZoom = zoom >= 16.0;

  // Dense-Market Progressive Disclosure / Spatial Clustering:
  // At wide zoom (< 16.8), cluster adjacent businesses into touchable count badges.
  // At detailed zoom (>= 16.8), every business is rendered at its authentic offset coordinate.
  const clusteredBusinesses = useMemo(() => {
    if (isDetailedZoom || activeBusinesses.length === 0) {
      return null;
    }

    type BusinessCluster = {
      id: string;
      items: typeof activeBusinesses;
      x: number;
      y: number;
      centerLat: number;
      centerLng: number;
      hasRevisit: boolean;
      isSelected: boolean;
    };

    const clusters: BusinessCluster[] = [];
    const thresholdPixels = 38;

    for (const biz of activeBusinesses) {
      const pt = projectCoord(biz.latitude, biz.longitude);
      if (
        pt.x < -40 ||
        pt.x > (containerSize?.width || 800) + 40 ||
        pt.y < -40 ||
        pt.y > (containerSize?.height || 600) + 40
      ) {
        continue;
      }

      let merged = false;
      for (const cl of clusters) {
        const dist = Math.hypot(cl.x - pt.x, cl.y - pt.y);
        if (dist < thresholdPixels) {
          cl.items.push(biz);
          cl.x = (cl.x * (cl.items.length - 1) + pt.x) / cl.items.length;
          cl.y = (cl.y * (cl.items.length - 1) + pt.y) / cl.items.length;
          cl.centerLat = (cl.centerLat * (cl.items.length - 1) + biz.latitude) / cl.items.length;
          cl.centerLng = (cl.centerLng * (cl.items.length - 1) + biz.longitude) / cl.items.length;
          if (biz.revisitNeeded) cl.hasRevisit = true;
          if (selectedEntityId === biz.id) cl.isSelected = true;
          merged = true;
          break;
        }
      }

      if (!merged) {
        clusters.push({
          id: `cluster_${biz.id}`,
          items: [biz],
          x: pt.x,
          y: pt.y,
          centerLat: biz.latitude,
          centerLng: biz.longitude,
          hasRevisit: Boolean(biz.revisitNeeded),
          isSelected: selectedEntityId === biz.id,
        });
      }
    }

    return clusters;
  }, [isDetailedZoom, activeBusinesses, zoom, center, panOffset, scale, containerSize, selectedEntityId]);

  return (
    <div
      ref={containerRef}
      id="map-workspace-viewport"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className={`relative w-full h-full select-none overflow-hidden cursor-grab active:cursor-grabbing ${
        mapType === 'satellite'
          ? 'bg-[#1e293b]'
          : mapType === 'offline_vector'
          ? 'bg-[#e2e8f0]'
          : 'bg-[#f8fafc]'
      }`}
    >
      {/* Basemap Status Watermark */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-2 shadow-sm">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              mapType === 'offline_vector' ? 'bg-indigo-600' : 'bg-emerald-600'
            }`}
          />
          <span className="capitalize">
            {mapType === 'offline_vector' ? 'Offline Vector Geometry' : `${mapType} Daylight Basemap`}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">z{zoom.toFixed(1)}</span>
        </div>
      </div>

      {/* Map Interactive Canvas */}
      <svg
        className="w-full h-full pointer-events-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Outdoor Daylight High-Contrast Vector Grid */}
          <pattern id="market-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeOpacity="0.8" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#market-grid-pattern)" />

        {/* 1. Market Boundary Polygon Layer (High-Contrast Emerald Dash) */}
        {layers.showAreas && (
          <>
            {/* Outer Market Boundary */}
            {activeMarketBoundary.length > 2 && (
              <polygon
                points={polygonToPointsString(activeMarketBoundary)}
                fill="rgba(5, 150, 105, 0.08)"
                stroke="#047857"
                strokeWidth="3"
                strokeDasharray="8,5"
              />
            )}

            {/* Assigned Area Boundary (High-Contrast Blue Dash) */}
            {activeAssignedArea.length > 2 && (
              <polygon
                points={polygonToPointsString(activeAssignedArea)}
                fill="rgba(37, 99, 235, 0.10)"
                stroke="#1d4ed8"
                strokeWidth="2.5"
                strokeDasharray="6,4"
              />
            )}
          </>
        )}

        {/* 2. Existing Saved Paths Layer (Dark Emerald with High-Contrast White Casing) */}
        {layers.showPaths && isMediumZoom && (
          <g id="saved-paths-layer">
            {savedPaths.map((sp) => {
              const isSelected = selectedEntityId === sp.id;
              if (sp.segments && sp.segments.length > 0) {
                return sp.segments.map((seg, sIdx) => {
                  const segCoords = seg.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
                  const pathD = coordinatesToPathString(segCoords);
                  if (!pathD) return null;
                  return (
                    <g key={`${sp.id}_${sIdx}`}>
                      {/* White Casing for Contrast */}
                      <path
                        d={pathD}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? '9' : '6'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        opacity="0.9"
                      />
                      {/* Core Line */}
                      <path
                        d={pathD}
                        stroke={isSelected ? '#2563eb' : '#047857'}
                        strokeWidth={isSelected ? '5' : '3.5'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        className="cursor-pointer hover:stroke-emerald-600 pointer-events-auto transition-colors"
                        onClick={() => {
                          if (onSelectEntity) {
                            onSelectEntity({
                              type: 'path',
                              id: sp.id,
                              title: sp.name,
                              subtitle: `${Math.round(sp.distanceMeters)}m · ${sp.junctionsCount || 0} junctions`,
                              details: `Saved Market Path (${sp.durationSeconds ? Math.round(sp.durationSeconds / 60) : 0} mins). Tap to inspect nodes and junctions.`,
                              lat: segCoords[0]?.latitude || 0,
                              lng: segCoords[0]?.longitude || 0,
                            });
                          }
                        }}
                      />
                    </g>
                  );
                });
              }
              const pts = sp.rawPoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
              const pathD = coordinatesToPathString(pts);
              if (!pathD) return null;
              return (
                <g key={sp.id}>
                  <path
                    d={pathD}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? '9' : '6'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity="0.9"
                  />
                  <path
                    d={pathD}
                    stroke={isSelected ? '#2563eb' : '#047857'}
                    strokeWidth={isSelected ? '5' : '3.5'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    className="cursor-pointer hover:stroke-emerald-600 pointer-events-auto transition-colors"
                    onClick={() => {
                      if (onSelectEntity) {
                        onSelectEntity({
                          type: 'path',
                          id: sp.id,
                          title: sp.name,
                          subtitle: `${Math.round(sp.distanceMeters)}m · ${sp.junctionsCount || 0} junctions`,
                          details: `Saved Market Path (${sp.durationSeconds ? Math.round(sp.durationSeconds / 60) : 0} mins). Tap to inspect nodes and junctions.`,
                          lat: pts[0]?.latitude || 0,
                          lng: pts[0]?.longitude || 0,
                        });
                      }
                    }}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* 3. Currently Recording Path Layer (Vivid High-Visibility Orange/Amber) */}
        <g id="active-recording-path-layer">
          {activeSegmentsCoordinates.map((segCoords, segIdx) => {
            const pathD = coordinatesToPathString(segCoords);
            if (!pathD) return null;
            return (
              <g key={`active_seg_${segIdx}`}>
                {/* Outer high-contrast casing */}
                <path
                  d={pathD}
                  stroke="#ffffff"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity="0.95"
                />
                {/* Core crisp recorded polyline */}
                <path
                  d={pathD}
                  stroke="#ea580c"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>
            );
          })}
        </g>

        {/* 4. Junction Nodes Layer (High-Contrast Amber with Solid Text Halos & Branch Indicators) */}
        {layers.showJunctions && isMediumZoom && (
          <g id="junctions-layer">
            {junctions.map((junc) => {
              const pt = projectCoord(junc.latitude, junc.longitude);
              const isSelected = selectedEntityId === junc.id;
              const unmappedBranchesCount = junc.branches
                ? junc.branches.filter((b) => b.status === 'unmapped' || b.status === 'in_progress').length
                : 0;

              return (
                <g
                  key={junc.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectEntity) {
                      onSelectEntity({
                        type: 'junction',
                        id: junc.id,
                        title: junc.operationalLabel,
                        subtitle: junc.displayName || `Intersection Node #${junc.sequenceNumber}`,
                        details: junc.branches && junc.branches.length > 0
                          ? `${unmappedBranchesCount} corridor(s) to explore · ${junc.branches.length - unmappedBranchesCount} mapped`
                          : `Junction node at ${junc.latitude.toFixed(5)}°, ${junc.longitude.toFixed(5)}°`,
                        lat: junc.latitude,
                        lng: junc.longitude,
                        junction: junc,
                      });
                    }
                  }}
                  className="cursor-pointer group"
                >
                  {/* Selection Ring */}
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="18"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="3.5"
                      className="animate-pulse"
                    />
                  )}
                  {/* Core Node Circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? '12' : '9.5'}
                    fill="#d97706"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="group-hover:scale-125 transition-transform drop-shadow"
                  />
                  {/* Inner Target Point */}
                  <circle cx={pt.x} cy={pt.y} r="3" fill="#ffffff" />

                  {/* Unmapped Branch Counter Badge */}
                  {unmappedBranchesCount > 0 && (
                    <g transform={`translate(${pt.x + 8}, ${pt.y - 12})`}>
                      <circle cx="6" cy="6" r="7" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                      <text
                        x="6"
                        y="9.5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="900"
                        className="pointer-events-none font-mono"
                      >
                        {unmappedBranchesCount}
                      </text>
                    </g>
                  )}

                  {/* Operational Label */}
                  <text
                    x={pt.x}
                    y={pt.y - 14}
                    textAnchor="middle"
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth="3.5"
                    paintOrder="stroke"
                    fontSize="11"
                    fontWeight="800"
                    className="pointer-events-none font-mono"
                  >
                    {junc.operationalLabel}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* 5. User Current Location Marker & Heading Cone (Unmistakably Blue) */}
        <g id="user-location-marker">
          {/* GPS Accuracy Circle Halo */}
          <circle
            cx={userScreenPt.x}
            cy={userScreenPt.y}
            r={safeAccuracyRadius}
            fill="rgba(37, 99, 235, 0.18)"
            stroke="#2563eb"
            strokeWidth="1.5"
            strokeDasharray="4,3"
          />

          {/* Heading Direction Cone */}
          {currentLocation?.heading !== null &&
            currentLocation?.heading !== undefined &&
            !isNaN(currentLocation.heading) && (
              <g transform={`rotate(${currentLocation.heading}, ${userScreenPt.x}, ${userScreenPt.y})`}>
                <path
                  d={`M ${userScreenPt.x - 14} ${userScreenPt.y - 24} L ${userScreenPt.x} ${userScreenPt.y - 38} L ${userScreenPt.x + 14} ${userScreenPt.y - 24} Z`}
                  fill="rgba(37, 99, 235, 0.6)"
                />
              </g>
            )}

          {/* Pulsing Locator Dot */}
          <circle
            cx={userScreenPt.x}
            cy={userScreenPt.y}
            r="12"
            fill="#2563eb"
            stroke="#ffffff"
            strokeWidth="3"
            className="drop-shadow-md"
          />
          <circle
            cx={userScreenPt.x}
            cy={userScreenPt.y}
            r="5"
            fill="#ffffff"
          />
        </g>
      </svg>

      {/* 6. HTML Entity Pins (Gates & Businesses with Dense-Market Progressive Disclosure) */}
      {layers.showBusinesses && (
        <div className="absolute inset-0 pointer-events-none">
          {/* A. Wide Zoom (< 16.8): Clustered Progressive Disclosure */}
          {!isDetailedZoom &&
            clusteredBusinesses &&
            clusteredBusinesses.map((cluster) => {
              if (cluster.items.length === 1) {
                const biz = cluster.items[0];
                const displayName = biz.name || biz.operationalLabel || 'Stall ' + (biz.stallNumber || '');
                const isRevisit = Boolean(biz.revisitNeeded);
                const isSelected = selectedEntityId === biz.id;
                return (
                  <button
                    key={biz.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectEntity) {
                        onSelectEntity({
                          type: 'business',
                          id: biz.id,
                          title: displayName,
                          subtitle: biz.stallNumber || biz.operationalLabel,
                          details: `Operational Business ${biz.operationalLabel || ''} (${biz.businessType || 'shop'}) - ${biz.activity || 'goods'}${isRevisit ? ' • [Flagged for Revisit]' : ''}`,
                          stability: isRevisit ? 'needs_revisit' : 'verified',
                          lat: biz.latitude,
                          lng: biz.longitude,
                          operationalLabel: biz.operationalLabel,
                          revisitNeeded: isRevisit,
                          revisitReason: biz.revisitReason,
                          completenessScore: biz.completenessScore,
                        });
                      }
                    }}
                    style={{ left: `${cluster.x}px`, top: `${cluster.y}px` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group cursor-pointer focus:outline-none flex flex-col items-center min-w-[44px] min-h-[44px] justify-center transition-transform ${
                      isSelected ? 'scale-125 z-40' : 'z-20 hover:scale-110'
                    }`}
                    title={`${displayName} (${biz.operationalLabel || ''})`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md ${
                        isSelected
                          ? 'bg-blue-700 text-white border-2 border-white ring-2 ring-blue-500'
                          : isRevisit
                          ? 'bg-amber-600 text-white border-2 border-dashed border-white'
                          : 'bg-emerald-700 text-white border-2 border-white'
                      }`}
                    >
                      {isRevisit ? <AlertCircle className="w-3.5 h-3.5 text-white" /> : <Store className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </button>
                );
              }

              // Multi-item cluster badge
              return (
                <button
                  key={cluster.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFollowingLocation(false);
                    setCenter({ lat: cluster.centerLat, lng: cluster.centerLng });
                    setPanOffset({ x: 0, y: 0 });
                    setZoom(18.2);
                  }}
                  style={{ left: `${cluster.x}px`, top: `${cluster.y}px` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group cursor-pointer focus:outline-none flex items-center justify-center transition-transform hover:scale-110 z-20 min-w-[44px] min-h-[44px]"
                  title={`${cluster.items.length} dense market businesses. Tap to zoom in.`}
                >
                  <div
                    className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md border-2 border-white font-bold text-xs ${
                      cluster.isSelected
                        ? 'bg-blue-700 text-white ring-4 ring-blue-400'
                        : cluster.hasRevisit
                        ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                        : 'bg-emerald-800 text-white ring-2 ring-emerald-500'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>{cluster.items.length}</span>
                  </div>
                </button>
              );
            })}

          {/* B. Close / Detailed Zoom (>= 16.8): Individual Businesses at True Coordinates (Never forced onto path line) */}
          {isDetailedZoom &&
            activeBusinesses.map((biz) => {
              const pt = projectCoord(biz.latitude, biz.longitude);
              if (pt.x < -40 || pt.x > containerSize.width + 40 || pt.y < -40 || pt.y > containerSize.height + 40) {
                return null;
              }
              const displayName = biz.name || biz.operationalLabel || 'Stall ' + (biz.stallNumber || '');
              const isRevisit = Boolean(biz.revisitNeeded);
              const isSelected = selectedEntityId === biz.id;

              return (
                <button
                  key={biz.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectEntity) {
                      onSelectEntity({
                        type: 'business',
                        id: biz.id,
                        title: displayName,
                        subtitle: biz.stallNumber || biz.operationalLabel,
                        details: `Operational Business ${biz.operationalLabel || ''} (${biz.businessType || 'shop'}) - ${biz.activity || 'goods'}${isRevisit ? ' • [Flagged for Revisit]' : ''}`,
                        stability: isRevisit ? 'needs_revisit' : 'verified',
                        lat: biz.latitude,
                        lng: biz.longitude,
                        operationalLabel: biz.operationalLabel,
                        revisitNeeded: isRevisit,
                        revisitReason: biz.revisitReason,
                        completenessScore: biz.completenessScore,
                      });
                    }
                  }}
                  style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group cursor-pointer focus:outline-none flex flex-col items-center min-w-[44px] min-h-[44px] justify-center transition-transform ${
                    isSelected ? 'scale-125 z-40' : 'z-20 hover:scale-110'
                  }`}
                  title={`${displayName} (${biz.operationalLabel || ''})`}
                >
                  {/* Selection Halo Ring */}
                  {isSelected && (
                    <div className="absolute -inset-2 rounded-full border-4 border-blue-600 bg-blue-500/20 animate-pulse pointer-events-none" />
                  )}

                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                      isSelected
                        ? 'bg-blue-700 text-white border-2 border-white ring-4 ring-blue-500'
                        : isRevisit
                        ? 'bg-amber-600 text-white border-2 border-dashed border-white ring-2 ring-amber-500'
                        : 'bg-emerald-700 text-white border-2 border-white'
                    }`}
                  >
                    {isRevisit ? (
                      <AlertCircle className="w-4 h-4 text-white" />
                    ) : (
                      <Store className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Operational Label Badge (High-Contrast Solid Chip) */}
                  {isNearZoom && biz.operationalLabel && (
                    <span
                      className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shadow-sm whitespace-nowrap ${
                        isSelected
                          ? 'bg-blue-900 text-white border border-blue-400'
                          : isRevisit
                          ? 'bg-amber-900 text-amber-100 border border-amber-600'
                          : 'bg-slate-900 text-white border border-slate-700'
                      }`}
                    >
                      {biz.operationalLabel}
                    </span>
                  )}

                  {/* Tooltip on hover */}
                  <span className="absolute bottom-full mb-1 px-2 py-1 rounded bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {displayName}
                  </span>
                </button>
              );
            })}

          {/* Market Gates */}
          {layers.showGates &&
            activeGates.map((gate) => {
              const pt = projectCoord(gate.latitude, gate.longitude);
              const isSelected = selectedEntityId === gate.id;
              return (
                <div
                  key={gate.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectEntity) {
                      onSelectEntity({
                        type: 'gate',
                        id: gate.id,
                        title: gate.name,
                        subtitle: 'Market Entrance / Access Point',
                        lat: gate.latitude,
                        lng: gate.longitude,
                      });
                    }
                  }}
                  style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-full shadow-md text-xs font-bold cursor-pointer transition-transform ${
                    isSelected
                      ? 'bg-blue-700 text-white border-2 border-white ring-4 ring-blue-400 scale-110 z-30'
                      : 'bg-indigo-900 text-white border border-white hover:scale-105 z-10'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-indigo-200" />
                  <span>{gate.name}</span>
                </div>
              );
            })}
        </div>
      )}

      {/* Floating Map Navigation & Camera Controls (44px+ touch targets) */}
      <div className="absolute right-4 top-16 z-20 flex flex-col gap-2.5 pointer-events-auto">
        {/* Center / Follow Toggle */}
        <button
          onClick={handleCenterOnUser}
          className={`w-11 h-11 rounded-xl border shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer ${
            isFollowingLocation
              ? 'bg-blue-600 border-blue-700 text-white'
              : 'bg-white/95 border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title={isFollowingLocation ? 'Following GPS Location' : 'Free Pan Mode — Tap to re-center'}
          aria-label="Center Location"
        >
          <Crosshair className="w-5 h-5" />
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="w-11 h-11 rounded-xl bg-white/95 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
          title="Zoom In (Secondary to 2-finger pinch)"
          aria-label="Zoom In"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="w-11 h-11 rounded-xl bg-white/95 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
          title="Zoom Out (Secondary to 2-finger pinch)"
          aria-label="Zoom Out"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
