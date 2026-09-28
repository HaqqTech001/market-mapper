import React from 'react';
import {
  Play,
  Pause,
  Plus,
  RotateCcw,
  CheckCircle,
  Radio,
  Clock,
  Navigation2,
  GitBranch,
  Store,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { GpsQualityStatus } from '../../types';

interface RecordingHudProps {
  status: 'recording' | 'paused' | 'reviewing';
  distanceMeters: number;
  activeDurationSeconds: number;
  junctionsCount: number;
  gpsQuality: GpsQualityStatus;
  movementState?: string;
  onPause: () => void;
  onResume: () => void;
  onAddJunction: () => void;
  onOpenFixSheet: () => void;
  onFinish: () => void;
  onAddBusiness?: () => void;
  onAddPlace?: () => void;
  onReportIssue?: () => void;
}

export const RecordingHud: React.FC<RecordingHudProps> = ({
  status,
  distanceMeters,
  activeDurationSeconds,
  junctionsCount,
  gpsQuality,
  movementState,
  onPause,
  onResume,
  onAddJunction,
  onOpenFixSheet,
  onFinish,
  onAddBusiness,
  onAddPlace,
  onReportIssue,
}) => {
  const isRecording = status === 'recording';
  const isPaused = status === 'paused';

  // Format active walking time mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  const getQualityColor = () => {
    switch (gpsQuality) {
      case 'good':
        return 'bg-emerald-500 text-white';
      case 'fair':
        return 'bg-amber-500 text-black';
      case 'poor':
        return 'bg-orange-600 text-white';
      case 'searching':
      default:
        return 'bg-zinc-600 text-zinc-200';
    }
  };

  return (
    <div
      id="recording-hud"
      className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-6 md:w-[410px] z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-300 shadow-2xl p-3.5 sm:p-4 text-slate-900 flex flex-col gap-3 transition-all"
    >
      {/* Compact Active Recording Status Strip */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {isRecording ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-xs font-black tracking-wide">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              <span>RECORDING</span>
            </div>
          ) : isPaused ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-black tracking-wide">
              <Pause className="w-3 h-3 fill-amber-800" />
              <span>PAUSED</span>
            </div>
          ) : null}

          {/* GPS Quality Badge */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${getQualityColor()}`}
            title={`GPS Quality: ${gpsQuality.toUpperCase()}`}
          >
            <Radio className="w-3 h-3" />
            <span>{gpsQuality}</span>
          </div>

          {/* Live Movement State Filter */}
          {isRecording && movementState && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wide border ${
                movementState === 'STATIONARY'
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : movementState === 'MOVING'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <span>{movementState === 'STATIONARY' ? 'STATIONARY' : movementState === 'MOVING' ? 'WALKING' : movementState}</span>
            </div>
          )}
        </div>

        {/* Live Active Clock */}
        <div className="flex items-center gap-1.5 text-slate-800 font-mono font-bold text-xs sm:text-sm shrink-0">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{formatTime(activeDurationSeconds)}</span>
        </div>
      </div>

      {/* Recording Metrics & Path Controls Strip */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Distance
            </span>
            <span className="text-lg sm:text-xl font-black font-mono tracking-tight text-slate-900 flex items-baseline gap-1">
              {distanceMeters >= 1000 ? (distanceMeters / 1000).toFixed(2) : Math.round(distanceMeters)}
              <span className="text-xs font-bold text-slate-500">
                {distanceMeters >= 1000 ? 'km' : 'm'}
              </span>
            </span>
          </div>
          <div className="pl-3 border-l border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Junctions
            </span>
            <span className="text-base sm:text-lg font-black font-mono tracking-tight text-emerald-700 flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 text-emerald-600" />
              {junctionsCount}
            </span>
          </div>
        </div>

        {/* Compact Path Life-Cycle Controls: Pause / Fix / Finish */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Pause / Resume */}
          {isRecording ? (
            <button
              id="hud-pause-btn"
              onClick={onPause}
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold transition active:scale-95 cursor-pointer min-h-[40px]"
              title="Pause Recording"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              id="hud-resume-btn"
              onClick={onResume}
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer min-h-[40px]"
              title="Resume Recording"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Resume</span>
            </button>
          )}

          {/* Fix */}
          <button
            id="hud-fix-undo-btn"
            onClick={onOpenFixSheet}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition active:scale-95 cursor-pointer min-h-[40px]"
            title="Fix mistakes, Undo by distance or time"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span>Fix</span>
          </button>

          {/* Finish */}
          <button
            id="hud-finish-btn"
            onClick={onFinish}
            className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer min-h-[40px]"
            title="Finish and Review Path"
          >
            <CheckCircle className="w-3.5 h-3.5 text-indigo-200" />
            <span>Finish</span>
          </button>
        </div>
      </div>

      {/* Normal Field Capture Actions (Clearly Available During Active Path) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Field Capture Actions
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold">
            Path continues recording
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* + Business */}
          <button
            id="hud-add-business-btn"
            onClick={onAddBusiness}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black shadow-md transition active:scale-95 cursor-pointer min-h-[44px]"
            title="Map Business / Stall while path is active"
          >
            <Store className="w-4 h-4 shrink-0" />
            <span>+ Business</span>
          </button>

          {/* + Place */}
          <button
            id="hud-add-place-btn"
            onClick={onAddPlace}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer min-h-[44px]"
            title="Map Gate, Landmark or Facility"
          >
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>+ Place</span>
          </button>

          {/* Add Junction */}
          <button
            id="hud-add-junction-btn"
            onClick={onAddJunction}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border-2 border-emerald-600 text-xs font-black transition active:scale-95 cursor-pointer min-h-[44px]"
            title="Add Operational Junction Node"
          >
            <GitBranch className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Add Junction</span>
          </button>

          {/* Report Issue */}
          <button
            id="hud-report-issue-btn"
            onClick={onReportIssue}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition active:scale-95 cursor-pointer min-h-[44px]"
            title="Report Field Hazard or Roadblock"
          >
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Report Issue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
