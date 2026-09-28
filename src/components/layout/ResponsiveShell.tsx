import React from 'react';
import { useApp } from '../../context/AppContext';
import { PhoneTabBar } from './PhoneTabBar';
import { TabletSidebar } from './TabletSidebar';
import { OfflineBanner } from '../ui';
import { Smartphone, Tablet as TabletIcon, Monitor, ShieldAlert, LogOut } from 'lucide-react';

export const ResponsiveShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentUser,
    isAuthenticated,
    logout,
    isTabletView,
    isOffline,
    pendingSyncCount,
    triggerSync,
    syncStatus,
    previewDeviceMode,
    setPreviewDeviceMode,
    isDev,
  } = useApp();

  // If unauthenticated (Auth screens), show directly without shell bars
  if (!isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 flex flex-col">{children}</div>;
  }

  // Deactivated Account Guard (Option B: profile loading detects is_active = false)
  // Operational navigation and workflow screens are blocked while in an Inactive Account state
  if (!currentUser.isActive) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center antialiased text-zinc-900">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-red-200 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Account Deactivated</h2>
            <p className="text-sm text-zinc-600 mt-2">
              Your account ({currentUser.email}) has been marked as inactive by an administrator. Operational features, data mapping, and mission assignments are disabled.
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl text-xs text-red-700 text-left border border-red-100 leading-relaxed">
            <strong>Security Notice:</strong> All survey actions and synchronized records are restricted until re-enabled by an administrator.
          </div>
          <button
            onClick={logout}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-zinc-900">
      {/* Global Offline / Pending Sync Alert Banner */}
      <OfflineBanner
        isOffline={isOffline}
        pendingCount={pendingSyncCount}
        onSyncNow={triggerSync}
        isSyncing={syncStatus === 'syncing'}
      />

      {/* Adaptive Layout Container */}
      <div className="flex grow w-full">
        {/* Tablet Master Sidebar (>= 768px or forced tablet mode) */}
        {isTabletView && <TabletSidebar />}

        {/* Main Content Viewport */}
        <div className={`flex flex-col grow min-w-0 ${isTabletView ? 'h-screen overflow-y-auto' : 'pb-20'}`}>
          {/* Quick Floating Viewport Mode Bar (Strictly hidden in production) */}
          {!isTabletView && isDev && (
            <div className="bg-amber-50/90 border-b border-amber-200 px-3 py-1 flex items-center justify-between text-[11px] font-semibold text-amber-900 select-none">
              <span>[DEV] Mobile Phone View</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-amber-700">Switch:</span>
                <button
                  onClick={() => setPreviewDeviceMode('tablet')}
                  className="px-1.5 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 cursor-pointer text-[10px] font-bold"
                >
                  Tablet View
                </button>
              </div>
            </div>
          )}

          <div className="grow flex flex-col">{children}</div>
        </div>
      </div>

      {/* Phone Bottom Tab Bar (< 768px or forced phone mode) */}
      {!isTabletView && <PhoneTabBar />}
    </div>
  );
};
