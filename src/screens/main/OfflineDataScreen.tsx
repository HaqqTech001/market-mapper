import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header, Card, Button, Badge } from '../../components/ui';
import {
  HardDrive,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Database,
  Layers,
  FileText,
  Camera,
  AlertTriangle,
  Radio,
  ShieldAlert,
} from 'lucide-react';

export const OfflineDataScreen: React.FC = () => {
  const {
    isOffline,
    toggleOffline,
    syncStatus,
    pendingSyncCount,
    unreadNotifsCount,
    goBack,
    dbStats,
    triggerSync,
    resetDb,
    refreshDbStats,
    isDev,
  } = useApp();

  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleExecuteReset = async () => {
    setResetting(true);
    const res = await resetDb(true);
    setResetting(false);
    setShowConfirmModal(false);
    setResetResult(res.message);
    setTimeout(() => setResetResult(null), 4000);
  };

  return (
    <div className="flex flex-col grow">
      <Header
        title="Offline Data & Storage"
        subtitle="Local SQLite operational engine"
        showBack
        onBack={goBack}
        isOffline={isOffline}
        onToggleOffline={toggleOffline}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        unreadNotifsCount={unreadNotifsCount}
      />

      <div className="p-4 sm:p-6 max-w-3xl w-full mx-auto space-y-5 grow">
        {/* Engine Status Banner */}
        <Card padding="md" className="border-emerald-200 bg-emerald-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900">On-Device Offline Storage</h3>
                  <Badge variant="success" size="sm">
                    Healthy
                  </Badge>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">
                  All field captures and corridor paths are stored safely on this device first.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={triggerSync}
              disabled={isOffline || syncStatus === 'syncing'}
              isLoading={syncStatus === 'syncing'}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </Card>

        {resetResult && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resetResult}</span>
          </div>
        )}

        {/* Storage Overview Stats Grid */}
        <div>
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2.5 px-1">
            Device Storage Status
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card padding="sm" className="space-y-1">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-semibold">Local Stalls</span>
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <strong className="text-lg font-black text-zinc-900 block">
                {dbStats.businessesCount}
              </strong>
              <span className="text-[10px] text-zinc-500">Saved on Device</span>
            </Card>

            <Card padding="sm" className="space-y-1">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-semibold">Corridor Paths</span>
                <Radio className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <strong className="text-lg font-black text-zinc-900 block">
                {dbStats.pathsCount}
              </strong>
              <span className="text-[10px] text-zinc-500">Recorded Paths</span>
            </Card>

            <Card padding="sm" className="space-y-1">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-semibold">Pending Upload</span>
                <FileText className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <strong className="text-lg font-black text-zinc-900 block">
                {pendingSyncCount}
              </strong>
              <span className="text-[10px] text-amber-600 font-semibold">Waiting for Sync</span>
            </Card>

            <Card padding="sm" className="space-y-1">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-semibold">Photos</span>
                <Camera className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <strong className="text-lg font-black text-zinc-900 block">
                {dbStats.pendingMediaUploadCount}
              </strong>
              <span className="text-[10px] text-zinc-500">Queued for Cloud</span>
            </Card>

            <Card padding="sm" className="space-y-1">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-semibold">Flagged Revisits</span>
                <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
              </div>
              <strong className="text-lg font-black text-zinc-900 block">
                {dbStats.revisitsCount}
              </strong>
              <span className="text-[10px] text-zinc-500">To Review</span>
            </Card>

            <Card padding="sm" className="space-y-1">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-semibold">Handovers</span>
                <Database className="w-3.5 h-3.5 text-zinc-600" />
              </div>
              <strong className="text-lg font-black text-zinc-900 block">
                {dbStats.catalogueCount}
              </strong>
              <span className="text-[10px] text-zinc-500">Saved Handovers</span>
            </Card>
          </div>
        </div>

        {/* Development-Only Database Maintenance (Strictly hidden in production) */}
        {isDev && (
          <Card padding="md" className="border-amber-200 bg-amber-50/30 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Database Diagnostics
              </h4>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Diagnostic controls to verify offline cache health and test reset procedures.
            </p>

            {pendingSyncCount > 0 && (
              <div className="p-2.5 bg-amber-100/70 border border-amber-300/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Caution: {pendingSyncCount} unsynced records</span>
                  <span>Resetting will discard unpushed changes. Sync first if connected.</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">
                Total Schema Tables: <strong>{dbStats.totalTables}</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(true)}
                icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
                className="text-red-600 hover:bg-red-50 border-red-200"
              >
                Reset SQLite Database (Dev Only)
              </Button>
            </div>
          </Card>
        )}

        {/* Explicit Confirmation Dialog */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-zinc-200">
              <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-zinc-900">Confirm SQLite Reset</h3>
                <p className="text-xs text-zinc-600">
                  This development action will re-execute schema migrations and reload the minimal test seed.
                </p>
                {pendingSyncCount > 0 && (
                  <p className="text-xs font-bold text-red-600 pt-1">
                    Warning: {pendingSyncCount} unsynced records will be permanently erased!
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => setShowConfirmModal(false)}
                  disabled={resetting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={handleExecuteReset}
                  isLoading={resetting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirm Reset
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
