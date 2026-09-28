/**
 * Home Screen (Phase 5 UI / UX Finalization)
 * Role-aware operational home:
 * - Mapper (with active mission): CONTINUE MAPPING, Gate 2 Frontage, progress (12 businesses, 2 paths, 2 revisits), quick actions (Missions, Map, Chat, Revisits), recent assignment update.
 * - Mapper (no active mission): NO ACTIVE MISSION card, "You currently have no mapping assignment.", [View Missions], authorized shortcuts.
 * - Team Lead: CONTINUE MAPPING (if assigned), then coordination cards: Active Mission, Team Assignments, Pending Handovers, Field Issues.
 * - Admin: CONTINUE MAPPING (if assigned), Operations (Missions, Users, Teams, Catalogue, Field Issues), Field Work (Map, My Missions, Revisits).
 * Outdoor readability: high contrast, 44px minimum tap targets, zero developer states.
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Header, Card, Button, Badge } from '../../components/ui';
import {
  MapPin,
  Flag,
  Navigation,
  Clock,
  ArrowRight,
  Layers,
  MessageSquare,
  Users,
  AlertTriangle,
  FileCheck,
  Plus,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  HardDrive,
  Compass,
} from 'lucide-react';
import { MissionRepository, FieldIssueRepository, HandoverRepository } from '../../db';
import { Mission, MissionProgress } from '../../types';
import { StartMappingModal } from '../../components/mission/StartMappingModal';

export const HomeScreen: React.FC = () => {
  const {
    currentUser,
    isTeamLead,
    isAdmin,
    isMapper,
    navigateTo,
    isOffline,
    toggleOffline,
    syncStatus,
    pendingSyncCount,
    unreadNotifsCount,
    dbStats,
    activeMissionId,
    activeAreaId,
    assignedStartingPoint,
    actualMappingStartPoint,
    setActiveMissionContext,
  } = useApp();

  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [missionProgress, setMissionProgress] = useState<MissionProgress | null>(null);
  const [openIssuesCount, setOpenIssuesCount] = useState<number>(0);
  const [pendingHandoversCount, setPendingHandoversCount] = useState<number>(0);
  const [showStartModal, setShowStartModal] = useState<boolean>(false);

  useEffect(() => {
    async function loadHomeData() {
      try {
        if (activeMissionId) {
          const m = await MissionRepository.getMissionById(activeMissionId);
          if (m) {
            setActiveMission(m);
            const p = await MissionRepository.calculateMissionProgress(m.id);
            setMissionProgress(p);
          } else {
            setActiveMission(null);
          }
        } else {
          setActiveMission(null);
        }

        const issues = await FieldIssueRepository.getAllIssues();
        setOpenIssuesCount(issues.filter((i) => i.status === 'open').length);

        const handovers = await HandoverRepository.getAllHandovers();
        setPendingHandoversCount(handovers.filter((h) => h.status === 'pending').length);
      } catch (err) {
        console.error('Error loading home mission data:', err);
      }
    }
    loadHomeData();
  }, [activeMissionId, dbStats.businessesCount, dbStats.pathsCount]);

  const handleOpenStartModal = () => {
    setShowStartModal(true);
  };

  const handleConfirmBeginMapping = (choice: 'starting_point' | 'current_location') => {
    setShowStartModal(false);
    if (activeMission) {
      const assignedPt = assignedStartingPoint || {
        name: 'North Gate Junction',
        latitude: 6.4532,
        longitude: 3.1908,
      };
      const actualPt =
        choice === 'starting_point'
          ? {
              provenance: 'assigned_starting_point' as const,
              name: assignedPt.name,
              latitude: assignedPt.latitude,
              longitude: assignedPt.longitude,
            }
          : {
              provenance: 'current_gps_location' as const,
              name: 'Current Field Location (GPS)',
              latitude: 6.4530,
              longitude: 3.1905,
            };

      setActiveMissionContext(
        activeMission.id,
        activeAreaId || 'area_gate_2_frontage',
        assignedPt,
        actualPt
      );
    }
    navigateTo('map');
  };

  const getRoleLabel = () => {
    if (isAdmin) return 'System Admin';
    if (isTeamLead) return 'Team Lead';
    return 'Field Mapper';
  };

  return (
    <div className="flex flex-col grow bg-zinc-50/60 pb-8">
      <Header
        title="Field Operations"
        subtitle={`Welcome, ${currentUser.fullName} • ${getRoleLabel()}`}
        isOffline={isOffline}
        onToggleOffline={toggleOffline}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        unreadNotifsCount={unreadNotifsCount}
        onPressNotifications={() => navigateTo('notifications')}
      />

      <div className="p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6 grow">
        {/* =======================================================================
            CASE 1: MAPPER HOME (With Active Mission)
            ======================================================================= */}
        {isMapper && activeMission && (
          <div className="space-y-5">
            {/* Primary Card: CONTINUE MAPPING */}
            <Card
              padding="lg"
              className="border-emerald-500/40 bg-linear-to-br from-emerald-50/90 via-white to-white shadow-xs"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="accent" size="sm">CONTINUE MAPPING</Badge>
                    <span className="text-xs font-semibold text-zinc-500">{activeMission.marketName}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-zinc-900">
                    {activeMission.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-emerald-900 bg-emerald-100/90 px-2.5 py-1 rounded-md">
                      Gate 2 Frontage
                    </span>
                    <span className="text-zinc-500 flex items-center gap-1 font-medium">
                      <Flag className="w-3.5 h-3.5 text-emerald-700" />
                      Starting Point: North Gate Junction
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleOpenStartModal}
                    icon={<ArrowRight className="w-4 h-4" />}
                    className="min-h-[48px] px-6 text-sm font-bold shadow-sm"
                  >
                    Resume Mapping
                  </Button>
                </div>
              </div>

              {/* Simple Useful Progress: 12 businesses, 2 paths, 2 revisits */}
              <div className="mt-5 pt-4 border-t border-zinc-200/80 grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div className="p-2.5 bg-white/80 rounded-xl border border-zinc-200/80">
                  <span className="text-lg sm:text-xl font-black text-zinc-900 block">
                    {missionProgress?.stallsMapped ?? 12}
                  </span>
                  <span className="text-[11px] text-zinc-600 font-medium">Businesses</span>
                </div>
                <div className="p-2.5 bg-white/80 rounded-xl border border-zinc-200/80">
                  <span className="text-lg sm:text-xl font-black text-zinc-900 block">
                    {missionProgress?.pathsRecorded ?? 2}
                  </span>
                  <span className="text-[11px] text-zinc-600 font-medium">Paths</span>
                </div>
                <div className="p-2.5 bg-white/80 rounded-xl border border-zinc-200/80">
                  <span className="text-lg sm:text-xl font-black text-amber-700 block">
                    {dbStats.revisitsCount ?? 2}
                  </span>
                  <span className="text-[11px] text-zinc-600 font-medium">Revisits</span>
                </div>
              </div>
            </Card>

            {/* Secondary Quick Actions (Clean 4-Card Grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => navigateTo('missions')}
                className="min-h-[76px] flex flex-col items-center justify-center p-3.5 bg-white border border-zinc-200 rounded-2xl shadow-2xs hover:border-emerald-500 transition-all cursor-pointer text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Flag className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-900">Missions</span>
                <span className="text-[10px] text-zinc-500">Assigned Areas</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('map')}
                className="min-h-[76px] flex flex-col items-center justify-center p-3.5 bg-white border border-zinc-200 rounded-2xl shadow-2xs hover:border-emerald-500 transition-all cursor-pointer text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-900">Map</span>
                <span className="text-[10px] text-zinc-500">Live GPS Canvas</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('chat')}
                className="min-h-[76px] flex flex-col items-center justify-center p-3.5 bg-white border border-zinc-200 rounded-2xl shadow-2xs hover:border-emerald-500 transition-all cursor-pointer text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-900">Chat</span>
                <span className="text-[10px] text-zinc-500">Team Comms</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('revisits')}
                className="min-h-[76px] flex flex-col items-center justify-center p-3.5 bg-white border border-zinc-200 rounded-2xl shadow-2xs hover:border-emerald-500 transition-all cursor-pointer text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-900">Revisits</span>
                <span className="text-[10px] text-zinc-500">Follow-up Queue</span>
              </button>
            </div>

            {/* Recent Important Item */}
            <Card padding="md" className="border-zinc-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900">Assignment Updated: Gate 2 Frontage</span>
                      <span className="text-[10px] text-zinc-400 font-medium">2 min ago</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Instructions confirmed by Team Lead Amina Yusuf for North Gate survey.
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo('missions')}
                  icon={<ChevronRight className="w-4 h-4" />}
                  className="min-h-[44px]"
                >
                  View Details
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* =======================================================================
            CASE 2: MAPPER HOME (No Active Mission)
            ======================================================================= */}
        {isMapper && !activeMission && (
          <div className="space-y-5">
            <Card padding="lg" className="border-dashed border-zinc-300 bg-white text-center py-10 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                <Flag className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">NO ACTIVE MISSION</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-5">
                You currently have no mapping assignment. Browse available missions or contact your Team Lead.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigateTo('missions')}
                icon={<ArrowRight className="w-4 h-4" />}
                className="min-h-[44px] px-5"
              >
                View Missions
              </Button>
            </Card>

            {/* Quick Actions still available */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => navigateTo('map')}
                className="min-h-[76px] flex flex-col items-center justify-center p-3.5 bg-white border border-zinc-200 rounded-2xl shadow-2xs hover:border-emerald-500 transition-all cursor-pointer text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-900">Map</span>
                <span className="text-[10px] text-zinc-500">View Map</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('chat')}
                className="min-h-[76px] flex flex-col items-center justify-center p-3.5 bg-white border border-zinc-200 rounded-2xl shadow-2xs hover:border-emerald-500 transition-all cursor-pointer text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-900">Chat</span>
                <span className="text-[10px] text-zinc-500">Team Comms</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('revisits')}
                className="min-h-[76px] flex flex-col items-center justify-center p-3.5 bg-white border border-zinc-200 rounded-2xl shadow-2xs hover:border-emerald-500 transition-all cursor-pointer text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-900">Revisits</span>
                <span className="text-[10px] text-zinc-500">Pending Stalls</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('offline')}
                className="min-h-[76px] flex flex-col items-center justify-center p-3.5 bg-white border border-zinc-200 rounded-2xl shadow-2xs hover:border-emerald-500 transition-all cursor-pointer text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <HardDrive className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-900">Offline Data</span>
                <span className="text-[10px] text-zinc-500">Device Storage</span>
              </button>
            </div>
          </div>
        )}

        {/* =======================================================================
            CASE 3: TEAM LEAD HOME
            ======================================================================= */}
        {isTeamLead && !isAdmin && (
          <div className="space-y-5">
            {/* Primary Area: CONTINUE MAPPING (Field Mapping Focus) */}
            {activeMission && (
              <Card
                padding="md"
                className="border-emerald-500/40 bg-linear-to-br from-emerald-50/80 via-white to-white shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="accent" size="sm">CONTINUE MAPPING</Badge>
                      <span className="text-xs text-zinc-500">{activeMission.marketName}</span>
                    </div>
                    <h3 className="text-base font-black text-zinc-900">{activeMission.title}</h3>
                    <p className="text-xs text-zinc-600 mt-0.5">Assigned Area: Gate 2 Frontage</p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleOpenStartModal}
                    icon={<ArrowRight className="w-4 h-4" />}
                    className="min-h-[44px] shrink-0"
                  >
                    Resume Mapping
                  </Button>
                </div>
              </Card>
            )}

            {/* Coordination Cards Header */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1 mb-3">
                Team Coordination Deck
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Active Mission */}
                <div
                  onClick={() => navigateTo('missions')}
                  className="p-4 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 transition cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase">Active Mission</span>
                    <Flag className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-lg font-black text-zinc-900 block mt-1">
                    {activeMission ? activeMission.title.split('—')[0].trim() : 'Oja-Oba'}
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Target: 45 Stalls • Active</p>
                </div>

                {/* Team Assignments */}
                <div
                  onClick={() => navigateTo('missions')}
                  className="p-4 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 transition cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase">Team Assignments</span>
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-lg font-black text-zinc-900 block mt-1">2 Mappers Active</span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Chioma (Gate 2) • Abdullahi</p>
                </div>

                {/* Pending Handovers */}
                <div
                  onClick={() => navigateTo('missions')}
                  className="p-4 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 transition cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase">Pending Handovers</span>
                    <FileCheck className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-lg font-black text-zinc-900 block mt-1">
                    {pendingHandoversCount} Pending
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Handover reviews</p>
                </div>

                {/* Field Issues */}
                <div
                  onClick={() => navigateTo('missions')}
                  className="p-4 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 transition cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase">Field Issues</span>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <span className="text-lg font-black text-zinc-900 block mt-1">
                    {openIssuesCount} Reported
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Hazard & access alerts</p>
                </div>
              </div>
            </div>

            {/* Quick Access */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => navigateTo('map')}
                className="min-h-[64px] flex items-center gap-3 p-3 bg-white border border-zinc-200 rounded-xl hover:border-emerald-500 transition cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Field Map</span>
                  <span className="text-[10px] text-zinc-400">Launch GPS</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('missions')}
                className="min-h-[64px] flex items-center gap-3 p-3 bg-white border border-zinc-200 rounded-xl hover:border-emerald-500 transition cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Flag className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Missions Hub</span>
                  <span className="text-[10px] text-zinc-400">Manage Missions</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('chat')}
                className="min-h-[64px] flex items-center gap-3 p-3 bg-white border border-zinc-200 rounded-xl hover:border-emerald-500 transition cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Team Chat</span>
                  <span className="text-[10px] text-zinc-400">Operational Comms</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('revisits')}
                className="min-h-[64px] flex items-center gap-3 p-3 bg-white border border-zinc-200 rounded-xl hover:border-emerald-500 transition cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Revisits</span>
                  <span className="text-[10px] text-zinc-400">Pending Reviews</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* =======================================================================
            CASE 4: ADMIN HOME
            ======================================================================= */}
        {isAdmin && (
          <div className="space-y-6">
            {/* If Admin is participating in active mission: show prominently */}
            {activeMission && (
              <Card
                padding="md"
                className="border-emerald-500/40 bg-linear-to-br from-emerald-50/90 via-white to-white shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="accent" size="sm">CONTINUE MAPPING</Badge>
                      <span className="text-xs text-zinc-500">{activeMission.marketName}</span>
                    </div>
                    <h3 className="text-base font-black text-zinc-900">{activeMission.title}</h3>
                    <p className="text-xs text-zinc-600 mt-0.5">Gate 2 Frontage • North Gate Starting Point</p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleOpenStartModal}
                    icon={<ArrowRight className="w-4 h-4" />}
                    className="min-h-[44px] shrink-0 font-bold"
                  >
                    Resume Mapping
                  </Button>
                </div>
              </Card>
            )}

            {/* Distinct Operations Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-purple-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                    Operations
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo('admin')}
                  className="text-purple-700 hover:text-purple-900 text-xs font-bold"
                >
                  Admin Workspace →
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <button
                  type="button"
                  onClick={() => navigateTo('missions')}
                  className="min-h-[82px] p-3.5 bg-white rounded-2xl border border-zinc-200 hover:border-purple-400 transition cursor-pointer text-left shadow-2xs group"
                >
                  <Flag className="w-5 h-5 text-blue-600 mb-1.5 group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-bold text-zinc-900 block">Missions</span>
                  <span className="text-[10px] text-zinc-500">Deploy & monitor</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('admin')}
                  className="min-h-[82px] p-3.5 bg-white rounded-2xl border border-zinc-200 hover:border-purple-400 transition cursor-pointer text-left shadow-2xs group"
                >
                  <Users className="w-5 h-5 text-purple-600 mb-1.5 group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-bold text-zinc-900 block">Users</span>
                  <span className="text-[10px] text-zinc-500">Roles & access</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('admin')}
                  className="min-h-[82px] p-3.5 bg-white rounded-2xl border border-zinc-200 hover:border-purple-400 transition cursor-pointer text-left shadow-2xs group"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-bold text-zinc-900 block">Teams</span>
                  <span className="text-[10px] text-zinc-500">Units & leads</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('businesses')}
                  className="min-h-[82px] p-3.5 bg-white rounded-2xl border border-zinc-200 hover:border-purple-400 transition cursor-pointer text-left shadow-2xs group"
                >
                  <Layers className="w-5 h-5 text-indigo-600 mb-1.5 group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-bold text-zinc-900 block">Catalogue</span>
                  <span className="text-[10px] text-zinc-500">Categories</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('missions')}
                  className="min-h-[82px] p-3.5 bg-white rounded-2xl border border-zinc-200 hover:border-purple-400 transition cursor-pointer text-left shadow-2xs group"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-600 mb-1.5 group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-bold text-zinc-900 block">Field Issues</span>
                  <span className="text-[10px] text-zinc-500">{openIssuesCount} active</span>
                </button>
              </div>
            </div>

            {/* Field Work Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Compass className="w-4.5 h-4.5 text-emerald-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                    Field Work
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => navigateTo('map')}
                  className="min-h-[72px] flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-zinc-200 hover:border-emerald-500 transition cursor-pointer text-left shadow-2xs group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">Map Workspace</span>
                    <span className="text-[11px] text-zinc-500">Launch field mapping canvas</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('missions')}
                  className="min-h-[72px] flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-zinc-200 hover:border-emerald-500 transition cursor-pointer text-left shadow-2xs group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">My Missions</span>
                    <span className="text-[11px] text-zinc-500">Direct assignments & mapping</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('revisits')}
                  className="min-h-[72px] flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-zinc-200 hover:border-emerald-500 transition cursor-pointer text-left shadow-2xs group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">Revisits</span>
                    <span className="text-[11px] text-zinc-500">Verification & follow-up queue</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Start Mapping Confirmation Sheet */}
      {activeMission && (
        <StartMappingModal
          isOpen={showStartModal}
          onClose={() => setShowStartModal(false)}
          mission={activeMission}
          areaName="Gate 2 Frontage"
          startingPointName="North Gate Junction"
          onBeginMapping={handleConfirmBeginMapping}
          onShowStartingPointOnMap={() => {
            setShowStartModal(false);
            const assignedPt = assignedStartingPoint || {
              name: 'North Gate Junction',
              latitude: 6.4532,
              longitude: 3.1908,
            };
            setActiveMissionContext(activeMission.id, activeAreaId || 'area_gate_2_frontage', assignedPt);
            navigateTo('map');
          }}
        />
      )}
    </div>
  );
};
