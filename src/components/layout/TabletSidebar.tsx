import React from 'react';
import {
  Home,
  MapPin,
  Flag,
  MessageSquare,
  Bell,
  RotateCcw,
  HardDrive,
  BookOpen,
  User,
  ShieldCheck,
  LogOut,
  Smartphone,
  Tablet as TabletIcon,
  Monitor,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppRoute, UserRole } from '../../types';
import { Avatar, Badge } from '../ui';

export const TabletSidebar: React.FC = () => {
  const {
    currentRoute,
    navigateTo,
    currentUser,
    isAdmin,
    setUserRole,
    logout,
    unreadNotifsCount,
    previewDeviceMode,
    setPreviewDeviceMode,
    isDev,
  } = useApp();

  const mainNavItems: { route: AppRoute; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { route: 'home', label: 'Home', icon: Home },
    { route: 'map', label: 'Map Workspace', icon: MapPin },
    { route: 'missions', label: 'Missions', icon: Flag },
    { route: 'chat', label: 'Field Chat', icon: MessageSquare },
    { route: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifsCount },
  ];

  const fieldTools: { route: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { route: 'revisits', label: 'Revisits Queue', icon: RotateCcw },
    { route: 'offline', label: 'Offline & Sync', icon: HardDrive },
    { route: 'guide', label: 'Field Guide', icon: BookOpen },
    { route: 'profile', label: 'Mapper Profile', icon: User },
  ];

  return (
    <aside
      id="tablet-sidebar"
      className="w-64 shrink-0 bg-white border-r border-zinc-200 flex flex-col justify-between h-screen select-none sticky top-0"
    >
      {/* Top Branding & User Profile */}
      <div className="p-4 border-b border-zinc-100">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black shadow-xs">
            MM
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 leading-tight">Market Mapper</h2>
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest">
              Field Operations
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 bg-zinc-50 border border-zinc-200/70 rounded-xl">
          <div className="flex items-center gap-2.5">
            <Avatar name={currentUser.fullName} src={currentUser.avatarUrl} size="sm" status="online" />
            <div className="min-w-0 grow">
              <p className="text-xs font-bold text-zinc-900 truncate">{currentUser.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
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
                  {currentUser.role.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Development-Only Role Switcher for Inspection (Strictly hidden in production) */}
          {isDev && (
            <div className="mt-2.5 pt-2 border-t border-zinc-200/60 flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-800">[DEV] Role:</span>
              <div className="flex items-center gap-1">
                {(['mapper', 'team_lead', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setUserRole(r)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      currentUser.role === r
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                    }`}
                    title={`Switch preview role to ${r}`}
                  >
                    {r === 'team_lead' ? 'Lead' : r === 'admin' ? 'Admin' : 'Map'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="p-3 overflow-y-auto grow space-y-4">
        <div>
          <span className="px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Operations
          </span>
          <nav className="mt-1 space-y-0.5">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => navigateTo(item.route)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <span className="px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Field Utilities
          </span>
          <nav className="mt-1 space-y-0.5">
            {fieldTools.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => navigateTo(item.route)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Role-Gated Admin Workspace (Only rendered for Admin role as required) */}
        {isAdmin && (
          <div>
            <span className="px-3 text-[10px] font-bold text-orange-700 uppercase tracking-wider">
              Management
            </span>
            <div className="mt-1">
              <button
                onClick={() => navigateTo('admin')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentRoute === 'admin'
                    ? 'bg-orange-50 text-orange-900 font-bold border border-orange-200'
                    : 'text-zinc-700 hover:bg-orange-50/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-orange-600" />
                <span>Admin Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Tools: Viewport preview simulator & Sign Out */}
      <div className="p-3 border-t border-zinc-200 bg-zinc-50/70 space-y-2">
        {/* Device Viewport Mode Switcher for Preview (Strictly hidden in production) */}
        {isDev && (
          <div className="flex items-center justify-between p-1.5 bg-white border border-amber-200/80 rounded-lg">
            <span className="text-[10px] font-bold text-amber-900 pl-1">[DEV] Preview:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPreviewDeviceMode('phone')}
                className={`p-1 rounded cursor-pointer ${
                  previewDeviceMode === 'phone' ? 'bg-emerald-100 text-emerald-800' : 'text-zinc-400'
                }`}
                title="Force Phone View"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewDeviceMode('tablet')}
                className={`p-1 rounded cursor-pointer ${
                  previewDeviceMode === 'tablet' ? 'bg-emerald-100 text-emerald-800' : 'text-zinc-400'
                }`}
                title="Force Tablet Split View"
              >
                <TabletIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewDeviceMode('auto')}
                className={`p-1 rounded cursor-pointer ${
                  previewDeviceMode === 'auto' ? 'bg-emerald-100 text-emerald-800' : 'text-zinc-400'
                }`}
                title="Auto Responsive View"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
