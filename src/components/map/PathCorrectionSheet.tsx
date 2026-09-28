import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Clock,
  Navigation2,
  GitBranch,
  Trash2,
  AlertTriangle,
  CornerUpLeft,
} from 'lucide-react';
import { LocalPathJunction, RawGpsSample } from '../../types';

interface PathCorrectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  junctions: LocalPathJunction[];
  rawPoints: RawGpsSample[];
  onUndoDistance: (meters: number) => Promise<void>;
  onUndoTime: (seconds: number) => Promise<void>;
  onSelectPreviousPoint: (pointId: string) => Promise<void>;
  onRestartFromJunction: (junctionId: string) => Promise<void>;
  onDiscardPath: () => Promise<void>;
}

export const PathCorrectionSheet: React.FC<PathCorrectionSheetProps> = ({
  isOpen,
  onClose,
  junctions,
  rawPoints,
  onUndoDistance,
  onUndoTime,
  onSelectPreviousPoint,
  onRestartFromJunction,
  onDiscardPath,
}) => {
  const [activeTab, setActiveTab] = useState<'distance' | 'time' | 'junction' | 'point' | 'discard'>('distance');
  const [customMeters, setCustomMeters] = useState('15');
  const [customSeconds, setCustomSeconds] = useState('45');
  const [selectedJunctionId, setSelectedJunctionId] = useState<string>('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const handleApplyDistance = async (meters: number) => {
    setIsApplying(true);
    try {
      await onUndoDistance(meters);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyTime = async (seconds: number) => {
    setIsApplying(true);
    try {
      await onUndoTime(seconds);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyJunctionRestart = async () => {
    if (!selectedJunctionId) return;
    setIsApplying(true);
    try {
      await onRestartFromJunction(selectedJunctionId);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyDiscard = async () => {
    setIsApplying(true);
    try {
      await onDiscardPath();
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div
        id="path-correction-sheet"
        className="w-full max-w-lg bg-white border border-slate-300 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-900 animate-in slide-in-from-bottom-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <CornerUpLeft className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Fix Recording / Undo</h3>
              <p className="text-xs text-slate-600 font-medium">Correct wrong turns or unwanted path deviations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100 p-1.5 gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('distance')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'distance'
                ? 'bg-white text-blue-700 border border-slate-300 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Distance
          </button>
          <button
            onClick={() => setActiveTab('time')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'time'
                ? 'bg-white text-blue-700 border border-slate-300 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Time
          </button>
          <button
            onClick={() => setActiveTab('junction')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'junction'
                ? 'bg-white text-blue-700 border border-slate-300 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            From Junction
          </button>
          <button
            onClick={() => setActiveTab('discard')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'discard'
                ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-sm'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            Discard
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Tab 1: Undo By Distance */}
          {activeTab === 'distance' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Rewind the recorded path backwards by a specific distance. Raw GPS samples remain preserved in SQLite with <span className="font-mono font-bold text-amber-700">accepted = 0</span>.
              </p>

              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((meters) => (
                  <button
                    key={meters}
                    disabled={isApplying}
                    onClick={() => handleApplyDistance(meters)}
                    className="py-3 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-center text-sm font-black text-blue-700 hover:text-blue-900 transition active:scale-95 cursor-pointer disabled:opacity-50 min-h-[48px]"
                  >
                    -{meters}m
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={customMeters}
                  onChange={(e) => setCustomMeters(e.target.value)}
                  placeholder="Custom meters"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                />
                <button
                  disabled={isApplying || !customMeters}
                  onClick={() => handleApplyDistance(Number(customMeters))}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  Undo Custom
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Undo By Time */}
          {activeTab === 'time' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Truncate points recorded within the last duration. Useful when you walked into a dead-end alley for 1 or 2 minutes.
              </p>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '30s', secs: 30 },
                  { label: '1m', secs: 60 },
                  { label: '2m', secs: 120 },
                  { label: '5m', secs: 300 },
                ].map((item) => (
                  <button
                    key={item.secs}
                    disabled={isApplying}
                    onClick={() => handleApplyTime(item.secs)}
                    className="py-3 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-center text-sm font-black text-blue-700 hover:text-blue-900 transition active:scale-95 cursor-pointer disabled:opacity-50 min-h-[48px]"
                  >
                    -{item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="number"
                  min="5"
                  max="1800"
                  value={customSeconds}
                  onChange={(e) => setCustomSeconds(e.target.value)}
                  placeholder="Custom seconds"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                />
                <button
                  disabled={isApplying || !customSeconds}
                  onClick={() => handleApplyTime(Number(customSeconds))}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  Undo Custom
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Restart from Junction */}
          {activeTab === 'junction' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Select an existing junction along this path to truncate all subsequent points and continue recording from that junction node.
              </p>

              {junctions.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-600 text-xs font-medium">
                  No junctions have been added to this path session yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {junctions.map((j) => (
                    <label
                      key={j.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                        selectedJunctionId === j.id
                          ? 'bg-blue-50 border-blue-500 text-blue-950'
                          : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="junction_select"
                          value={j.id}
                          checked={selectedJunctionId === j.id}
                          onChange={() => setSelectedJunctionId(j.id)}
                          className="accent-blue-600 w-4 h-4"
                        />
                        <div>
                          <span className="text-xs font-bold block text-slate-900">{j.operationalLabel}</span>
                          {j.displayName && (
                            <span className="text-[11px] text-slate-600 block">{j.displayName}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono font-bold">
                        Seq #{j.sequenceNumber}
                      </span>
                    </label>
                  ))}

                  <button
                    disabled={isApplying || !selectedJunctionId}
                    onClick={handleApplyJunctionRestart}
                    className="w-full mt-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    Restart Recording From Selected Junction
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Discard Path */}
          {activeTab === 'discard' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="font-medium">
                  Discarding will completely erase the currently active recording session and reset the mapper workspace.
                </p>
              </div>

              {!confirmDiscard ? (
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(true)}
                  className="w-full py-3.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition cursor-pointer min-h-[48px]"
                >
                  Discard Entire Unsaved Path...
                </button>
              ) : (
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-rose-300">
                  <p className="text-xs font-bold text-rose-900">
                    Are you sure you want to discard this path?
                  </p>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setConfirmDiscard(false)}
                      className="flex-1 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={handleApplyDiscard}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer disabled:opacity-50 min-h-[44px]"
                    >
                      Yes, Discard Path
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
