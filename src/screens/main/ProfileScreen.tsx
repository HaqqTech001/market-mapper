import React from 'react';
import { useApp } from '../../context/AppContext';
import { Header, Card, Avatar, Badge, Button, Divider } from '../../components/ui';
import { User, Mail, Phone, Users, ShieldCheck, HardDrive, LogOut } from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const {
    currentUser,
    isOffline,
    toggleOffline,
    syncStatus,
    pendingSyncCount,
    unreadNotifsCount,
    goBack,
    logout,
    dbStats,
  } = useApp();

  return (
    <div className="flex flex-col grow">
      <Header
        title="Mapper Profile"
        subtitle="Field agent credential & device info"
        showBack
        onBack={goBack}
        isOffline={isOffline}
        onToggleOffline={toggleOffline}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        unreadNotifsCount={unreadNotifsCount}
      />

      <div className="p-4 sm:p-6 max-w-2xl w-full mx-auto space-y-5 grow">
        {/* User Card */}
        <Card padding="lg" className="flex flex-col items-center text-center">
          <Avatar name={currentUser.fullName} src={currentUser.avatarUrl} size="lg" status="online" />
          <h2 className="text-lg font-bold text-zinc-900 mt-3">{currentUser.fullName}</h2>
          <p className="text-xs text-zinc-500">{currentUser.email}</p>

          <div className="mt-2.5">
            <Badge
              variant={
                currentUser.role === 'admin'
                  ? 'accent'
                  : currentUser.role === 'team_lead'
                  ? 'warning'
                  : 'success'
              }
              size="md"
            >
              Role: {currentUser.role.replace('_', ' ')}
            </Badge>
          </div>
        </Card>

        {/* Profile Details */}
        <Card padding="md" className="divide-y divide-zinc-100">
          <div className="py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-zinc-500">
              <Mail className="w-4 h-4 text-emerald-700" />
              <span>Email</span>
            </div>
            <span className="font-semibold text-zinc-900">{currentUser.email}</span>
          </div>

          <div className="py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-zinc-500">
              <Phone className="w-4 h-4 text-emerald-700" />
              <span>Field Phone</span>
            </div>
            <span className="font-semibold text-zinc-900">{currentUser.phone || 'Not configured'}</span>
          </div>

          <div className="py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-zinc-500">
              <Users className="w-4 h-4 text-emerald-700" />
              <span>Assigned Team</span>
            </div>
            <span className="font-semibold text-zinc-900">Lagos West Alpha Unit</span>
          </div>

          <div className="py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-zinc-500">
              <HardDrive className="w-4 h-4 text-emerald-700" />
              <span>Local Offline Engine</span>
            </div>
            <span className="font-semibold text-zinc-900">SQLite v{dbStats.version} ({dbStats.totalTables} tables)</span>
          </div>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          size="md"
          fullWidth
          onClick={logout}
          icon={<LogOut className="w-4 h-4 text-red-600" />}
          className="text-red-600 hover:bg-red-50 border-red-200"
        >
          Sign Out of Account
        </Button>
      </div>
    </div>
  );
};
