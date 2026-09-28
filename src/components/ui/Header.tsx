import React from 'react';
import { ChevronLeft, Bell, Wifi, WifiOff } from 'lucide-react';
import { IconButton } from './IconButton';
import { SyncStatusBadge } from './SyncStatusBadge';
import { SyncStatus } from '../../types';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  isOffline?: boolean;
  onToggleOffline?: () => void;
  syncStatus?: SyncStatus;
  pendingSyncCount?: number;
  unreadNotifsCount?: number;
  onPressNotifications?: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  isOffline = false,
  onToggleOffline,
  syncStatus = 'local_only',
  pendingSyncCount = 0,
  unreadNotifsCount = 0,
  onPressNotifications,
  className = '',
}) => {
  return (
    <header
      className={`sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200 py-2.5 px-3 sm:px-5 transition-all select-none ${className}`}
    >
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Left: Back button or Title */}
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-1 text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="truncate">
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-zinc-500 font-medium truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right Actions & Status Indicators */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Sync Status Badge */}
          <SyncStatusBadge status={syncStatus} pendingCount={pendingSyncCount} />

          {/* Offline Mode Toggle for Testing & Field Indicator */}
          {onToggleOffline && (
            <button
              onClick={onToggleOffline}
              title={isOffline ? 'Offline Mode Active. Click to simulate Online.' : 'Online. Click to simulate Offline.'}
              className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs transition-colors cursor-pointer ${
                isOffline
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            </button>
          )}

          {/* Notification Bell */}
          {onPressNotifications && (
            <IconButton
              icon={<Bell className="w-4 h-4 text-zinc-700" />}
              label="Notifications"
              variant="ghost"
              size="sm"
              badge={unreadNotifsCount > 0 ? unreadNotifsCount : undefined}
              onClick={onPressNotifications}
            />
          )}

          {/* Optional Right Action Slot */}
          {rightAction}
        </div>
      </div>
    </header>
  );
};
