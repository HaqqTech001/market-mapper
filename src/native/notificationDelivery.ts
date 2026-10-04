import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

export type OperationalNotificationPayload = {
  id: string;
  type: string;
  title: string;
  body: string;
  entityReferenceType?: string | null;
  entityReferenceId?: string | null;
};

const delivered = new Set<string>();
const CHANNEL = 'operations';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function routeFor(type?: string | null, id?: string | null) {
  if (type === 'mission' && id) return { pathname: '/mission-detail' as const, params: { missionId: id } };
  if (type === 'assignment') return '/missions' as const;
  if (type === 'chat') return '/chat' as const;
  if (type === 'profile' || type === 'account') return '/more' as const;
  if (['business', 'path', 'junction', 'place', 'field_issue', 'issue'].includes(String(type))) return '/map' as const;
  return '/notifications' as const;
}

export async function initializeOperationalNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Operational alerts',
      description: 'Mission, assignment, role and other Market Mapper operational alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 280],
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

export async function presentOperationalNotification(payload: OperationalNotificationPayload) {
  if (!payload.id || delivered.has(payload.id)) return;
  delivered.add(payload.id);
  if (delivered.size > 250) delivered.delete(delivered.values().next().value as string);

  const urgent = ['field_issue_alert', 'record_correction', 'account_status_changed'].includes(payload.type);
  const important = urgent || ['new_mission', 'mission_assignment', 'assignment_updated', 'role_changed', 'mission_status_changed'].includes(payload.type);

  try {
    await (urgent
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      : Haptics.impactAsync(important ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium));
  } catch {}

  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    identifier: payload.id,
    content: {
      title: payload.title,
      body: payload.body,
      sound: 'default',
      data: {
        notificationId: payload.id,
        entityReferenceType: payload.entityReferenceType ?? null,
        entityReferenceId: payload.entityReferenceId ?? null,
      },
    },
    trigger: Platform.OS === 'android'
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: CHANNEL }
      : null,
  });
}

export function installOperationalNotificationNavigation() {
  const open = (notification: Notifications.Notification) => {
    const data = notification.request.content.data;
    const target = routeFor(
      typeof data?.entityReferenceType === 'string' ? data.entityReferenceType : null,
      typeof data?.entityReferenceId === 'string' ? data.entityReferenceId : null,
    );
    router.push(target as any);
  };

  const last = Notifications.getLastNotificationResponse();
  if (last?.notification) open(last.notification);

  const subscription = Notifications.addNotificationResponseReceivedListener(response => open(response.notification));
  return () => subscription.remove();
}
