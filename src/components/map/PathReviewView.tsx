import React, { useState } from 'react';
import {
  CheckCircle,
  Scissors,
  ArrowLeft,
  Trash2,
  Navigation2,
  Clock,
  GitBranch,
  Save,
  MapPin,
} from 'lucide-react';
import { LocalPathJunction, RawGpsSample } from '../../types';

interface PathReviewViewProps {
  distanceMeters: number;
  activeDurationSeconds: number;
  junctions: LocalPathJunction[];
  rawPoints: RawGpsSample[];
  defaultName?: string;
  onTrimStart: (count: number) => Promise<void>;
  onTrimStartMeters?: (meters: number) => Promise<void>;
  onTrimEnd: (count: number) => Promise<void>;
  onTrimEndMeters?: (meters: number) => Promise<void>;
  onSave: (name: string) => Promise<void>;
  onResumeRecording: () => void;
  onDiscard: () => Promise<void>;
}

export const PathReviewView: React.FC<PathReviewViewProps> = ({
  distanceMeters,
  activeDurationSeconds,
  junctions,
  rawPoints,
  defaultName = 'Path P001',
  onTrimStart,
  onTrimStartMeters,
  onTrimEnd,
  onTrimEndMeters,
  onSave,
  onResumeRecording,
  onDiscard,
}) => {
  const [name, setName] = useState(defaultName);
  const [isSaving, setIsSaving] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [trimFeedback, setTrimFeedback] = useState<string | null>(null);

  const acceptedPoints = rawPoints.filter((p) => p.accepted);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}m ${remaining}s`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave(name.trim());
    } finally {
      setIsSaving(false);
    }
  };

  const handleTrimStart = async (count: number) => {
    setIsTrimming(true);
    try {
      await onTrimStart(count);
      setTrimFeedback(`Trimmed ${count} point(s) from start.`);
      setTimeout(() => setTrimFeedback(null), 3000);
    } finally {
      setIsTrimming(false);
    }
  };

  const handleTrimStartMeters = async (meters: number) => {
    if (!onTrimStartMeters) {
      // Fallback to point estimate (~1.5m/point)
      return handleTrimStart(Math.max(1, Math.round(meters / 1.5)));
    }
    setIsTrimming(true);
    try {
      await onTrimStartMeters(meters);
      setTrimFeedback(`Trimmed ~${meters}m from start.`);
      setTimeout(() => setTrimFeedback(null), 3000);
    } finally {
      setIsTrimming(false);
    }
  };

  const handleTrimEnd = async (count: number) => {
    setIsTrimming(true);
    try {
      await onTrimEnd(count);
      setTrimFeedback(`Trimmed ${count} point(s) from end.`);
      setTimeout(() => setTrimFeedback(null), 3000);
    } finally {
      setIsTrimming(false);
    }
  };

  const handleTrimEndMeters = async (meters: number) => {
    if (!onTrimEndMeters) {
      return handleTrimEnd(Math.max(1, Math.round(meters / 1.5)));
    }
    setIsTrimming(true);
    try {
      await onTrimEndMeters(meters);
      setTrimFeedback(`Trimmed ~${meters}m from end.`);
      setTimeout(() => setTrimFeedback(null), 3000);
    } finally {
      setIsTrimming(false);
    }
  };

  return (
    <div
      id="path-review-view"
      className="absolute inset-0 z-40 bg-slate-100/95 backdrop-blur-md overflow-y-auto flex flex-col p-4 md:p-8 text-slate-900 animate-in fade-in"
    >
      <div className="max-w-xl w-full mx-auto space-y-5 my-auto bg-white p-6 rounded-2xl border border-slate-300 shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onResumeRecording}
              className="p-2 rounded-xl bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="Return to active recording"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Review Market Path</h2>
              <p className="text-xs text-slate-600 font-medium">Verify geometry, apply trims, and save to SQLite</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Distance
            </span>
            <span className="text-xl font-black font-mono text-emerald-700">
              {distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(2)} km` : `${Math.round(distanceMeters)} m`}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Active Time
            </span>
            <span className="text-xl font-black font-mono text-blue-700">
              {formatDuration(activeDurationSeconds)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Junctions
            </span>
            <span className="text-xl font-black font-mono text-amber-700">
              {junctions.length}
            </span>
          </div>
        </div>

        {/* Geometry & Point Density Info */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-700">
          <div>
            <span className="font-black text-slate-900">{acceptedPoints.length}</span> accepted GPS nodes
            <span className="text-slate-500 ml-1">({rawPoints.length - acceptedPoints.length} filtered)</span>
          </div>
          <div className="font-mono text-[11px] font-bold text-slate-600">
            {distanceMeters > 0 && acceptedPoints.length > 0
              ? `~${(distanceMeters / acceptedPoints.length).toFixed(1)}m / sample`
              : '0 m'}
          </div>
        </div>

        {/* Feedback notification if trimmed */}
        {trimFeedback && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 font-semibold flex items-center gap-2 animate-in fade-in">
            <Scissors className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{trimFeedback}</span>
          </div>
        )}

        {/* Trimming Controls (3R) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-900">
            <Scissors className="w-4 h-4 text-blue-600" />
            <span>Path Trimming Tools (Distance & Point Precision)</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            Remove overshoot from the start or end of the path before finalizing.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Trim Start */}
            <div className="space-y-2 p-3 rounded-xl bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Trim Path Start
              </span>
              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-500 font-semibold">By Distance:</div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={isTrimming || distanceMeters < 10}
                    onClick={() => handleTrimStartMeters(5)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-black text-blue-800 transition cursor-pointer disabled:opacity-30"
                  >
                    5m
                  </button>
                  <button
                    type="button"
                    disabled={isTrimming || distanceMeters < 25}
                    onClick={() => handleTrimStartMeters(15)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-black text-blue-800 transition cursor-pointer disabled:opacity-30"
                  >
                    15m
                  </button>
                  <button
                    type="button"
                    disabled={isTrimming || distanceMeters < 45}
                    onClick={() => handleTrimStartMeters(30)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-black text-blue-800 transition cursor-pointer disabled:opacity-30"
                  >
                    30m
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] text-slate-500 font-semibold">By GPS Node:</div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={isTrimming || acceptedPoints.length <= 2}
                    onClick={() => handleTrimStart(1)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-black text-blue-800 transition cursor-pointer disabled:opacity-30"
                  >
                    -1 pt
                  </button>
                  <button
                    type="button"
                    disabled={isTrimming || acceptedPoints.length <= 6}
                    onClick={() => handleTrimStart(5)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-black text-blue-800 transition cursor-pointer disabled:opacity-30"
                  >
                    -5 pts
                  </button>
                </div>
              </div>
            </div>

            {/* Trim End */}
            <div className="space-y-2 p-3 rounded-xl bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Trim Path End
              </span>
              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-500 font-semibold">By Distance:</div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={isTrimming || distanceMeters < 10}
                    onClick={() => handleTrimEndMeters(5)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-black text-blue-800 transition cursor-pointer disabled:opacity-30"
                  >
                    5m
                  </button>
                  <button
                    type="button"
                    disabled={isTrimming || distanceMeters < 25}
                    onClick={() => handleTrimEndMeters(15)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-black text-blue-800 transition cursor-pointer disabled:opacity-30"
                  >
                    15m
                  </button>
                  <button
                    type="button"
                    disabled={isTrimming || distanceMeters < 45}
                    onClick={() => handleTrimEndMeters(30)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-black text-blue-800 transition cursor-pointer disabled:opacity-30"
                  >
                    30m
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] text-slate-500 font-semibold">By GPS Node:</div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={isTrimming || acceptedPoints.length <= 2}
                    onClick={() => handleTrimEnd(1)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-black text-blue-800 transition cursor-pointer disabled:opacity-30"
                  >
                    -1 pt
                  </button>
                  <button
                    type="button"
                    disabled={isTrimming || acceptedPoints.length <= 6}
                    onClick={() => handleTrimEnd(5)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-black text-blue-800 transition cursor-pointer disabled:opacity-30"
                  >
                    -5 pts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Path Name Form & Save */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Path Name / Operational Label
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Line A Main Corridor Footpath"
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600 min-h-[48px]"
              required
            />
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              id="save-final-path-btn"
              type="submit"
              disabled={isSaving || !name.trim()}
              className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50 min-h-[48px]"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving to Local SQLite...' : 'Save Path to Local Database'}</span>
            </button>

            <button
              type="button"
              onClick={onResumeRecording}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 transition cursor-pointer min-h-[44px]"
            >
              Resume Walking & Keep Recording
            </button>

            {!confirmDiscard ? (
              <button
                type="button"
                onClick={() => setConfirmDiscard(true)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition cursor-pointer mt-1"
              >
                Discard this path
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex items-center justify-between gap-3 text-xs">
                <span className="text-rose-900 font-bold">Permanently discard unsaved recording?</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDiscard(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={onDiscard}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer"
                  >
                    Yes, Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
