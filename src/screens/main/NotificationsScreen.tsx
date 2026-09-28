/**
 * Notifications Screen (Phase 5)
 * Persistent in-app notifications, deep linking to missions, handovers,
 * field issues, and team chat channels.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Header, Card, Button, Badge } from '../../components/ui';
import {
  Bell,
  CheckCheck,
  Flag,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  Share2,
  FileCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { NotificationItem, NotificationType } from '../../types';
import { NotificationRepository } from '../../db';

export const NotificationsScreen: React.FC = () => {
  const {
    currentUser,
    unreadNotifsCount,
    markNotifsRead,
    refreshNotifsCount,
    isOffline,
    toggleOffline,
    syncStatus,
    pendingSyncCount,
    navigateTo,
    goBack,
    setActiveMissionContext,
  } = useApp();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await NotificationRepository.getNotificationsForUser(currentUser.id, 50);
      setNotifications(items);
    } catch (err) {
      console.error('Failed loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    markNotifsRead();
    await NotificationRepository.markAllAsRead(currentUser.id);
    await loadNotifications();
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await NotificationRepository.markAsRead(notif.id);
      await refreshNotifsCount();
    }

    // Deep link navigation
    if (notif.entityReferenceType === 'mission' || notif.type.startsWith('mission') || notif.type.startsWith('handover') || notif.type.startsWith('reconciliation') || notif.type.startsWith('field_issue')) {
      if (notif.entityReferenceId) {
        setActiveMissionContext(notif.entityReferenceId);
      }
      navigateTo('missions');
    } else if (notif.entityReferenceType === 'chat' || notif.type === 'team_update') {
      navigateTo('chat');
    } else {
      navigateTo('missions');
    }
  };

  const getNotifIcon = (type: NotificationType) => {
    switch (type) {
      case 'new_mission':
      case 'mission_assignment':
      case 'assignment_updated':
      case 'mission_completed':
        return { icon: Flag, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'handover_request':
      case 'handover_accepted':
        return { icon: Share2, color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'field_issue_alert':
        return { icon: AlertTriangle, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'reconciliation_review':
      case 'record_correction':
      case 'verification_request':
        return { icon: FileCheck, color: 'text-purple-700 bg-purple-50 border-purple-200' };
      case 'team_update':
      default:
        return { icon: MessageSquare, color: 'text-zinc-700 bg-zinc-100 border-zinc-200' };
    }
  };

  return (
    <div className="flex flex-col grow">
      <Header
        title="Notifications"
        subtitle="Field briefings & mission dispatches"
        showBack
        onBack={goBack}
        isOffline={isOffline}
        onToggleOffline={toggleOffline}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        rightAction={
          unreadNotifsCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              icon={<CheckCheck className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Mark Read
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 max-w-3xl w-full mx-auto space-y-3 grow">
        {notifications.length === 0 && !isLoading && (
          <div className="text-center py-16 text-zinc-500 text-xs space-y-2">
            <Bell className="w-8 h-8 mx-auto text-zinc-300" />
            <h4 className="text-sm font-bold text-zinc-800">NO UNREAD NOTIFICATIONS</h4>
            <p className="text-zinc-500">You're all caught up.</p>
          </div>
        )}

        {notifications.map((notif) => {
          const { icon: Icon, color } = getNotifIcon(notif.type);

          return (
            <Card
              key={notif.id}
              padding="md"
              variant="interactive"
              onClick={() => handleNotificationClick(notif)}
              className={`flex items-start gap-3 transition-colors ${
                !notif.isRead ? 'border-emerald-300 bg-emerald-50/20' : ''
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${color}`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0 grow">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-zinc-900 truncate">{notif.title}</h4>
                  <span className="text-[10px] text-zinc-400 shrink-0">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{notif.body}</p>
                <span className="text-[10px] font-bold text-emerald-800 mt-1.5 inline-flex items-center gap-1">
                  Open Action →
                </span>
              </div>

              {!notif.isRead && (
                <div className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1" />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
