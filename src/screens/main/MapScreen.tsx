import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Header, Button, Badge, Modal, Input } from '../../components/ui';
import {
  MapPin,
  Navigation,
  Layers,
  Plus,
  Compass,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Store,
  Info,
  Radio,
  Camera,
  X,
  ShieldAlert,
  Eye,
  Check,
  GitBranch,
} from 'lucide-react';
import { BusinessRepository, PathRepository, FieldIssueRepository } from '../../db';
import { usePathRecording } from '../../hooks/usePathRecording';
import { MapWorkspace } from '../../components/map/MapWorkspace';
import { RecordingHud } from '../../components/map/RecordingHud';
import { PathCorrectionSheet } from '../../components/map/PathCorrectionSheet';
import { PathReviewView } from '../../components/map/PathReviewView';
import { UnfinishedSessionModal } from '../../components/map/UnfinishedSessionModal';
import { GpsDiagnosticOverlay } from '../../components/map/GpsDiagnosticOverlay';
import { LayersModal } from '../../components/map/LayersModal';
import { BusinessCaptureModal } from '../../components/capture/BusinessCaptureModal';
import { JunctionTypePickerModal } from '../../components/mapping/JunctionTypePickerModal';
import { JunctionSchematic } from '../../components/mapping/JunctionSchematic';
import {
  LayerVisibilityState,
  MarketPath,
  Business,
  PlaceType,
  FieldIssueType,
  FieldIssueSeverity,
  LocalPathJunction,
  JunctionBranch,
} from '../../types';
import { locationService } from '../../lib/location/locationService';

export const MapScreen: React.FC = () => {
  const {
    isOffline,
    toggleOffline,
    syncStatus,
    pendingSyncCount,
    unreadNotifsCount,
    navigateTo,
    refreshDbStats,
    isTabletView,
    activeMission,
    currentUser,
    isDev,
  } = useApp();

  // Phase 3 Path Recording Engine State Machine Hook
  const {
    status: recordingStatus,
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
  } = usePathRecording(activeMission?.id || (process.env.NODE_ENV !== 'production' ? 'dev_mission_01' : ''));

  // Layers & Basemap configuration
  const [showLayersModal, setShowLayersModal] = useState(false);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'offline_vector'>('standard');
  const [layers, setLayers] = useState<LayerVisibilityState>({
    showBusinesses: true,
    showPaths: true,
    showJunctions: true,
    showGates: true,
    showAreas: true,
    showLandmarks: true,
    showFacilities: true,
    showRevisits: true,
  });

  const toggleLayer = (key: keyof LayerVisibilityState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Saved paths in SQLite
  const [savedPaths, setSavedPaths] = useState<MarketPath[]>([]);
  const loadSavedPaths = useCallback(async () => {
    try {
      const paths = await PathRepository.getAllSavedPaths();
      setSavedPaths(paths);
    } catch (err) {
      console.warn('Error loading saved paths:', err);
    }
  }, []);

  // Saved junctions in SQLite with branch tracking
  const [savedJunctions, setSavedJunctions] = useState<LocalPathJunction[]>([]);
  const loadSavedJunctions = useCallback(async () => {
    try {
      const juncs = await PathRepository.getAllSavedJunctions(activeMission?.marketId || undefined);
      setSavedJunctions(juncs);
    } catch (err) {
      console.warn('Error loading saved junctions:', err);
    }
  }, [activeMission?.marketId]);

  // Phase 4 Saved businesses in SQLite
  const [savedBusinesses, setSavedBusinesses] = useState<Business[]>([]);
  const loadSavedBusinesses = useCallback(async () => {
    try {
      const bizList = await BusinessRepository.getAll({
        missionId: activeMission?.id || undefined,
      });
      setSavedBusinesses(bizList);
    } catch (err) {
      console.warn('Error loading saved businesses:', err);
    }
  }, [activeMission?.id]);

  useEffect(() => {
    loadSavedPaths();
    loadSavedBusinesses();
    loadSavedJunctions();
  }, [loadSavedPaths, loadSavedBusinesses, loadSavedJunctions]);

  // Combined real junctions (active recording session + persisted market junctions)
  const allDisplayJunctions = useMemo(() => {
    const combined = [...junctions];
    const activeIds = new Set(junctions.map((j) => j.id));
    for (const sj of savedJunctions) {
      if (!activeIds.has(sj.id)) {
        combined.push(sj);
      }
    }
    return combined;
  }, [junctions, savedJunctions]);

  // Fix / Undo Sheet state
  const [showFixSheet, setShowFixSheet] = useState(false);

  // Quick Junction Name input modal
  const [showJunctionModal, setShowJunctionModal] = useState(false);
  const [customJunctionLabel, setCustomJunctionLabel] = useState('');

  // Business capture modal state (Phase 4)
  const [showBusinessCaptureModal, setShowBusinessCaptureModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

  // Place capture modal state (+ Place / Gate / Landmark / Restroom)
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [placeType, setPlaceType] = useState<PlaceType>('gate_entrance');
  const [placeLabel, setPlaceLabel] = useState('');
  const [placeDesc, setPlaceDesc] = useState('');

  // Field Issue reporting modal state (Roadblocks, Hazard, GPS Problem)
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState<FieldIssueType>('blocked_passage');
  const [issueSeverity, setIssueSeverity] = useState<FieldIssueSeverity>('medium');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');

  // Selected item on map inspector
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'business' | 'path' | 'junction';
    id: string;
    title: string;
    subtitle: string;
    details?: string;
    stability?: string;
    lat: number;
    lng: number;
    operationalLabel?: string;
    revisitNeeded?: boolean;
    revisitReason?: string;
    completenessScore?: number;
    junction?: LocalPathJunction;
  } | null>(null);

  const handleEditSelectedBusiness = async () => {
    if (!selectedEntity || selectedEntity.type !== 'business') return;
    try {
      const fullBiz = await BusinessRepository.getById(selectedEntity.id);
      if (fullBiz) {
        setEditingBusiness(fullBiz);
        setShowBusinessCaptureModal(true);
      }
    } catch (err) {
      console.warn('Failed to load business for edit:', err);
    }
  };

  // Saved Path Detail View (opened via PathRepository.getPathById)
  const [pathDetailData, setPathDetailData] = useState<{
    path: MarketPath;
    junctions: any[];
    rawPoints: any[];
  } | null>(null);

  const handleInspectPath = async (pathId: string) => {
    try {
      const detail = await PathRepository.getPathById(pathId);
      if (detail) {
        setPathDetailData(detail);
      }
    } catch (err) {
      console.warn('Failed to load path details by id:', err);
    }
  };

  // Location Permission Banner state
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  useEffect(() => {
    locationService.getForegroundPermissionsAsync().then((res) => {
      if (!res.granted && res.status !== 'not_determined') {
        setPermissionNotice(
          res.status === 'services_disabled'
            ? 'Location services are disabled on your device. Please enable GPS in settings.'
            : 'Location permission was denied. Tap to request location access.'
        );
      }
    });
  }, []);

  const handleRequestPermission = async () => {
    const res = await locationService.requestForegroundPermissionsAsync();
    if (res.granted) {
      setPermissionNotice(null);
    } else {
      setPermissionNotice('Location access not granted. Running in simulated fallback mode.');
    }
  };

  const handleCreateJunctionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addJunction(customJunctionLabel.trim() || undefined);
    setCustomJunctionLabel('');
    setShowJunctionModal(false);
  };

  const handleSavePlaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeLabel.trim()) return;
    try {
      setPlaceLabel('');
      setPlaceDesc('');
      setShowPlaceModal(false);
      await refreshDbStats();
    } catch (err) {
      console.warn('Error saving place:', err);
    }
  };

  const handleReportIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle.trim()) return;
    try {
      await FieldIssueRepository.reportIssue({
        missionId: activeMission?.id || 'mis_alaba_01',
        missionTitle: activeMission?.title || 'Field Mission',
        reportedBy: currentUser?.id || 'usr_mapper_01',
        reportedByName: currentUser?.fullName || 'Field Mapper',
        reportedByRole: currentUser?.role || 'mapper',
        issueType,
        severity: issueSeverity,
        title: issueTitle.trim(),
        description: issueDesc.trim() || issueTitle.trim(),
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
      });
      setIssueTitle('');
      setIssueDesc('');
      setShowIssueModal(false);
      await refreshDbStats();
    } catch (err) {
      console.warn('Error reporting field issue:', err);
    }
  };

  const handleSavePathFinal = async (name: string) => {
    await saveFinalPath(name, currentUser?.id || 'usr_mapper_01');
    await loadSavedPaths();
    await refreshDbStats();
  };

  return (
    <div className="flex flex-col grow h-full relative overflow-hidden bg-slate-100 text-slate-900">
      {/* Field Navigation Header */}
      <Header
        title={activeMission ? `${activeMission.title} — Map` : 'Field Map Workspace'}
        subtitle={
          recordingStatus === 'recording'
            ? 'Active Path Recording in Progress'
            : recordingStatus === 'paused'
            ? 'Path Recording Paused'
            : activeMission?.description || 'GPS Navigation & Corridor Mapping'
        }
        isOffline={isOffline}
        onToggleOffline={toggleOffline}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        unreadNotifsCount={unreadNotifsCount}
        onPressNotifications={() => navigateTo('notifications')}
        rightAction={
          <button
            id="map-layers-btn"
            onClick={() => setShowLayersModal(true)}
            className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm flex items-center justify-center transition cursor-pointer"
            aria-label="Map Layers"
            title="Map Layers & Basemap"
          >
            <Layers className="w-5 h-5" />
          </button>
        }
      />

      {/* Permission Warning Notice */}
      {permissionNotice && (
        <div className="bg-amber-50 border-b border-amber-300 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between z-30 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">{permissionNotice}</span>
          </div>
          <button
            onClick={handleRequestPermission}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-sm"
          >
            Grant
          </button>
        </div>
      )}

      {/* Main Map Workspace Area */}
      <div className="grow relative flex w-full overflow-hidden">
        {/* Core Map Canvas (Interactive SVG Vector Projection compliant with react-native-maps) */}
        <MapWorkspace
          currentLocation={currentLocation}
          activeSegmentsCoordinates={activeSegmentsCoordinates}
          junctions={allDisplayJunctions}
          savedPaths={savedPaths}
          mappedBusinesses={savedBusinesses}
          layers={layers}
          mapType={mapType}
          isRecording={recordingStatus === 'recording'}
          assignedAreaGeometry={activeMission?.boundary}
          marketBoundaryGeometry={activeMission?.marketBoundary}
          selectedEntityId={selectedEntity?.id}
          onSelectEntity={(entity) => setSelectedEntity(entity)}
        />

        {/* GPS Diagnostic & Simulation Tool (Strictly DEV ONLY) */}
        {isDev && <GpsDiagnosticOverlay diagnosticInfo={diagnosticInfo} />}

        {/* Path Recording HUD (3G - 3M & Field Actions) */}
        {(recordingStatus === 'recording' || recordingStatus === 'paused') && (
          <RecordingHud
            status={recordingStatus}
            distanceMeters={distanceMeters}
            activeDurationSeconds={activeDurationSeconds}
            junctionsCount={junctions.length}
            gpsQuality={gpsQuality}
            movementState={diagnosticInfo.movementState}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onAddJunction={() => setShowJunctionModal(true)}
            onOpenFixSheet={() => setShowFixSheet(true)}
            onFinish={finishRecording}
            onAddBusiness={() => {
              setEditingBusiness(null);
              setShowBusinessCaptureModal(true);
            }}
            onAddPlace={() => setShowPlaceModal(true)}
            onReportIssue={() => setShowIssueModal(true)}
          />
        )}

        {/* Bottom Floating Map Actions (When Idle) */}
        {recordingStatus === 'idle' && (
          <div className="absolute bottom-5 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none max-w-lg mx-auto z-20">
            {/* Record Market Path Button */}
            <button
              id="start-record-path-btn"
              onClick={() => startRecording()}
              className="pointer-events-auto flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-white/95 hover:bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold shadow-xl active:scale-95 transition-all cursor-pointer min-h-[48px]"
            >
              <Navigation className="w-4 h-4 text-emerald-600" />
              <span>Record Market Path</span>
            </button>

            {/* Map Business / Stall Button (Phase 4) */}
            <button
              id="map-business-btn"
              onClick={() => {
                setEditingBusiness(null);
                setShowBusinessCaptureModal(true);
              }}
              className="pointer-events-auto flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black shadow-xl active:scale-95 transition-all ml-auto cursor-pointer border border-emerald-600 min-h-[48px]"
            >
              <Plus className="w-5 h-5" />
              <span>Map Business / Stall</span>
            </button>
          </div>
        )}

        {/* Selected Entity Inspector (Tablet Side Panel or Mobile Bottom Card) */}
        {selectedEntity && (
          <aside
            className={`${
              isTabletView
                ? 'w-80 border-l border-slate-300 bg-white text-slate-900 flex flex-col justify-between shrink-0 shadow-2xl z-30'
                : 'absolute bottom-20 left-4 right-4 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-300 p-5 max-w-md mx-auto z-30 animate-in slide-in-from-bottom duration-150'
            }`}
          >
            <div className={isTabletView ? 'p-5 overflow-y-auto space-y-4' : 'space-y-3'}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold uppercase tracking-wider">
                      {selectedEntity.type}
                    </span>
                    {selectedEntity.operationalLabel && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-mono font-bold">
                        {selectedEntity.operationalLabel}
                      </span>
                    )}
                    {selectedEntity.revisitNeeded && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold">
                        Revisit Needed
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-2 truncate">
                    {selectedEntity.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">{selectedEntity.subtitle}</p>
                </div>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  aria-label="Close inspector"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedEntity.details && (
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedEntity.details}
                </p>
              )}

              {selectedEntity.revisitNeeded && selectedEntity.revisitReason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Flagged for revisit:</strong> {selectedEntity.revisitReason.replace('_', ' ')}
                  </span>
                </div>
              )}

              <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Coordinates:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedEntity.lat.toFixed(5)}°, {selectedEntity.lng.toFixed(5)}°
                  </span>
                </div>
                {selectedEntity.completenessScore !== undefined && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Completeness:</span>
                    <span className="text-emerald-700 font-bold">{selectedEntity.completenessScore}%</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-600">
                  <span>Local Storage:</span>
                  <span className="text-emerald-700 font-bold">SQLite Synchronized</span>
                </div>
              </div>

              {selectedEntity.type === 'path' && (
                <button
                  onClick={() => handleInspectPath(selectedEntity.id)}
                  className="w-full mt-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-emerald-800 border border-slate-300 flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
                >
                  <Eye className="w-4 h-4" />
                  <span>Inspect Saved Geometry & Nodes</span>
                </button>
              )}

              {selectedEntity.type === 'junction' && selectedEntity.junction && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <JunctionSchematic
                      type={selectedEntity.junction.junctionType || 't_junction'}
                      size="md"
                      isSelected={true}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 uppercase">
                        {(selectedEntity.junction.junctionType || 't_junction').replace('_', ' ')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {selectedEntity.junction.branches?.length || 0} Corridor Branches
                      </p>
                    </div>
                  </div>

                  {/* Branches tracking & status list */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Branches & Corridors
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {selectedEntity.junction.branches?.filter((b) => b.status === 'mapped').length || 0} / {selectedEntity.junction.branches?.length || 0} mapped
                      </span>
                    </div>

                    {selectedEntity.junction.branches && selectedEntity.junction.branches.length > 0 ? (
                      selectedEntity.junction.branches.map((branch) => {
                        const isMapped = branch.status === 'mapped';
                        const isInProgress = branch.status === 'in_progress';
                        const isBlocked = branch.status === 'blocked';

                        return (
                          <div
                            key={branch.id}
                            className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-slate-800 text-xs truncate">{branch.label}</p>
                              <p className="text-[10px] text-slate-500 capitalize">
                                {branch.relativeSide ? `Side: ${branch.relativeSide}` : 'Corridor'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isMapped
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : isInProgress
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : isBlocked
                                    ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {isMapped
                                  ? 'Mapped'
                                  : isInProgress
                                  ? 'In Progress'
                                  : isBlocked
                                  ? 'Blocked'
                                  : 'Unmapped'}
                              </span>

                              {!isMapped && (
                                <button
                                  onClick={async () => {
                                    const nextStatus = isBlocked ? 'unmapped' : 'blocked';
                                    await PathRepository.markBranchBlocked(
                                      branch.id,
                                      nextStatus === 'blocked' ? 'Impassable stall or gate' : ''
                                    );
                                    await loadSavedJunctions();
                                    setSelectedEntity((prev) => {
                                      if (!prev || !prev.junction) return prev;
                                      const updatedBranches = (prev.junction.branches || []).map((b) =>
                                        b.id === branch.id ? { ...b, status: nextStatus } : b
                                      );
                                      return {
                                        ...prev,
                                        junction: { ...prev.junction, branches: updatedBranches },
                                      };
                                    });
                                  }}
                                  className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-semibold cursor-pointer"
                                  title={isBlocked ? 'Mark unmapped' : 'Mark blocked / cul-de-sac'}
                                >
                                  {isBlocked ? 'Unblock' : 'Block'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded-xl">
                        No secondary branches recorded for this node.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedEntity.type === 'business' && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleEditSelectedBusiness}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
                  >
                    <Store className="w-4 h-4" />
                    <span>Edit Business Record</span>
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Path Review & Finalize View (3Q, 3R) */}
      {recordingStatus === 'reviewing' && (
        <PathReviewView
          distanceMeters={distanceMeters}
          activeDurationSeconds={activeDurationSeconds}
          junctions={junctions}
          rawPoints={rawPoints}
          defaultName={activeMission ? `${activeMission.title} Corridor Path` : 'Corridor Footpath P001'}
          onTrimStart={trimStart}
          onTrimStartMeters={trimStartMeters}
          onTrimEnd={trimEnd}
          onTrimEndMeters={trimEndMeters}
          onSave={handleSavePathFinal}
          onResumeRecording={resumeRecording}
          onDiscard={discardPath}
        />
      )}

      {/* Field Correction / Undo Sheet (3K, 3L, 3M) */}
      <PathCorrectionSheet
        isOpen={showFixSheet}
        onClose={() => setShowFixSheet(false)}
        junctions={junctions}
        rawPoints={rawPoints}
        onUndoDistance={undoByDistance}
        onUndoTime={undoByTime}
        onSelectPreviousPoint={selectPreviousPoint}
        onRestartFromJunction={restartFromJunction}
        onDiscardPath={discardPath}
      />

      {/* Unfinished Session Modal for Cold-Start / Interruption Crash Recovery (3O) */}
      {unfinishedSession && (
        <UnfinishedSessionModal
          session={unfinishedSession}
          onResume={resumeUnfinishedSession}
          onReview={reviewUnfinishedSession}
          onDiscard={discardUnfinishedSession}
        />
      )}

      {/* Map Layers Modal (3W, 3X) */}
      <LayersModal
        isOpen={showLayersModal}
        onClose={() => setShowLayersModal(false)}
        layers={layers}
        onToggleLayer={toggleLayer}
        mapType={mapType}
        onChangeMapType={setMapType}
      />

      {/* Add Junction Visual Schematic Picker Modal */}
      <JunctionTypePickerModal
        isOpen={showJunctionModal}
        onClose={() => setShowJunctionModal(false)}
        onSave={async (juncData) => {
          await addJunction({
            label: juncData.operationalLabel,
            name: juncData.name,
            junctionType: juncData.junctionType,
            latitude: juncData.latitude,
            longitude: juncData.longitude,
            marketId: activeMission?.marketId || 'market_alaba_01',
            missionId: activeMission?.id || 'mis_alaba_01',
            createdBy: currentUser?.id || 'usr_mapper_01',
          });
          setShowJunctionModal(false);
        }}
        currentLocation={currentLocation}
        isRecordingActive={recordingStatus === 'recording' || recordingStatus === 'paused'}
      />

      {/* Phase 4 Business Capture & Rapid Mapping Modal */}
      <BusinessCaptureModal
        isOpen={showBusinessCaptureModal}
        onClose={() => {
          setShowBusinessCaptureModal(false);
          setEditingBusiness(null);
        }}
        onSaved={async (savedBiz) => {
          await loadSavedBusinesses();
          await refreshDbStats();
          setSelectedEntity({
            type: 'business',
            id: savedBiz.id,
            title: savedBiz.name || savedBiz.operationalLabel || 'Stall',
            subtitle: savedBiz.stallNumber || savedBiz.operationalLabel,
            details: `Operational Business ${savedBiz.operationalLabel || ''} (${savedBiz.businessType || 'shop'}) - ${savedBiz.activity || 'goods'}${savedBiz.revisitNeeded ? ' • [Flagged for Revisit]' : ''}`,
            stability: savedBiz.revisitNeeded ? 'needs_revisit' : 'verified',
            lat: savedBiz.latitude,
            lng: savedBiz.longitude,
            operationalLabel: savedBiz.operationalLabel,
            revisitNeeded: Boolean(savedBiz.revisitNeeded),
            revisitReason: savedBiz.revisitReason,
            completenessScore: savedBiz.completenessScore,
          });
        }}
        currentLocation={currentLocation}
        activeMissionId={activeMission?.id || 'mis_alaba_01'}
        activeMarketId={activeMission?.marketId || 'market_alaba_01'}
        currentUser={currentUser}
        initialEditingBusiness={editingBusiness}
        isRecordingActive={recordingStatus === 'recording' || recordingStatus === 'paused'}
        recordingStatus={recordingStatus}
        parentPathSessionId={activeSession?.sessionId}
        currentHeading={currentLocation?.heading ?? null}
        recentPathPoints={rawPoints}
        deviceSpeed={currentLocation?.speed ?? null}
      />

      {/* Saved Path Detail Inspector Modal (PathRepository.getPathById) */}
      <Modal
        isOpen={Boolean(pathDetailData)}
        onClose={() => setPathDetailData(null)}
        title={pathDetailData ? `Path: ${pathDetailData.path.name}` : 'Path Details'}
      >
        {pathDetailData && (
          <div className="space-y-4 text-zinc-800">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Length</span>
                <span className="text-base font-bold font-mono text-emerald-700">
                  {Math.round(pathDetailData.path.distanceMeters)}m
                </span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Duration</span>
                <span className="text-base font-bold font-mono text-sky-700">
                  {Math.round(pathDetailData.path.durationSeconds / 60)}m
                </span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Junctions</span>
                <span className="text-base font-bold font-mono text-amber-700">
                  {pathDetailData.junctions.length}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-100/70 rounded-xl border border-zinc-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Path ID:</span>
                <span className="font-mono text-zinc-800 font-semibold">{pathDetailData.path.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Geometry Type:</span>
                <span className="font-semibold text-zinc-800">
                  {pathDetailData.path.segments.length > 1 ? `MultiLineString (${pathDetailData.path.segments.length} segments)` : 'LineString (single segment)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Raw GPS Points:</span>
                <span className="font-semibold text-zinc-800">{pathDetailData.rawPoints.length} points stored</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Sync Status:</span>
                <span className="font-semibold text-emerald-600">{pathDetailData.path.syncStatus}</span>
              </div>
            </div>

            {pathDetailData.junctions.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide block">
                  Associated Junctions ({pathDetailData.junctions.length})
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {pathDetailData.junctions.map((j, idx) => (
                    <div
                      key={j.id || idx}
                      className="p-2 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-zinc-800">
                        {j.operationalLabel} {j.displayName ? `(${j.displayName})` : ''}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-500">
                        {Number(j.latitude).toFixed(5)}°, {Number(j.longitude).toFixed(5)}°
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={() => setPathDetailData(null)}
              >
                Close Inspector
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Place Capture Modal (Gate, Landmark, Restroom, Power) */}
      <Modal
        isOpen={showPlaceModal}
        onClose={() => setShowPlaceModal(false)}
        title="Map Place / Landmark / Gate"
      >
        <form onSubmit={handleSavePlaceSubmit} className="space-y-4 text-slate-800">
          {(recordingStatus === 'recording' || recordingStatus === 'paused') && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
              <span>Path recording remains active while capturing place location.</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Place Type</label>
            <select
              value={placeType}
              onChange={(e) => setPlaceType(e.target.value as PlaceType)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="gate_entrance">Gate / Entrance</option>
              <option value="landmark">Key Landmark</option>
              <option value="facility_restroom">Public Restroom / Facility</option>
              <option value="facility_water">Water Point</option>
              <option value="facility_power">Power / Generator House</option>
              <option value="transport_stop">Transport Stop / Park</option>
              <option value="other">Other Point of Interest</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Place Name / Operational Label</label>
            <Input
              type="text"
              placeholder="e.g. Gate 3 Main Entrance or Central Water Pump"
              value={placeLabel}
              onChange={(e) => setPlaceLabel(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Description / Notes (Optional)</label>
            <textarea
              placeholder="e.g. Double gate, fits delivery vans, open 6am - 8pm"
              value={placeDesc}
              onChange={(e) => setPlaceDesc(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 h-20"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="md" type="button" onClick={() => setShowPlaceModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit">
              Save Place
            </Button>
          </div>
        </form>
      </Modal>

      {/* Field Issue / Hazard Reporting Modal */}
      <Modal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title="Report Field Issue / Roadblock"
      >
        <form onSubmit={handleReportIssueSubmit} className="space-y-4 text-slate-800">
          {(recordingStatus === 'recording' || recordingStatus === 'paused') && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
              <span>Path recording remains active while reporting field hazard.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Issue Type</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as FieldIssueType)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
              >
                <option value="blocked_passage">Blocked Passage / Debris</option>
                <option value="unsafe_area">Unsafe / Hazardous Area</option>
                <option value="market_layout_changed">Market Layout Changed</option>
                <option value="gps_denied">GPS Denied / Heavy Canopy</option>
                <option value="trader_dispute">Trader Dispute / Resistance</option>
                <option value="other">Other Field Issue</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Severity</label>
              <select
                value={issueSeverity}
                onChange={(e) => setIssueSeverity(e.target.value as FieldIssueSeverity)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
              >
                <option value="low">Low - Minor inconvenience</option>
                <option value="medium">Medium - Slows mapping</option>
                <option value="high">High - Passage blocked</option>
                <option value="urgent">Urgent - Safety / Security hazard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Issue Title</label>
            <Input
              type="text"
              placeholder="e.g. Row C passageway blocked by refuse dump"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Details & Description</label>
            <textarea
              placeholder="e.g. Cannot complete path recording through Row C aisle 4 due to ongoing construction."
              value={issueDesc}
              onChange={(e) => setIssueDesc(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 h-20"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="md" type="button" onClick={() => setShowIssueModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" type="submit">
              Report Issue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
