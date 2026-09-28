import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export interface OfflineBannerProps {
  isOffline: boolean;
  pendingCount?: number;
  onSyncNow?: () => void;
  isSyncing?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  pendingCount = 0,
  onSyncNow,
  isSyncing = false,
}) => {
  if (!isOffline && pendingCount === 0) return null;

  return (
    <div
      role="status"
      className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-xs font-semibold select-none border-b transition-colors ${
        isOffline
          ? 'bg-amber-500 text-amber-950 border-amber-600/20'
          : 'bg-emerald-50 text-emerald-900 border-emerald-200'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isOffline ? (
          <WifiOff className="w-4 h-4 shrink-0 text-amber-950" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
        )}
        <span className="truncate">
          {isOffline
            ? `Offline Mode Active — ${pendingCount} change${pendingCount === 1 ? '' : 's'} stored locally in SQLite`
            : `${pendingCount} item${pendingCount === 1 ? '' : 's'} pending synchronization`}
        </span>
      </div>

      {onSyncNow && !isOffline && (
        <button
          onClick={onSyncNow}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 text-[11px] font-bold cursor-pointer transition-all shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      )}
    </div>
  );
};
