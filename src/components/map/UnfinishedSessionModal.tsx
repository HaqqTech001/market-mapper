import React, { useState } from 'react';
import {
  AlertCircle,
  Play,
  CheckCircle,
  Trash2,
  Clock,
  Navigation2,
  GitBranch,
} from 'lucide-react';
import { ActivePathSession } from '../../types';

interface UnfinishedSessionModalProps {
  session: ActivePathSession;
  onResume: () => void;
  onReview: () => void;
  onDiscard: () => void;
}

export const UnfinishedSessionModal: React.FC<UnfinishedSessionModalProps> = ({
  session,
  onResume,
  onReview,
  onDiscard,
}) => {
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}m ${remaining}s`;
  };

  const startedTime = new Date(session.startedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="unfinished-session-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-slate-900"
    >
      <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Unfinished Mapping Found</h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              An interrupted path recording session was recovered from local SQLite storage.
            </p>
          </div>
        </div>

        {/* Telemetry Summary */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Distance</span>
            <span className="text-sm font-black font-mono text-emerald-700">
              {Math.round(session.distanceMeters)} m
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Walking Time</span>
            <span className="text-sm font-black font-mono text-blue-700">
              {formatTime(session.activeDurationSeconds || session.durationSeconds)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Junctions</span>
            <span className="text-sm font-black font-mono text-amber-700">
              {session.junctionsCount}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-700 font-medium leading-relaxed">
          Session began at <span className="font-bold text-slate-900">{startedTime}</span>. You can resume walking and extending this path, review and finalize the points recorded so far, or discard the session.
        </p>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <button
            id="recover-resume-btn"
            onClick={onResume}
            className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer min-h-[48px]"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Resume Recording</span>
          </button>

          <button
            id="recover-review-btn"
            onClick={onReview}
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
          >
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span>Review & Finish Path</span>
          </button>

          {!confirmDiscard ? (
            <button
              onClick={() => setConfirmDiscard(true)}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
            >
              Discard Unfinished Session...
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex items-center justify-between gap-3 text-xs">
              <span className="text-rose-900 font-bold">Permanently erase recovered data?</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDiscard(false)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="recover-discard-btn"
                  onClick={onDiscard}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
