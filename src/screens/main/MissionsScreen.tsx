/**
 * Missions Screen (Phase 5 Part 2)
 * Offline-first mission management, tablet-responsive layout, team assignments,
 * shift handovers, area reconciliations, field issue tracking, and audit logging.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Header, Card, Button, Badge, Chip, Input, Select, Modal } from '../../components/ui';
import {
  Flag,
  MapPin,
  Users,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
  Plus,
  AlertTriangle,
  RefreshCw,
  Share2,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  Sparkles,
  Layers,
  X,
  Volume2,
  Bell,
  WifiOff,
  Info,
  MessageSquare,
  Navigation,
} from 'lucide-react';
import { StartMappingModal } from '../../components/mission/StartMappingModal';
import {
  Mission,
  MissionMember,
  MissionAreaAssignment,
  MissionProgress,
  MissionStatus,
  MissionType,
  MissionPriority,
  FieldIssueType,
  FieldIssueSeverity,
  HandoverChecklist,
  Handover,
  FieldIssue,
} from '../../types';
import {
  MissionRepository,
  HandoverRepository,
  FieldIssueRepository,
  ReconciliationRepository,
  AuditRepository,
  AnnouncementRepository,
  NotificationRepository,
  MissionAnnouncement,
} from '../../db';

export const MissionsScreen: React.FC = () => {
  const {
    currentUser,
    isTeamLead,
    isAdmin,
    isMapper,
    isOffline,
    toggleOffline,
    syncStatus,
    pendingSyncCount,
    unreadNotifsCount,
    navigateTo,
    activeMissionId,
    activeAreaId,
    activeStartingPoint,
    setActiveMissionContext,
    refreshNotifsCount,
  } = useApp();

  // State
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, MissionProgress>>({});
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'completed' | 'my_assignments'>('all');
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'assignments' | 'team' | 'issues' | 'handovers' | 'chat'>('overview');
  const [missionMembers, setMissionMembers] = useState<MissionMember[]>([]);
  const [missionAreas, setMissionAreas] = useState<MissionAreaAssignment[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [fieldIssues, setFieldIssues] = useState<FieldIssue[]>([]);
  const [announcements, setAnnouncements] = useState<MissionAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [assignmentConflict, setAssignmentConflict] = useState<{ previous: string; current: string } | null>(null);
  const [pausedNotice, setPausedNotice] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showHandoverModal, setShowHandoverModal] = useState<boolean>(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState<boolean>(false);
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);

  // Create Mission Form State
  const [newTitle, setNewTitle] = useState('');
  const [newMarketId, setNewMarketId] = useState('mkt_alaba_01');
  const [newMarketName, setNewMarketName] = useState('Alaba International Market, Ojo, Lagos');
  const [newType, setNewType] = useState<MissionType>('initial_mapping');
  const [newPriority, setNewPriority] = useState<MissionPriority>('high');
  const [newTargetStalls, setNewTargetStalls] = useState('100');
  const [newDueDate, setNewDueDate] = useState('2026-10-10');
  const [newDesc, setNewDesc] = useState('');

  // Handover Form State
  const [handoverAreaId, setHandoverAreaId] = useState('');
  const [handoverToUserId, setHandoverToUserId] = useState('usr_lead_01');
  const [handoverToUserName, setHandoverToUserName] = useState('Ibrahim Danladi (Team Lead)');
  const [handoverContinuationRef, setHandoverContinuationRef] = useState('Junction of Line A and Row 4 (Inverter Section)');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [handoverChecklist, setHandoverChecklist] = useState<HandoverChecklist>({
    safetyChecked: true,
    dataSynced: true,
    boundariesClarified: true,
  });

  // Reconciliation Form State
  const [reconciliationAreaId, setReconciliationAreaId] = useState('');
  const [reconciliationNotes, setReconciliationNotes] = useState('');

  // Field Issue Form State
  const [issueType, setIssueType] = useState<FieldIssueType>('hazard_obstacle');
  const [issueSeverity, setIssueSeverity] = useState<FieldIssueSeverity>('medium');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueLocationLabel, setIssueLocationLabel] = useState('');

  // Announcement Form State
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  // Load Missions & Progress
  const loadMissionsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await MissionRepository.getAllMissions();
      setMissions(all);

      // Load progress for each mission
      const pMap: Record<string, MissionProgress> = {};
      for (const m of all) {
        const p = await MissionRepository.calculateMissionProgress(m.id);
        pMap[m.id] = p;
      }
      setProgressMap(pMap);

      // Default selected mission if none
      if (!selectedMission && all.length > 0) {
        const active = all.find((m) => m.id === activeMissionId) || all[0];
        setSelectedMission(active);
      }

      // If a mission is currently selected, refresh its details
      const currentTarget = selectedMission || all[0];
      if (currentTarget) {
        const members = await MissionRepository.getMembers(currentTarget.id);
        const areas = await MissionRepository.getAreaAssignments(currentTarget.id);
        const hnds = await HandoverRepository.getHandoversForMission(currentTarget.id);
        const issues = await FieldIssueRepository.getIssuesForMission(currentTarget.id);
        const ancs = await AnnouncementRepository.getAnnouncementsForMission(currentTarget.id);

        setMissionMembers(members);
        setMissionAreas(areas);
        setHandovers(hnds);
        setFieldIssues(issues);
        setAnnouncements(ancs);

        if (areas.length > 0 && !handoverAreaId) {
          setHandoverAreaId(areas[0].areaId);
          setReconciliationAreaId(areas[0].areaId);
        }

        // Check for offline pause / cancellation notice
        if (currentTarget.status === 'paused') {
          setPausedNotice(`This mission "${currentTarget.title}" was paused. Your unsynced field work remains safely stored locally.`);
        } else {
          setPausedNotice(null);
        }
      }
    } catch (err) {
      console.error('Failed loading missions data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMission, activeMissionId, handoverAreaId]);

  useEffect(() => {
    loadMissionsData();
  }, [loadMissionsData]);

  // Open Mission Details
  const handleSelectMission = async (mission: Mission) => {
    setSelectedMission(mission);
    const members = await MissionRepository.getMembers(mission.id);
    const areas = await MissionRepository.getAreaAssignments(mission.id);
    const hnds = await HandoverRepository.getHandoversForMission(mission.id);
    const issues = await FieldIssueRepository.getIssuesForMission(mission.id);
    const ancs = await AnnouncementRepository.getAnnouncementsForMission(mission.id);

    setMissionMembers(members);
    setMissionAreas(areas);
    setHandovers(hnds);
    setFieldIssues(issues);
    setAnnouncements(ancs);

    if (areas.length > 0) {
      setHandoverAreaId(areas[0].areaId);
      setReconciliationAreaId(areas[0].areaId);
    }
    if (mission.status === 'paused') {
      setPausedNotice(`This mission "${mission.title}" was paused. Your unsynced field work remains safely stored locally.`);
    } else {
      setPausedNotice(null);
    }
  };

  // State for Starting Point Confirmation Modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [pendingStartMission, setPendingStartMission] = useState<Mission | null>(null);
  const [pendingStartAreaId, setPendingStartAreaId] = useState<string>('');

  // Step state for Create Mission Wizard (Admin / Team Lead)
  const [createStep, setCreateStep] = useState<number>(1);
  const [newAssignedAreaName, setNewAssignedAreaName] = useState<string>('Gate 2 Frontage');
  const [newStartingPoint, setNewStartingPoint] = useState<string>('North Gate Junction');
  const [newAssignedMapperName, setNewAssignedMapperName] = useState<string>('Chioma Adebayo (Field Mapper)');

  // Launch mapping sweep with starting point confirmation
  const handleStartSurvey = (mission: Mission, areaId?: string) => {
    if (mission.status === 'paused') {
      alert('This mission is currently paused by Team Lead. Field data is preserved.');
      return;
    }
    setPendingStartMission(mission);
    setPendingStartAreaId(areaId || (missionAreas[0]?.areaId || 'area_line_a'));
    setShowStartModal(true);
  };

  const confirmStartSurvey = (choice: 'starting_point' | 'current_location') => {
    if (pendingStartMission) {
      const assignedPt = { name: 'North Gate Junction', latitude: 6.4532, longitude: 3.1908 };
      const actualPt =
        choice === 'starting_point'
          ? {
              provenance: 'assigned_starting_point' as const,
              name: 'North Gate Junction',
              latitude: 6.4532,
              longitude: 3.1908,
            }
          : {
              provenance: 'current_gps_location' as const,
              name: 'Current Field Location (GPS)',
              latitude: 6.4530,
              longitude: 3.1905,
            };

      setActiveMissionContext(
        pendingStartMission.id,
        pendingStartAreaId || 'area_gate_2_frontage',
        assignedPt,
        actualPt
      );
      setShowStartModal(false);
      navigateTo('map');
    }
  };

  // Create Mission Handler (Lead/Admin)
  const handleCreateMission = async () => {
    if (!newTitle.trim()) return;

    const created = await MissionRepository.createMission({
      title: newTitle.trim(),
      marketId: newMarketId,
      marketName: newMarketName,
      missionType: newType,
      priority: newPriority,
      status: 'scheduled',
      teamId: 'team_alpha_01',
      teamName: 'Lagos West Alpha Unit',
      leadUserId: currentUser.id,
      targetStalls: parseInt(newTargetStalls, 10) || 100,
      dueDate: newDueDate,
      description: newDesc.trim(),
      createdBy: currentUser.id,
    });

    // Add Lead as member & add area assignment
    await MissionRepository.addMember(created.id, currentUser.id, currentUser.fullName, 'lead');
    const areaIdGen = 'area_' + (newAssignedAreaName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'assigned_area');
    await MissionRepository.assignArea(
      created.id,
      areaIdGen,
      newAssignedAreaName || 'Assigned Area',
      'usr_mapper_01',
      newAssignedMapperName
    );

    // Audit Log
    await AuditRepository.logAction({
      actionType: 'MISSION_CREATED',
      entityType: 'mission',
      entityId: created.id,
      actorId: currentUser.id,
      actorName: currentUser.fullName,
      details: {
        title: created.title,
        marketName: created.marketName,
        priority: created.priority,
        areaName: newAssignedAreaName,
        startingPoint: newStartingPoint,
      },
    });

    // Persistent Notification for Assigned Mapper
    await NotificationRepository.createNotification({
      recipientId: 'usr_mapper_01',
      type: 'mission_assignment',
      title: `New Mission Assignment: ${created.title}`,
      body: `You have been assigned to ${newAssignedAreaName || 'Assigned Area'} in ${created.marketName}. Recommended Starting Point: ${newStartingPoint || 'North Gate Junction'}.`,
      entityReferenceType: 'mission',
      entityReferenceId: created.id,
    });
    await refreshNotifsCount();

    setShowCreateModal(false);
    setNewTitle('');
    setNewDesc('');
    setSelectedMission(created);
    await loadMissionsData();
  };

  // Submit Handover
  const handleSubmitHandover = async () => {
    if (!selectedMission || !handoverAreaId) return;

    const area = missionAreas.find((a) => a.areaId === handoverAreaId);
    const progress = progressMap[selectedMission.id];

    await HandoverRepository.createHandover({
      missionId: selectedMission.id,
      missionTitle: selectedMission.title,
      areaId: handoverAreaId,
      areaName: area?.areaName || 'Assigned Area',
      fromUserId: currentUser.id,
      fromUserName: currentUser.fullName,
      toUserId: handoverToUserId,
      toUserName: handoverToUserName,
      notes: handoverNotes.trim(),
      checklist: handoverChecklist,
      stallsCountAtHandover: progress?.stallsMapped || 0,
      pathsCountAtHandover: progress?.pathsRecorded || 0,
    });

    // Audit Log
    await AuditRepository.logAction({
      actionType: 'HANDOVER_INITIATED',
      entityType: 'handover',
      entityId: selectedMission.id,
      actorId: currentUser.id,
      actorName: currentUser.fullName,
      details: { areaName: area?.areaName, toUser: handoverToUserName },
    });

    setShowHandoverModal(false);
    setHandoverNotes('');
    await refreshNotifsCount();
    await loadMissionsData();
  };

  // Handover Acceptance / Decline
  const handleHandoverResponse = async (handoverId: string, accept: boolean) => {
    const status = accept ? 'accepted' : 'declined';
    const success = await HandoverRepository.updateStatus(handoverId, status);

    if (accept && !success) {
      alert('HANDOVER STALE — The area assignment was modified before acceptance. Please review current assignments.');
    } else {
      await AuditRepository.logAction({
        actionType: accept ? 'HANDOVER_ACCEPTED' : 'HANDOVER_DECLINED',
        entityType: 'handover',
        entityId: handoverId,
        actorId: currentUser.id,
        actorName: currentUser.fullName,
      });
    }

    await refreshNotifsCount();
    await loadMissionsData();
  };

  // Submit Area Reconciliation
  const handleSubmitReconciliation = async () => {
    if (!selectedMission || !reconciliationAreaId) return;

    const area = missionAreas.find((a) => a.areaId === reconciliationAreaId);

    await ReconciliationRepository.submitReconciliation({
      missionId: selectedMission.id,
      missionTitle: selectedMission.title,
      areaId: reconciliationAreaId,
      areaName: area?.areaName || 'Assigned Area',
      reconciledBy: currentUser.id,
      reconciledByName: currentUser.fullName,
      reviewNotes: reconciliationNotes.trim(),
      teamLeadUserId: selectedMission.leadUserId || 'usr_lead_01',
    });

    setShowReconciliationModal(false);
    setReconciliationNotes('');
    await refreshNotifsCount();
    await loadMissionsData();
  };

  // Report Field Issue
  const handleSubmitFieldIssue = async () => {
    if (!selectedMission || !issueTitle.trim()) return;

    await FieldIssueRepository.reportIssue({
      missionId: selectedMission.id,
      missionTitle: selectedMission.title,
      areaId: missionAreas[0]?.areaId,
      areaName: missionAreas[0]?.areaName,
      reportedBy: currentUser.id,
      reportedByName: currentUser.fullName,
      reportedByRole: currentUser.role,
      issueType,
      severity: issueSeverity,
      title: issueTitle.trim(),
      description: issueDesc.trim(),
      locationLabel: issueLocationLabel.trim() || 'Assigned Area Corridors',
      teamLeadUserId: selectedMission.leadUserId || 'usr_lead_01',
    });

    setShowIssueModal(false);
    setIssueTitle('');
    setIssueDesc('');
    setIssueLocationLabel('');
    await refreshNotifsCount();
    await loadMissionsData();
  };

  // Submit Authoritative Announcement
  const handleSubmitAnnouncement = async () => {
    if (!selectedMission || !announcementTitle.trim()) return;

    await AnnouncementRepository.createAnnouncement({
      missionId: selectedMission.id,
      authorId: currentUser.id,
      authorName: currentUser.fullName,
      title: announcementTitle.trim(),
      content: announcementContent.trim(),
      isPinned: true,
      channelId: 'chn_team_alpha_01',
    });

    await AuditRepository.logAction({
      actionType: 'ANNOUNCEMENT_POSTED',
      entityType: 'announcement',
      entityId: selectedMission.id,
      actorId: currentUser.id,
      actorName: currentUser.fullName,
      details: { title: announcementTitle },
    });

    setShowAnnouncementModal(false);
    setAnnouncementTitle('');
    setAnnouncementContent('');
    await loadMissionsData();
  };

  // Status Change Handler with Audit
  const handleUpdateStatus = async (status: MissionStatus) => {
    if (!selectedMission) return;
    await MissionRepository.updateMissionStatus(selectedMission.id, status);

    await AuditRepository.logAction({
      actionType: `MISSION_STATUS_${status.toUpperCase()}`,
      entityType: 'mission',
      entityId: selectedMission.id,
      actorId: currentUser.id,
      actorName: currentUser.fullName,
    });

    setSelectedMission({ ...selectedMission, status });
    await loadMissionsData();
  };

  // Filter logic
  const filteredMissions = missions.filter((m) => {
    if (filter === 'all') return true;
    if (filter === 'active') return m.status === 'active';
    if (filter === 'scheduled') return m.status === 'scheduled';
    if (filter === 'completed') return m.status === 'completed';
    if (filter === 'my_assignments') {
      return m.leadUserId === currentUser.id || m.createdBy === currentUser.id || m.id === activeMissionId;
    }
    return true;
  });

  return (
    <div className="flex flex-col grow">
      <Header
        title="Field Missions & Coordination"
        subtitle="Offline-first area assignments & mapping missions"
        isOffline={isOffline}
        onToggleOffline={toggleOffline}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        unreadNotifsCount={unreadNotifsCount}
        onPressNotifications={() => navigateTo('notifications')}
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-4 grow">
        {/* Banner: Offline Snapshot Alert */}
        {isOffline && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold">OFFLINE SNAPSHOT ACTIVE:</span> Showing saved mission assignments and area context cached on this device.
              </div>
            </div>
            <Badge variant="warning" size="sm">LOCAL SNAPSHOT</Badge>
          </div>
        )}

        {/* Banner: Assignment Conflict Alert */}
        {assignmentConflict && (
          <div className="p-3 bg-blue-50 border border-blue-300 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-950">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <div>
                <span className="font-bold">ASSIGNMENT UPDATED:</span> Your area assignment changed while offline.
                Previous: <span className="underline">{assignmentConflict.previous}</span> → Current: <span className="font-bold">{assignmentConflict.current}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAssignmentConflict(null)}>
              Acknowledge
            </Button>
          </div>
        )}

        {/* Banner: Mission Paused Alert */}
        {pausedNotice && (
          <div className="p-3 bg-amber-100 border border-amber-400 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />
              <span>{pausedNotice}</span>
            </div>
            <Badge variant="warning" size="sm">PAUSED</Badge>
          </div>
        )}

        {/* Controls Bar: Role Aware Actions & Filter Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Chip
              label="All Missions"
              selected={filter === 'all'}
              onClick={() => setFilter('all')}
              count={missions.length}
            />
            <Chip
              label="Active Missions"
              selected={filter === 'active'}
              onClick={() => setFilter('active')}
              count={missions.filter((m) => m.status === 'active').length}
            />
            <Chip
              label="My Assignments"
              selected={filter === 'my_assignments'}
              onClick={() => setFilter('my_assignments')}
              count={missions.filter((m) => m.leadUserId === currentUser.id || m.id === activeMissionId).length}
            />
            <Chip
              label="Scheduled"
              selected={filter === 'scheduled'}
              onClick={() => setFilter('scheduled')}
              count={missions.filter((m) => m.status === 'scheduled').length}
            />
            <Chip
              label="Completed"
              selected={filter === 'completed'}
              onClick={() => setFilter('completed')}
              count={missions.filter((m) => m.status === 'completed').length}
            />
          </div>

          {(isTeamLead || isAdmin) && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              New Mission
            </Button>
          )}
        </div>

        {/* TABLET / DESKTOP RESPONSIVE DUAL-PANE GRID (5AY) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* LEFT PANE (Missions List) — 5 cols on MD+ */}
          <div className="md:col-span-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">
              Select Mission ({filteredMissions.length})
            </h3>

            {/* Empty State for Missions */}
            {filteredMissions.length === 0 && !isLoading && (
              <Card padding="lg" className="text-center py-10">
                <Flag className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-zinc-800">NO ACTIVE MISSIONS</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  You currently have no active mapping assignment.
                </p>
              </Card>
            )}

            {filteredMissions.map((mission) => {
              const progress = progressMap[mission.id] || {
                stallsMapped: 0,
                targetStalls: mission.targetStalls,
                pathsRecorded: 0,
                percentage: 0,
                openIssuesCount: 0,
              };
              const isSelected = selectedMission?.id === mission.id;

              return (
                <Card
                  key={mission.id}
                  padding="md"
                  variant="interactive"
                  onClick={() => handleSelectMission(mission)}
                  className={`transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500/20'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          mission.status === 'active'
                            ? 'accent'
                            : mission.status === 'completed'
                            ? 'success'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {mission.status.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase">
                        {mission.priority} priority
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">{mission.title}</h4>
                      <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{mission.marketName}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">
                        <strong className="text-emerald-800">{progress.stallsMapped}</strong> / {mission.targetStalls} businesses
                      </span>
                      <span className="font-bold text-zinc-900">{progress.percentage}%</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* RIGHT PANE (Selected Mission Detail & Operational Actions) — 7 cols on MD+ */}
          <div className="md:col-span-7 space-y-4">
            {selectedMission ? (
              <div className="space-y-4">
                {/* 1. MAPPER SPECIFIC BRIEFING VIEW */}
                {!isTeamLead && !isAdmin ? (
                  <Card padding="lg" className="border-emerald-600/40 bg-white space-y-4 shadow-sm">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={selectedMission.status === 'active' ? 'accent' : 'neutral'} size="sm">
                            {selectedMission.status.toUpperCase()}
                          </Badge>
                          <span className="text-xs font-semibold text-zinc-500 uppercase">
                            {selectedMission.missionType.replace('_', ' ')}
                          </span>
                        </div>
                        <h2 className="text-xl font-black text-zinc-900">{selectedMission.title}</h2>
                        <p className="text-xs text-zinc-600 flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>Market: <strong className="text-zinc-900">{selectedMission.marketName}</strong></span>
                        </p>
                      </div>

                      {/* Primary CTA */}
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => handleStartSurvey(selectedMission)}
                        icon={<ArrowRight className="w-4 h-4" />}
                        className="min-h-[48px] px-6 text-sm font-bold shadow-sm"
                      >
                        {selectedMission.status === 'active' ? 'Resume Mapping' : 'Start Mapping'}
                      </Button>
                    </div>

                    {/* Mission Briefing Structured Box */}
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-zinc-200">
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Assigned Area</span>
                          <span className="text-sm font-black text-zinc-900">Gate 2 Frontage</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Assigned Starting Point</span>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <span className="text-sm font-black text-emerald-800 flex items-center gap-1">
                              <Flag className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              North Gate Junction
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActiveMissionContext(selectedMission.id, 'area_gate_2_frontage', {
                                  name: 'North Gate Junction',
                                  latitude: 6.4532,
                                  longitude: 3.1908,
                                });
                                navigateTo('map');
                              }}
                              className="text-[11px] h-7 px-2"
                            >
                              Show on Map
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Instructions from Lead</span>
                          <span className="text-[11px] font-semibold text-zinc-700">Team Lead: Amina Yusuf</span>
                        </div>
                        <p className="text-xs text-zinc-800 leading-relaxed font-medium bg-white p-3 rounded-xl border border-zinc-200/80">
                          {selectedMission.description || 'Map all businesses and internal paths from North Gate to Junction J12. Mark blocked passages as issues.'}
                        </p>
                      </div>
                    </div>

                    {/* Operational Progress Overview */}
                    {(() => {
                      const p = progressMap[selectedMission.id] || { stallsMapped: 12, targetStalls: selectedMission.targetStalls, percentage: 12 };
                      return (
                        <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-zinc-800">
                              Overall Mapping Progress: {p.stallsMapped} businesses ({p.percentage}%)
                            </span>
                            <span className="text-zinc-500">Target: {selectedMission.targetStalls} businesses</span>
                          </div>
                          <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${p.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Secondary Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateTo('chat')}
                        icon={<MessageSquare className="w-3.5 h-3.5 text-purple-700" />}
                        className="min-h-[44px]"
                      >
                        Open Mission Chat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowIssueModal(true)}
                        icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                        className="min-h-[44px]"
                      >
                        Report Issue
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHandoverModal(true)}
                        icon={<Share2 className="w-3.5 h-3.5 text-blue-700" />}
                        className="min-h-[44px]"
                      >
                        Handover
                      </Button>
                    </div>
                  </Card>
                ) : (
                  /* 2. TEAM LEAD & ADMIN COORDINATION VIEW */
                  <div className="space-y-4">
                    {/* Header Card */}
                    <Card padding="lg" className="border-emerald-500/30 bg-white space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={selectedMission.status === 'active' ? 'accent' : 'neutral'} size="sm">
                              {selectedMission.status.toUpperCase()}
                            </Badge>
                            <span className="text-xs font-semibold text-zinc-500 uppercase">
                              {selectedMission.missionType.replace('_', ' ')}
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-zinc-900">{selectedMission.title}</h2>
                          <p className="text-xs text-zinc-600 flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>Market: <strong>{selectedMission.marketName}</strong></span>
                          </p>
                        </div>

                        <Button
                          variant="primary"
                          size="md"
                          onClick={() => handleStartSurvey(selectedMission)}
                          icon={<ArrowRight className="w-4 h-4" />}
                          className="min-h-[44px]"
                        >
                          {selectedMission.status === 'active' ? 'Resume Mapping' : 'Start Mapping'}
                        </Button>
                      </div>

                      {/* Navigation Tabs */}
                      <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 pb-1 -mx-2 px-2 scrollbar-none">
                        {(['overview', 'assignments', 'team', 'issues', 'handovers', 'chat'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => {
                              if (tab === 'chat') {
                                navigateTo('chat');
                              } else {
                                setDetailTab(tab);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] flex items-center gap-1.5 ${
                              detailTab === tab
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                          >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {tab === 'assignments' && missionAreas.length > 0 && (
                              <span className="px-1.5 py-0.2 bg-zinc-200 text-zinc-700 rounded-full text-[10px]">
                                {missionAreas.length}
                              </span>
                            )}
                            {tab === 'issues' && fieldIssues.length > 0 && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                                {fieldIssues.length}
                              </span>
                            )}
                            {tab === 'handovers' && handovers.length > 0 && (
                              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px]">
                                {handovers.length}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* TAB CONTENT: Overview */}
                      {detailTab === 'overview' && (
                        <div className="space-y-3 pt-1">
                          {selectedMission.description && (
                            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-700 space-y-1">
                              <span className="font-bold text-zinc-900 block">Mission Objectives:</span>
                              <p>{selectedMission.description}</p>
                            </div>
                          )}

                          {/* Progress */}
                          {(() => {
                            const p = progressMap[selectedMission.id] || { stallsMapped: 12, targetStalls: selectedMission.targetStalls, percentage: 12 };
                            return (
                              <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-zinc-800">
                                    Overall Progress: {p.stallsMapped} businesses ({p.percentage}%)
                                  </span>
                                  <span className="text-zinc-500">Target: {selectedMission.targetStalls} businesses</span>
                                </div>
                                <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${p.percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })()}

                          {/* Action Toolbar */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowHandoverModal(true)}
                              icon={<Share2 className="w-3.5 h-3.5" />}
                            >
                              Handover
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowReconciliationModal(true)}
                              icon={<FileCheck className="w-3.5 h-3.5 text-purple-700" />}
                            >
                              Reconcile Area
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowIssueModal(true)}
                              icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                            >
                              Report Field Issue
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAnnouncementModal(true)}
                              icon={<Volume2 className="w-3.5 h-3.5 text-emerald-700" />}
                            >
                              Post Directive
                            </Button>
                          </div>

                          {/* Operational Controls */}
                          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                            <span className="text-xs font-bold text-zinc-800 block">Mission Controls:</span>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant={selectedMission.status === 'active' ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => handleUpdateStatus('active')}
                              >
                                Set Active
                              </Button>
                              <Button
                                variant={selectedMission.status === 'paused' ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => handleUpdateStatus('paused')}
                              >
                                Pause Mission
                              </Button>
                              <Button
                                variant={selectedMission.status === 'completed' ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => handleUpdateStatus('completed')}
                              >
                                Mark Completed
                              </Button>
                              {isAdmin && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateStatus('archived')}
                                    className="text-zinc-600"
                                  >
                                    Archive
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateStatus('cancelled')}
                                    className="text-red-700 border-red-200 hover:bg-red-50"
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB CONTENT: Assignments */}
                      {detailTab === 'assignments' && (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                              Assigned Areas & Corridors ({missionAreas.length})
                            </h4>
                          </div>

                          <div className="space-y-2">
                            {missionAreas.map((area) => (
                              <div
                                key={area.id}
                                className="p-3 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 space-y-2 text-xs transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-zinc-900 text-sm">{area.areaName}</span>
                                    <Badge
                                      variant={
                                        area.status === 'completed'
                                          ? 'success'
                                          : area.status === 'in_progress'
                                          ? 'accent'
                                          : 'neutral'
                                      }
                                      size="sm"
                                    >
                                      {area.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 py-1 border-y border-zinc-100 text-[11px]">
                                  <div>
                                    <span className="text-zinc-500 block">Assigned Mapper:</span>
                                    <strong className="text-zinc-800">{area.assignedToUserName || 'Unassigned'}</strong>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block">Businesses:</span>
                                    <strong className="text-emerald-800">12 mapped</strong>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block">Revisits:</span>
                                    <strong className="text-amber-800">2 flagged</strong>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setActiveMissionContext(selectedMission.id, area.areaId, {
                                        name: 'North Gate Junction',
                                        latitude: 6.4532,
                                        longitude: 3.1908,
                                      });
                                      navigateTo('map');
                                    }}
                                    icon={<MapPin className="w-3.5 h-3.5 text-emerald-700" />}
                                    className="min-h-[44px]"
                                  >
                                    View on Map
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStartSurvey(selectedMission, area.areaId)}
                                    icon={<ChevronRight className="w-4 h-4" />}
                                    className="min-h-[44px]"
                                  >
                                    Survey Area
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TAB CONTENT: Team */}
                      {detailTab === 'team' && (
                        <div className="space-y-3 pt-1">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Team Roster ({missionMembers.length})
                          </h4>
                          <div className="space-y-2">
                            {missionMembers.map((member) => (
                              <div
                                key={member.id}
                                className="p-3 bg-white rounded-xl border border-zinc-200 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                                    {member.userName.charAt(0)}
                                  </div>
                                  <div>
                                    <span className="font-bold text-zinc-900 block">{member.userName}</span>
                                    <span className="text-[11px] text-zinc-500">Role: {member.role.toUpperCase()}</span>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigateTo('chat')}
                                  icon={<MessageSquare className="w-3.5 h-3.5 text-purple-700" />}
                                  className="min-h-[44px]"
                                >
                                  Message
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TAB CONTENT: Issues */}
                      {detailTab === 'issues' && (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                              Reported Field Issues ({fieldIssues.length})
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowIssueModal(true)}
                              icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                              className="min-h-[44px]"
                            >
                              Report Field Issue
                            </Button>
                          </div>
                          {fieldIssues.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic text-center py-6">No active field issues reported for this mission.</p>
                          ) : (
                            <div className="space-y-2">
                              {fieldIssues.map((iss) => (
                                <div key={iss.id} className="p-3 bg-white rounded-xl border border-amber-200 space-y-1 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-zinc-900">{iss.title}</span>
                                    <Badge
                                      variant={iss.severity === 'critical' || iss.severity === 'high' ? 'danger' : 'warning'}
                                      size="sm"
                                    >
                                      {iss.severity.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <p className="text-zinc-600">{iss.description}</p>
                                  <span className="text-[10px] text-zinc-500 block">
                                    Location: {iss.locationLabel || 'Area'} • Reported by {iss.reportedByName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB CONTENT: Handovers */}
                      {detailTab === 'handovers' && (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                              Handover History ({handovers.length})
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowHandoverModal(true)}
                              icon={<Share2 className="w-3.5 h-3.5 text-blue-700" />}
                              className="min-h-[44px]"
                            >
                              New Handover
                            </Button>
                          </div>
                          {handovers.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic text-center py-6">No handovers logged yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {handovers.map((hnd) => (
                                <div key={hnd.id} className="p-3 bg-white rounded-xl border border-blue-200 space-y-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-zinc-900">{hnd.areaName}</span>
                                    <Badge
                                      variant={hnd.status === 'accepted' ? 'success' : hnd.status === 'declined' ? 'danger' : 'warning'}
                                      size="sm"
                                    >
                                      {hnd.status.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <p className="text-zinc-600 text-[11px]">
                                    From <strong className="text-zinc-800">{hnd.fromUserName}</strong> to <strong className="text-zinc-800">{hnd.toUserName}</strong>
                                  </p>
                                  {hnd.notes && <p className="text-zinc-700 italic bg-zinc-50 p-2 rounded">"{hnd.notes}"</p>}

                                  {hnd.status === 'pending' && hnd.toUserId === currentUser.id && (
                                    <div className="flex gap-2 pt-1">
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleHandoverResponse(hnd.id, true)}
                                        className="min-h-[44px]"
                                      >
                                        Accept Handover
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleHandoverResponse(hnd.id, false)}
                                        className="min-h-[44px]"
                                      >
                                        Decline
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  </div>
                )}
              </div>
            ) : (
              <Card padding="lg" className="text-center py-16 text-zinc-500 text-xs">
                Select a mapping mission from the list to view its briefing and operational status.
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Start Mapping Starting Point Confirmation */}
      {showStartModal && pendingStartMission && (
        <StartMappingModal
          isOpen={showStartModal}
          onClose={() => setShowStartModal(false)}
          mission={pendingStartMission}
          areaName="Gate 2 Frontage"
          startingPointName="North Gate Junction"
          onBeginMapping={(choice) => {
            confirmStartSurvey(choice);
          }}
          onShowStartingPointOnMap={() => {
            setShowStartModal(false);
            setActiveMissionContext(
              pendingStartMission.id,
              'area_gate_2_frontage',
              { name: 'North Gate Junction', latitude: 6.4532, longitude: 3.1908 }
            );
            navigateTo('map');
          }}
        />
      )}

      {/* Modal: Multi-Step Admin Mission Creation Wizard */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setCreateStep(1);
          }}
          title={`Create Mapping Mission (Step ${createStep} of 4)`}
        >
          <div className="space-y-4">
            {/* Step Indicators */}
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 pb-2 border-b border-zinc-200">
              <span className={createStep === 1 ? 'text-emerald-700 font-extrabold' : ''}>1. Info</span>
              <span className="text-zinc-300">•</span>
              <span className={createStep === 2 ? 'text-emerald-700 font-extrabold' : ''}>2. Team</span>
              <span className="text-zinc-300">•</span>
              <span className={createStep === 3 ? 'text-emerald-700 font-extrabold' : ''}>3. Area & Start Point</span>
              <span className="text-zinc-300">•</span>
              <span className={createStep === 4 ? 'text-emerald-700 font-extrabold' : ''}>4. Instructions</span>
            </div>

            {/* STEP 1: Mission Info */}
            {createStep === 1 && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Target Market Name</label>
                  <Input
                    value={newMarketName}
                    onChange={(e) => setNewMarketName(e.target.value)}
                    placeholder="e.g. Alaba International Market"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Mission Title</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Solar Inverter & Battery Corridor Mapping"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Mission Type</label>
                    <Select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as MissionType)}
                      options={[
                        { value: 'initial_mapping', label: 'Initial Mapping' },
                        { value: 'verification', label: 'Verification Mapping' },
                        { value: 'resurvey', label: 'Resurvey / Revisit' },
                        { value: 'expansion', label: 'Path Expansion' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Target Businesses</label>
                    <Input
                      type="number"
                      value={newTargetStalls}
                      onChange={(e) => setNewTargetStalls(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Team Selection */}
            {createStep === 2 && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Designated Team Lead</label>
                  <Select
                    value={currentUser.id}
                    onChange={() => {}}
                    options={[
                      { value: currentUser.id, label: `${currentUser.fullName} (Lead / Admin)` },
                      { value: 'usr_lead_01', label: 'Ibrahim Danladi (Team Lead)' },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Assigned Field Mapper</label>
                  <Select
                    value={newAssignedMapperName}
                    onChange={(e) => setNewAssignedMapperName(e.target.value)}
                    options={[
                      { value: 'Chioma Adebayo (Field Mapper)', label: 'Chioma Adebayo (Field Mapper)' },
                      { value: 'Ibrahim Danladi (Lead Mapper)', label: 'Ibrahim Danladi (Lead Mapper)' },
                      { value: 'System Admin', label: 'Self-Assignment (Admin)' },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Area & Starting Point */}
            {createStep === 3 && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Assigned Area Name</label>
                  <Input
                    value={newAssignedAreaName}
                    onChange={(e) => setNewAssignedAreaName(e.target.value)}
                    placeholder="e.g. Sector 1 — Main Gate Corridor"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Recommended Starting Point</label>
                  <Input
                    value={newStartingPoint}
                    onChange={(e) => setNewStartingPoint(e.target.value)}
                    placeholder="e.g. North Gate Junction / Row C Pillar"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Instructions & Priority */}
            {createStep === 4 && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Priority</label>
                    <Select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as MissionPriority)}
                      options={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'urgent', label: 'Urgent' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Due Date</label>
                    <Input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Field Instructions for Mapper</label>
                  <textarea
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={3}
                    placeholder="Provide clear mapping guidelines, boundary markers, and trader engagement rules..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Wizard Action Buttons */}
            <div className="flex justify-between items-center pt-3 border-t border-zinc-200">
              {createStep > 1 ? (
                <Button variant="outline" size="sm" onClick={() => setCreateStep(createStep - 1)}>
                  Back
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
              )}

              {createStep < 4 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCreateStep(createStep + 1)}
                  disabled={createStep === 1 && !newTitle.trim()}
                >
                  Next Step
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={handleCreateMission}>
                  Create Mission & Notify Team
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Handover */}
      {showHandoverModal && selectedMission && (
        <Modal
          isOpen={showHandoverModal}
          onClose={() => setShowHandoverModal(false)}
          title="Initiate Handover"
        >
          <div className="space-y-3.5">
            <p className="text-xs text-zinc-600">
              Transfer area mapping responsibility to a teammate with durable audit trail and verified checklist.
            </p>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Select Assigned Area</label>
              <Select
                value={handoverAreaId}
                onChange={(e) => setHandoverAreaId(e.target.value)}
                options={missionAreas.map((a) => ({ value: a.areaId, label: a.areaName }))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Relieving Team Member</label>
              <Select
                value={handoverToUserId}
                onChange={(e) => {
                  setHandoverToUserId(e.target.value);
                  setHandoverToUserName(e.target.value === 'usr_lead_01' ? 'Ibrahim Danladi (Team Lead)' : 'Chioma Adebayo (Mapper)');
                }}
                options={[
                  { value: 'usr_lead_01', label: 'Ibrahim Danladi (Team Lead)' },
                  { value: 'usr_mapper_01', label: 'Chioma Adebayo (Field Mapper)' },
                ]}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Continuation Point / Junction Reference</label>
              <Input
                value={handoverContinuationRef}
                onChange={(e) => setHandoverContinuationRef(e.target.value)}
                placeholder="e.g. Junction of Line A and Row 4"
              />
            </div>

            <div className="space-y-2 bg-zinc-50 p-3 rounded-lg border border-zinc-200">
              <span className="text-xs font-bold text-zinc-800 block">Handover Checklist</span>
              <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={handoverChecklist.safetyChecked}
                  onChange={(e) =>
                    setHandoverChecklist({ ...handoverChecklist, safetyChecked: e.target.checked })
                  }
                  className="rounded text-emerald-600"
                />
                <span>Field safety status & physical hazards briefed</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={handoverChecklist.boundariesClarified}
                  onChange={(e) =>
                    setHandoverChecklist({ ...handoverChecklist, boundariesClarified: e.target.checked })
                  }
                  className="rounded text-emerald-600"
                />
                <span>Area boundaries & remaining businesses clarified</span>
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Handover Briefing Notes</label>
              <textarea
                className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
                placeholder="Mention key landmarks, unverified businesses, or gate access notes..."
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
              <Button variant="outline" size="sm" onClick={() => setShowHandoverModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSubmitHandover}>
                Send Handover Request
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Area Reconciliation */}
      {showReconciliationModal && selectedMission && (
        <Modal
          isOpen={showReconciliationModal}
          onClose={() => setShowReconciliationModal(false)}
          title="Submit Area for Review"
        >
          <div className="space-y-3.5">
            <p className="text-xs text-zinc-600">
              Submit surveyed area counts (businesses & paths) to Team Lead Ibrahim for formal sign-off.
            </p>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Assigned Area</label>
              <Select
                value={reconciliationAreaId}
                onChange={(e) => setReconciliationAreaId(e.target.value)}
                options={missionAreas.map((a) => ({ value: a.areaId, label: a.areaName }))}
              />
            </div>

            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs space-y-1">
              <span className="font-bold text-emerald-900 block">Current Tallies in SQLite:</span>
              <p className="text-emerald-800">
                • {progressMap[selectedMission.id]?.stallsMapped || 14} Businesses logged in this mission
              </p>
              <p className="text-emerald-800">
                • {progressMap[selectedMission.id]?.pathsRecorded || 4} Navigation paths & corridors recorded
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Review Notes for Lead</label>
              <textarea
                className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                placeholder="Confirmed all active businesses along Line A up to Gate 3..."
                value={reconciliationNotes}
                onChange={(e) => setReconciliationNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
              <Button variant="outline" size="sm" onClick={() => setShowReconciliationModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSubmitReconciliation}>
                Submit for Lead Sign-off
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Report Field Issue */}
      {showIssueModal && selectedMission && (
        <Modal
          isOpen={showIssueModal}
          onClose={() => setShowIssueModal(false)}
          title="Report Field Hazard or Roadblock"
        >
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Hazard Type</label>
                <Select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as FieldIssueType)}
                  options={[
                    { value: 'hazard_obstacle', label: 'Physical Obstacle' },
                    { value: 'access_blocked', label: 'Gate / Corridor Blocked' },
                    { value: 'unsafe_area', label: 'Safety / Security Risk' },
                    { value: 'disputed_boundary', label: 'Boundary Dispute' },
                    { value: 'severe_weather', label: 'Flooding / Heavy Rain' },
                    { value: 'other', label: 'Other Hazard' },
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Severity</label>
                <Select
                  value={issueSeverity}
                  onChange={(e) => setIssueSeverity(e.target.value as FieldIssueSeverity)}
                  options={[
                    { value: 'low', label: 'Low (Advisory)' },
                    { value: 'medium', label: 'Medium (Delay)' },
                    { value: 'high', label: 'High (Blocker)' },
                    { value: 'critical', label: 'Critical (Safety Stop)' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Issue Title</label>
              <Input
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                placeholder="e.g. Line A North Entrance Blocked by Construction"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Location / Landmark</label>
              <Input
                value={issueLocationLabel}
                onChange={(e) => setIssueLocationLabel(e.target.value)}
                placeholder="e.g. Opposite Gate 3 Transformer"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Description & Details</label>
              <textarea
                className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                placeholder="Detail the obstruction and recommended detour..."
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
              <Button variant="outline" size="sm" onClick={() => setShowIssueModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSubmitFieldIssue}>
                Broadcast Hazard Alert
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Post Announcement Directive (5BQ) */}
      {showAnnouncementModal && selectedMission && (
        <Modal
          isOpen={showAnnouncementModal}
          onClose={() => setShowAnnouncementModal(false)}
          title="Post Official Mission Directive"
        >
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Directive Title</label>
              <Input
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="e.g. Gate 3 Access Closed — Divert to North Entry"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Directive Content</label>
              <textarea
                className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={4}
                placeholder="Enter clear field instructions for all mappers on this mission..."
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
              <Button variant="outline" size="sm" onClick={() => setShowAnnouncementModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSubmitAnnouncement}>
                Broadcast & Pin Directive
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
