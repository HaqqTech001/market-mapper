import React from 'react';
import { useApp } from '../../context/AppContext';
import { Header, Card, Avatar, Badge, Button, Divider } from '../../components/ui';
import {
  User,
  RotateCcw,
  HardDrive,
  BookOpen,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { UserRole } from '../../types';

export const MoreScreen: React.FC = () => {
  const {
    currentUser,
    isAdmin,
    setUserRole,
    navigateTo,
    logout,
    isOffline,
    toggleOffline,
    syncStatus,
    pendingSyncCount,
    unreadNotifsCount,
    dbStats,
    triggerSync,
    isDev,
  } = useApp();

  return (
    <div className="flex flex-col grow">
      <Header
        title="More Options"
        subtitle="Field tools, settings & administration"
        isOffline={isOffline}
        onToggleOffline={toggleOffline}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        unreadNotifsCount={unreadNotifsCount}
        onPressNotifications={() => navigateTo('notifications')}
      />

      <div className="p-4 sm:p-6 max-w-2xl w-full mx-auto space-y-5 grow">
        {/* User Profile Card */}
        <Card
          padding="md"
          variant="interactive"
          onClick={() => navigateTo('profile')}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={currentUser.fullName} src={currentUser.avatarUrl} size="md" status="online" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 truncate">{currentUser.fullName}</h3>
              <p className="text-xs text-zinc-500 truncate">{currentUser.email}</p>
              <div className="mt-1">
                <Badge
                  variant={
                    currentUser.role === 'admin'
                      ? 'accent'
                      : currentUser.role === 'team_lead'
                      ? 'warning'
                      : 'success'
                  }
                  size="sm"
                >
                  Role: {currentUser.role.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
        </Card>

        {/* Development-Only Role Tester for Inspection (Strictly hidden in production) */}
        {isDev && (
          <Card padding="md" className="border-amber-200 bg-amber-50/20">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
              <span className="text-xs font-bold text-amber-950">[DEV ONLY] Role Simulator</span>
              <span className="text-[11px] text-amber-700 font-semibold">Active: {currentUser.role}</span>
            </div>
            <p className="text-[11px] text-zinc-600 my-2">
              Preview-only role switcher to verify role-gated UI states (e.g. Admin Workspace). This does not modify production Supabase credentials or database permissions.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['mapper', 'team_lead', 'admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setUserRole(role)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    currentUser.role === role
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {role === 'team_lead' ? 'Team Lead' : role === 'admin' ? 'Admin' : 'Mapper'}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Core Field Tools */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">
            Operational Modules
          </h4>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100 shadow-2xs">
            <button
              onClick={() => navigateTo('revisits')}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Revisits Queue</span>
                  <span className="text-[11px] text-zinc-500">
                    Flagged stalls & locked shops needing follow-up
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  {dbStats.revisitsCount}
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
            </button>

            <button
              onClick={() => navigateTo('offline')}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Offline Data & Storage</span>
                  <span className="text-[11px] text-zinc-500">
                    Device storage health and upload status
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                  {pendingSyncCount} Pending
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
            </button>

            <button
              onClick={() => navigateTo('guide')}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Field Guide & Standards</span>
                  <span className="text-[11px] text-zinc-500">
                    Stall naming rules, corridor paths & trader etiquette
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Role-Gated Admin Workspace Menu Item (Explicitly mandated: ONLY shown for admin role) */}
        {isAdmin && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider px-1">
              Privileged Administration
            </h4>
            <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Admin Workspace</span>
                  <span className="text-[11px] text-zinc-600">
                    Catalogue reviews, team leads & project audit
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigateTo('admin')}
                className="bg-orange-700 hover:bg-orange-800 text-white"
              >
                Enter
              </Button>
            </div>
          </div>
        )}

        {/* Sign Out Action */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={logout}
            icon={<LogOut className="w-4 h-4 text-red-600" />}
            className="text-red-600 hover:bg-red-50 border-red-200"
          >
            Sign Out of Field Session
          </Button>
        </div>
      </div>
    </div>
  );
};
