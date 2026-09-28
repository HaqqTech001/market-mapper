/**
 * Market Mapper — Admin Workspace
 * Phase 2 Implementation: Role Management, User Status, Audit Trails & Catalogue Review
 *
 * SECURITY DIRECTIVE (Correction 1):
 * Non-admins who navigate here are completely blocked. Privileged components and
 * data are NEVER rendered or loaded behind warning banners.
 * The client guard provides immediate feedback, while Supabase RLS and SECURITY DEFINER
 * functions provide the authoritative security boundary.
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Header, Card, Button, Badge, Chip, Input } from '../../components/ui';
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Lock,
  ArrowLeft,
  Search,
  UserCheck,
  UserX,
  AlertTriangle,
  History,
  ShieldAlert,
} from 'lucide-react';
import { Profile, UserRole } from '../../types';
import { AuthService } from '../../lib/auth/authService';

interface AuditEntry {
  id: string;
  actorName: string;
  targetName: string;
  action: 'role_changed' | 'user_deactivated' | 'user_reactivated';
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export const AdminScreen: React.FC = () => {
  const {
    currentUser,
    isAdmin,
    isOffline,
    toggleOffline,
    syncStatus,
    pendingSyncCount,
    unreadNotifsCount,
    goBack,
    navigateTo,
  } = useApp();

  // --------------------------------------------------------------------------
  // STRICT ROUTE BLOCKING (Correction 1)
  // Non-admins are blocked from rendering or loading ANY privileged content.
  // --------------------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div className="flex flex-col grow bg-slate-50 min-h-screen">
        <Header
          title="Access Denied"
          showBack
          onBack={() => navigateTo('more')}
          isOffline={isOffline}
          onToggleOffline={toggleOffline}
          syncStatus={syncStatus}
          pendingSyncCount={pendingSyncCount}
          unreadNotifsCount={unreadNotifsCount}
        />
        <div className="p-8 max-w-md mx-auto my-auto text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Privileged Workspace Restricted</h2>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Your account is assigned the role <strong className="text-zinc-900 font-semibold">{currentUser.role}</strong>. Access to the administrative workspace requires active <strong className="text-orange-700 font-semibold">Admin</strong> authorization.
          </p>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-[11px] text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              <span>Security Enforcement Notice</span>
            </div>
            <p className="text-amber-800">
              Access to administrative controls is restricted to authorized operations managers and system administrators.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Button variant="primary" size="md" onClick={() => navigateTo('home')}>
              Return to Field Home
            </Button>
            <Button variant="outline" size="md" onClick={() => navigateTo('more')}>
              Back to Operations Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ADMIN AUTHORIZED LOGIC & STATE
  // Loaded ONLY when user is an authenticated Admin
  // --------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'catalogue' | 'teams'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Managed User Profiles
  const [userRoster, setUserRoster] = useState<Profile[]>([
    {
      id: 'usr_admin_01',
      fullName: 'Dr. Folashade Adeleke',
      email: 'folashade.adeleke@marketmapper.org',
      phone: '+234 809 555 1122',
      role: 'admin',
      isActive: true,
      createdAt: '2026-06-01T08:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'usr_lead_01',
      fullName: 'Ibrahim Danladi',
      email: 'ibrahim.danladi@field.marketmapper.org',
      phone: '+234 802 987 6543',
      role: 'team_lead',
      isActive: true,
      createdAt: '2026-07-15T08:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'usr_mapper_01',
      fullName: 'Chioma Adebayo',
      email: 'chioma.adebayo@field.marketmapper.org',
      phone: '+234 803 123 4567',
      role: 'mapper',
      isActive: true,
      createdAt: '2026-08-01T08:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'usr_mapper_02',
      fullName: 'Emeka Eze',
      email: 'emeka.eze@field.marketmapper.org',
      phone: '+234 803 555 7788',
      role: 'mapper',
      isActive: true,
      createdAt: '2026-08-10T08:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'usr_mapper_03',
      fullName: 'Fatima Bello',
      email: 'fatima.bello@field.marketmapper.org',
      phone: '+234 802 111 2233',
      role: 'mapper',
      isActive: false, // Deactivated test account
      createdAt: '2026-08-12T08:00:00Z',
      updatedAt: '2026-09-05T14:00:00Z',
    },
  ]);

  // Audit Logs (Phase 2L)
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([
    {
      id: 'log_01',
      actorName: 'Dr. Folashade Adeleke',
      targetName: 'Fatima Bello',
      action: 'user_deactivated',
      oldValue: 'true',
      newValue: 'false',
      timestamp: '2026-09-05 14:00 UTC',
    },
    {
      id: 'log_02',
      actorName: 'Dr. Folashade Adeleke',
      targetName: 'Ibrahim Danladi',
      action: 'role_changed',
      oldValue: 'mapper',
      newValue: 'team_lead',
      timestamp: '2026-08-15 09:30 UTC',
    },
  ]);

  // Catalogue suggestions for review
  const [suggestions, setSuggestions] = useState([
    {
      id: 'sug_01',
      name: 'Lithium LiFePO4 Server Rack Battery',
      itemType: 'product',
      suggestedCategory: 'Electronics & Solar Power',
      suggestedBy: 'Chioma Adebayo (Mapper)',
      notes: 'Common in Alaba Line B for high-end solar installations (48V 100Ah/200Ah).',
      status: 'pending',
    },
    {
      id: 'sug_02',
      name: 'Inverter Transformer Rewinding Service',
      itemType: 'service',
      suggestedCategory: 'Electronics & Solar Power',
      suggestedBy: 'Emeka Eze (Mapper)',
      notes: 'Specialized copper rewinding for burnt inverter transformers.',
      status: 'pending',
    },
  ]);

  // Modal State for Role Change Confirmation
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [targetNewRole, setTargetNewRole] = useState<UserRole | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  // Handle Role Change Execution (Phase 2G)
  const handleConfirmRoleChange = async () => {
    if (!selectedUser || !targetNewRole) return;

    // Self-lockout prevention check
    if (selectedUser.id === currentUser.id && targetNewRole !== 'admin') {
      setFeedbackMessage({
        type: 'error',
        text: 'Self-lockout prevented: You cannot demote your own account from Admin.',
      });
      setShowRoleModal(false);
      return;
    }

    setActionLoading(true);
    const res = await AuthService.adminUpdateUserRole(selectedUser.id, targetNewRole);
    setActionLoading(false);
    setShowRoleModal(false);

    // Apply change locally for immediate UI reactivity
    setUserRoster((prev) =>
      prev.map((u) => (u.id === selectedUser.id ? { ...u, role: targetNewRole } : u))
    );

    // Record audit entry
    const newEntry: AuditEntry = {
      id: `log_${Date.now()}`,
      actorName: currentUser.fullName,
      targetName: selectedUser.fullName,
      action: 'role_changed',
      oldValue: selectedUser.role,
      newValue: targetNewRole,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    };
    setAuditLogs((prev) => [newEntry, ...prev]);

    setFeedbackMessage({
      type: 'success',
      text: `Updated role for ${selectedUser.fullName} to ${targetNewRole.replace('_', ' ').toUpperCase()}.`,
    });
  };

  // Handle Deactivation / Reactivation (Phase 2H)
  const handleConfirmStatusToggle = async () => {
    if (!selectedUser) return;

    const nextStatus = !selectedUser.isActive;

    // Self-lockout prevention check
    if (selectedUser.id === currentUser.id && !nextStatus) {
      setFeedbackMessage({
        type: 'error',
        text: 'Self-lockout prevented: You cannot deactivate your own administrative account.',
      });
      setShowDeactivateModal(false);
      return;
    }

    setActionLoading(true);
    const res = await AuthService.adminSetUserActiveStatus(selectedUser.id, nextStatus);
    setActionLoading(false);
    setShowDeactivateModal(false);

    setUserRoster((prev) =>
      prev.map((u) => (u.id === selectedUser.id ? { ...u, isActive: nextStatus } : u))
    );

    // Record audit entry
    const newEntry: AuditEntry = {
      id: `log_${Date.now()}`,
      actorName: currentUser.fullName,
      targetName: selectedUser.fullName,
      action: nextStatus ? 'user_reactivated' : 'user_deactivated',
      oldValue: String(!nextStatus),
      newValue: String(nextStatus),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    };
    setAuditLogs((prev) => [newEntry, ...prev]);

    setFeedbackMessage({
      type: 'success',
      text: `Account for ${selectedUser.fullName} is now ${nextStatus ? 'ACTIVE' : 'DEACTIVATED'}.`,
    });
  };

  const filteredUsers = userRoster.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col grow bg-slate-50 min-h-screen">
      <Header
        title="Admin Workspace"
        subtitle="Role architecture, user accounts & audit logs"
        showBack
        onBack={goBack}
        isOffline={isOffline}
        onToggleOffline={toggleOffline}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        unreadNotifsCount={unreadNotifsCount}
      />

      <div className="p-4 sm:p-6 max-w-5xl w-full mx-auto space-y-5 grow">
        {/* Feedback Banner */}
        {feedbackMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 overflow-x-auto">
          <Chip
            label="User Roles & Accounts"
            selected={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            count={userRoster.length}
          />
          <Chip
            label="Audit Trail"
            selected={activeTab === 'audit'}
            onClick={() => setActiveTab('audit')}
            count={auditLogs.length}
          />
          <Chip
            label="Catalogue Review"
            selected={activeTab === 'catalogue'}
            onClick={() => setActiveTab('catalogue')}
            count={suggestions.length}
          />
          <Chip
            label="Survey Teams"
            selected={activeTab === 'teams'}
            onClick={() => setActiveTab('teams')}
          />
        </div>

        {/* TAB 1: USER ROLES & STATUS MANAGEMENT (Phase 2E, 2G, 2H) */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">User Profiles & Privilege Roles</h3>
                <p className="text-xs text-zinc-500">
                  Manage mapper assignments, team lead promotions, and account deactivations
                </p>
              </div>
              <div className="w-full sm:w-64">
                <Input
                  placeholder="Search user by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leadingIcon={<Search className="w-4 h-4" />}
                />
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-zinc-100">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-zinc-900">{user.fullName}</span>
                      <Badge
                        variant={user.role === 'admin' ? 'accent' : user.role === 'team_lead' ? 'warning' : 'neutral'}
                        size="sm"
                      >
                        {user.role === 'admin' ? 'Admin' : user.role === 'team_lead' ? 'Team Lead' : 'Mapper'}
                      </Badge>
                      <Badge variant={user.isActive ? 'success' : 'neutral'} size="sm">
                        {user.isActive ? 'Active' : 'Deactivated'}
                      </Badge>
                      {user.id === currentUser.id && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                          Current Session
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{user.email}</span>
                      {user.phone && (
                        <>
                          <span>•</span>
                          <span>{user.phone}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={user.role}
                      onChange={(e) => {
                        setSelectedUser(user);
                        setTargetNewRole(e.target.value as UserRole);
                        setShowRoleModal(true);
                      }}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="mapper">Role: Mapper</option>
                      <option value="team_lead">Role: Team Lead</option>
                      <option value="admin">Role: Admin</option>
                    </select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeactivateModal(true);
                      }}
                      className={
                        user.isActive
                          ? 'text-red-700 hover:bg-red-50 border-red-200'
                          : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                      }
                      icon={user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    >
                      {user.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT TRAIL (Phase 2L) */}
        {activeTab === 'audit' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Privileged Security Audit Log</h3>
                <p className="text-xs text-zinc-500">
                  Immutable record of role changes, team lead assignments, and account status mutations
                </p>
              </div>
            </div>

            <Card padding="none" className="overflow-hidden">
              <div className="divide-y divide-zinc-100 text-xs">
                {auditLogs.map((entry) => (
                  <div key={entry.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">{entry.actorName}</span>
                        <span className="text-zinc-400">performed</span>
                        <Badge
                          variant={entry.action === 'role_changed' ? 'accent' : entry.action === 'user_deactivated' ? 'danger' : 'success'}
                          size="sm"
                        >
                          {entry.action.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-zinc-400">on</span>
                        <strong className="text-zinc-800 font-semibold">{entry.targetName}</strong>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Previous state: <code className="bg-zinc-100 px-1 py-0.5 rounded">{entry.oldValue}</code> → New state:{' '}
                        <code className="bg-zinc-100 px-1 py-0.5 rounded font-bold">{entry.newValue}</code>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-zinc-400 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{entry.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: CATALOGUE SUGGESTIONS */}
        {activeTab === 'catalogue' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Pending Field Suggestions</h3>
              <p className="text-xs text-zinc-500">
                New goods or services submitted by mappers for canonical catalogue inclusion
              </p>
            </div>

            {suggestions.map((sug) => (
              <Card key={sug.id} padding="lg">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="accent" size="sm">
                        {sug.itemType}
                      </Badge>
                      <span className="text-xs font-semibold text-zinc-500">
                        {sug.suggestedCategory}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-zinc-900 mt-1">{sug.name}</h4>
                    <p className="text-xs text-zinc-600">{sug.notes}</p>
                    <p className="text-[11px] text-zinc-400 pt-1">
                      Suggested by: <strong className="text-zinc-700">{sug.suggestedBy}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSuggestions((prev) => prev.filter((s) => s.id !== sug.id))}
                      icon={<XCircle className="w-4 h-4 text-red-600" />}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSuggestions((prev) => prev.filter((s) => s.id !== sug.id))}
                      icon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Approve & Merge
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {suggestions.length === 0 && (
              <div className="text-center py-10 bg-white rounded-2xl border border-zinc-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-zinc-900">No Pending Suggestions</h4>
                <p className="text-xs text-zinc-500 mt-1">All mapper suggestions have been reviewed.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TEAMS */}
        {activeTab === 'teams' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Survey Teams & Coverage Units</h3>
              <p className="text-xs text-zinc-500">
                Field team leads and mapper assignments across informal market clusters
              </p>
            </div>

            <Card padding="md" className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">Lagos West Alpha</h4>
                <p className="text-xs text-zinc-500">Alaba International Market • 4 mappers, 1 lead (Ibrahim Danladi)</p>
              </div>
              <Badge variant="success" size="sm">
                Active in Field
              </Badge>
            </Card>

            <Card padding="md" className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">Island Survey Unit</h4>
                <p className="text-xs text-zinc-500">Balogun Market • 3 mappers, 1 lead</p>
              </div>
              <Badge variant="neutral" size="sm">
                Assigned
              </Badge>
            </Card>

            <Card padding="md" className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">Abuja Central Crew</h4>
                <p className="text-xs text-zinc-500">Wuse Market • 5 mappers, 1 lead</p>
              </div>
              <Badge variant="success" size="sm">
                Completed
              </Badge>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL: CONFIRM ROLE CHANGE (Phase 2G) */}
      {showRoleModal && selectedUser && targetNewRole && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card padding="lg" className="max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-zinc-900">Confirm Role Modification</h4>
                <p className="text-xs text-zinc-500">Database privilege modification</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to change <strong className="text-zinc-900">{selectedUser.fullName}</strong>&apos;s role from{' '}
              <code className="bg-zinc-100 px-1 py-0.5 rounded font-bold">{selectedUser.role}</code> to{' '}
              <code className="bg-orange-100 text-orange-800 px-1 py-0.5 rounded font-bold">{targetNewRole}</code>?
            </p>

            {selectedUser.id === currentUser.id && targetNewRole !== 'admin' && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs">
                <strong>Warning:</strong> You cannot demote your own administrator account. This operation will be rejected by the security trigger.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowRoleModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRoleChange}
                isLoading={actionLoading}
                className="bg-orange-700 hover:bg-orange-800 text-white"
              >
                Confirm Role Change
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: CONFIRM DEACTIVATION (Phase 2H) */}
      {showDeactivateModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card padding="lg" className="max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedUser.isActive ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {selectedUser.isActive ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-base font-bold text-zinc-900">
                  {selectedUser.isActive ? 'Deactivate User Account' : 'Reactivate User Account'}
                </h4>
                <p className="text-xs text-zinc-500">Field session access control</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              {selectedUser.isActive
                ? `Deactivating ${selectedUser.fullName}'s account will immediately revoke all cloud synchronization privileges and block session authentication.`
                : `Reactivating ${selectedUser.fullName}'s account will restore mission access and cloud data synchronization privileges.`}
            </p>

            {selectedUser.id === currentUser.id && selectedUser.isActive && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs">
                <strong>Warning:</strong> Administrators cannot deactivate their own account.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowDeactivateModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmStatusToggle}
                isLoading={actionLoading}
                className={
                  selectedUser.isActive
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }
              >
                {selectedUser.isActive ? 'Confirm Deactivation' : 'Confirm Reactivation'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
