import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { GpsDiagnosticInfo } from '../../types';
import { locationService } from '../../lib/location/locationService';

interface GpsDiagnosticOverlayProps {
  diagnosticInfo: GpsDiagnosticInfo;
}

export const GpsDiagnosticOverlay: React.FC<GpsDiagnosticOverlayProps> = ({
  diagnosticInfo,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSimulating, setIsSimulating] = useState(
    diagnosticInfo.isSimulatorActive ?? locationService.getIsSimulationMode()
  );

  const toggleSimulation = () => {
    const next = !isSimulating;
    locationService.setSimulationMode(next);
    setIsSimulating(next);
  };

  const injectImpossibleJump = () => {
    locationService.setCoordinates(
      diagnosticInfo.latitude + 0.002,
      diagnosticInfo.longitude + 0.002
    );
  };

  const movementState = diagnosticInfo.movementState || 'SEARCHING';
  const movementStateColors: Record<string, string> = {
    SEARCHING: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    STATIONARY: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    POSSIBLY_MOVING: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    MOVING: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  };

  return (
    <div
      id="dev-gps-diagnostic-overlay"
      className="absolute top-16 left-4 z-30 max-w-sm w-full bg-zinc-950/95 backdrop-blur-md rounded-xl border border-zinc-800 text-white text-xs shadow-2xl transition-all"
    >
      {/* Minimized Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-zinc-900/50 rounded-xl select-none"
      >
        <div className="flex items-center gap-2">
          <span
            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${
              isSimulating
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}
          >
            SIM: {isSimulating ? 'ACTIVE' : 'INACTIVE'}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${
              movementStateColors[movementState] || movementStateColors.SEARCHING
            }`}
          >
            {movementState}
          </span>
          <span className="font-mono text-[11px] text-zinc-300">
            ±{diagnosticInfo.accuracy.toFixed(1)}m
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              diagnosticInfo.persistenceStatus === 'saved'
                ? 'bg-emerald-500'
                : diagnosticInfo.persistenceStatus === 'saving'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-rose-500'
            }`}
            title={`SQLite Status: ${diagnosticInfo.persistenceStatus}`}
          />
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </div>
      </div>

      {/* Expanded Diagnostic Panel */}
      {isExpanded && (
        <div className="p-3 border-t border-zinc-800/80 space-y-2.5 font-mono text-[11px]">
          {/* Coordinates & Fix Details */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-zinc-400 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/50">
            <div>
              Lat: <span className="text-zinc-200">{diagnosticInfo.latitude.toFixed(6)}</span>
            </div>
            <div>
              Lng: <span className="text-zinc-200">{diagnosticInfo.longitude.toFixed(6)}</span>
            </div>
            <div>
              Accuracy: <span className="text-zinc-200 font-semibold">±{diagnosticInfo.accuracy.toFixed(1)}m</span>
            </div>
            <div>
              Speed: <span className="text-zinc-200">{diagnosticInfo.speed ? `${diagnosticInfo.speed.toFixed(2)} m/s` : '0 m/s'}</span>
            </div>
            <div>
              Heading: <span className="text-zinc-200">{diagnosticInfo.heading ? `${Math.round(diagnosticInfo.heading)}°` : 'N/A'}</span>
            </div>
            <div>
              Quality: <span className="text-emerald-400 font-semibold uppercase">{diagnosticInfo.quality}</span>
            </div>
          </div>

          {/* Movement & Stationary Engine Metrics */}
          <div className="bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/50 space-y-1 text-zinc-400">
            <div className="flex justify-between">
              <span>Raw Displacement:</span>
              <span className="text-zinc-200 font-semibold">
                {diagnosticInfo.rawDisplacementMeters !== undefined
                  ? `${diagnosticInfo.rawDisplacementMeters.toFixed(2)}m`
                  : '0.00m'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Distance from Anchor:</span>
              <span className="text-blue-300 font-semibold">
                {diagnosticInfo.distanceFromAnchorMeters !== undefined
                  ? `${diagnosticInfo.distanceFromAnchorMeters.toFixed(2)}m`
                  : '0.00m'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Accepted Displacement:</span>
              <span className="text-emerald-300 font-semibold">
                {diagnosticInfo.acceptedDisplacementMeters !== undefined
                  ? `${diagnosticInfo.acceptedDisplacementMeters.toFixed(2)}m`
                  : '0.00m'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Distance Added (Path):</span>
              <span className="text-emerald-400 font-bold">
                {diagnosticInfo.distanceAddedMeters !== undefined
                  ? `+${diagnosticInfo.distanceAddedMeters.toFixed(2)}m`
                  : '+0.00m'}
              </span>
            </div>
          </div>

          {/* Sample Counts & Segmentation */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="bg-zinc-900/60 p-1.5 rounded border border-zinc-800">
              <div className="text-zinc-500">RAW</div>
              <div className="text-zinc-200 font-bold text-xs">{diagnosticInfo.sampleCount}</div>
            </div>
            <div className="bg-zinc-900/60 p-1.5 rounded border border-zinc-800">
              <div className="text-emerald-500">ACCEPTED</div>
              <div className="text-emerald-400 font-bold text-xs">{diagnosticInfo.acceptedCount}</div>
            </div>
            <div className="bg-zinc-900/60 p-1.5 rounded border border-zinc-800">
              <div className="text-amber-500">REJECTED</div>
              <div className="text-amber-400 font-bold text-xs">{diagnosticInfo.rejectedCount}</div>
            </div>
          </div>

          {/* Rejection Reason & Persistence Status */}
          <div className="space-y-1 text-zinc-400 pt-1 border-t border-zinc-800">
            <div className="flex justify-between items-center">
              <span>Last Filter / Reason:</span>
              <span className="text-amber-300 font-medium">
                {diagnosticInfo.lastRejectionReason || 'none (clean)'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active Segment:</span>
              <span className="text-zinc-200 font-bold">Segment #{diagnosticInfo.activeSegmentIndex}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>SQLite Persistence:</span>
              <span className="text-emerald-400 font-bold uppercase">{diagnosticInfo.persistenceStatus}</span>
            </div>
          </div>

          {/* Simulation & Anomaly Ingestion Controls */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
            <span className="text-[10px] text-zinc-400 uppercase font-sans font-bold block">
              Simulation & Anomaly Controls
            </span>

            <button
              onClick={toggleSimulation}
              className={`w-full py-1.5 px-2 rounded-lg text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isSimulating
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
              }`}
            >
              {isSimulating ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isSimulating ? 'Stop Simulated Walking' : 'Start Simulated Walking (1.2m/s)'}</span>
            </button>

            {isSimulating && (
              <button
                onClick={injectImpossibleJump}
                className="w-full py-1 px-2 rounded bg-zinc-800 hover:bg-rose-950/40 text-rose-300 border border-rose-800/40 text-[10px] font-sans font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Inject Impossible GPS Jump (+200m)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
