import React from 'react';
import { SyncStatus } from '../../types';
import { CheckCircle2, RefreshCw, Clock, AlertTriangle, XCircle, HardDrive } from 'lucide-react';

export interface SyncStatusBadgeProps {
  status: SyncStatus;
  pendingCount?: number;
  onClick?: () => void;
  className?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  pendingCount,
  onClick,
  className = '',
}) => {
  const configs: Record<
    SyncStatus,
    { label: string; icon: React.ReactNode; bg: string; text: string; border: string }
  > = {
    synced: {
      label: 'Synced',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
    },
    syncing: {
      label: 'Syncing',
      icon: <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin" />,
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
    },
    pending: {
      label: pendingCount !== undefined ? `Pending (${pendingCount})` : 'Pending',
      icon: <Clock className="w-3 h-3 text-amber-600" />,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
    local_only: {
      label: 'Saved on Device',
      icon: <HardDrive className="w-3 h-3 text-zinc-600" />,
      bg: 'bg-zinc-100',
      text: 'text-zinc-800',
      border: 'border-zinc-200',
    },
    conflict: {
      label: 'Conflict',
      icon: <AlertTriangle className="w-3 h-3 text-orange-600" />,
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-300',
    },
    failed: {
      label: 'Sync Failed',
      icon: <XCircle className="w-3 h-3 text-red-600" />,
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
    },
  };

  const config = configs[status] || configs.local_only;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border select-none transition-all ${
        onClick ? 'cursor-pointer hover:opacity-85' : 'cursor-default'
      } ${config.bg} ${config.text} ${config.border} ${className}`}
      title={`Sync Status: ${config.label}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </button>
  );
};
