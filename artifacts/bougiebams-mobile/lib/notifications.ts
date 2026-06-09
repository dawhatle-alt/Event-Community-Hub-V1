import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDERS_STORAGE_KEY = "bb_reminder_identifiers";
const TOKEN_KEY = "bb_session_token";

export type ReminderRecord = {
  registrationId: number;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  notificationIdentifier: string;
  reminderLabel?: string;
  scheduledAt?: string;
};

export type ReminderTiming = {
  label: string;
  offsetDays: number;
};

export const REMINDER_OPTIONS: ReminderTiming[] = [
  { label: "1 week before", offsetDays: 7 },
  { label: "1 day before", offsetDays: 1 },
  { label: "Morning of", offsetDays: 0 },
];

type ServerReminderRecord = {
  registrationId: number;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  notificationIdentifier: string;
  reminderLabel: string | null;
  scheduledAt: string | null;
};

export async function getStoredAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function loadReminderRecords(): Promise<ReminderRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveReminderRecords(records: ReminderRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // silently fail
  }
}

export async function saveReminderIdentifier(
  registrationId: number,
  eventId: number,
  eventTitle: string,
  eventDate: string,
  notificationIdentifier: string,
  reminderLabel?: string,
  scheduledAt?: string
): Promise<void> {
  const records = await loadReminderRecords();
  const filtered = records.filter((r) => r.registrationId !== registrationId);
  filtered.push({
    registrationId,
    eventId,
    eventTitle,
    eventDate,
    notificationIdentifier,
    reminderLabel,
    scheduledAt,
  });
  await saveReminderRecords(filtered);
}

export async function removeReminderByRegistrationId(registrationId: number): Promise<void> {
  const records = await loadReminderRecords();
  const updated = records.filter((r) => r.registrationId !== registrationId);
  await saveReminderRecords(updated);
}

export async function getPendingReminders(): Promise<ReminderRecord[]> {
  if (Platform.OS === "web") return [];

  const records = await loadReminderRecords();
  if (records.length === 0) return [];

  let scheduled: Notifications.NotificationRequest[] = [];
  try {
    scheduled = await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return [];
  }

  const scheduledIds = new Set(scheduled.map((n) => n.identifier));

  const stillPending = records.filter((r) => scheduledIds.has(r.notificationIdentifier));

  if (stillPending.length !== records.length) {
    await saveReminderRecords(stillPending);
  }

  return stillPending;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Get the Expo push token for this device.
 * Returns null on web, simulators without credentials, or if permissions are not granted.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

/**
 * Send the device push token to the API server so the server can deliver
 * push notifications even when the app is not open.
 * Silently no-ops if the token cannot be obtained or the request fails.
 */
export async function registerPushTokenWithServer(
  apiBaseUrl: string,
  getAuthToken: () => Promise<string | null>
): Promise<void> {
  if (Platform.OS === "web") return;

  const token = await getExpoPushToken();
  if (!token) return;

  const authToken = await getAuthToken();
  if (!authToken) return;

  try {
    await fetch(`${apiBaseUrl}/api/notifications/push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch {
    // Non-critical — don't surface errors to the user
  }
}

/**
 * Remove the device push token from the API server (call on sign-out).
 * Silently no-ops if anything fails.
 */
export async function unregisterPushTokenFromServer(
  apiBaseUrl: string,
  getAuthToken: () => Promise<string | null>
): Promise<void> {
  if (Platform.OS === "web") return;

  const token = await getExpoPushToken();
  if (!token) return;

  const authToken = await getAuthToken();
  if (!authToken) return;

  try {
    await fetch(`${apiBaseUrl}/api/notifications/push-token`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch {
    // Non-critical
  }
}

/**
 * Persist a reminder record to the server tied to the user's account.
 * Silently no-ops if not authenticated or the request fails.
 */
export async function syncReminderToServer(
  apiBaseUrl: string,
  getAuthToken: () => Promise<string | null>,
  record: ReminderRecord
): Promise<void> {
  if (Platform.OS === "web") return;
  const authToken = await getAuthToken();
  if (!authToken) return;
  try {
    await fetch(`${apiBaseUrl}/api/registrations/my/${record.registrationId}/reminder`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        notificationIdentifier: record.notificationIdentifier,
        reminderLabel: record.reminderLabel ?? null,
        scheduledAt: record.scheduledAt ?? null,
      }),
    });
  } catch {
    // Non-critical
  }
}

/**
 * Remove a reminder record from the server.
 * Silently no-ops if not authenticated or the request fails.
 */
export async function removeReminderFromServer(
  apiBaseUrl: string,
  getAuthToken: () => Promise<string | null>,
  registrationId: number
): Promise<void> {
  if (Platform.OS === "web") return;
  const authToken = await getAuthToken();
  if (!authToken) return;
  try {
    await fetch(`${apiBaseUrl}/api/registrations/my/${registrationId}/reminder`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });
  } catch {
    // Non-critical
  }
}

function buildReminderContent(
  serverRec: ServerReminderRecord
): Notifications.NotificationContentInput {
  const timing = REMINDER_OPTIONS.find((o) => o.label === serverRec.reminderLabel);
  const offsetDays = timing?.offsetDays ?? 1;

  const eventDate = new Date(serverRec.eventDate);
  const timeStr = eventDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateStr = eventDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  let title: string;
  let body: string;
  if (offsetDays === 0) {
    title = "Your event is today! 🌟";
    body = `${serverRec.eventTitle} is today at ${timeStr} at ${serverRec.eventLocation}`;
  } else if (offsetDays === 1) {
    title = "Your event is tomorrow! ✨";
    body = `Don't forget — ${serverRec.eventTitle} is tomorrow at ${timeStr} at ${serverRec.eventLocation}`;
  } else {
    title = "Upcoming event reminder 📅";
    body = `Coming up in ${offsetDays} days — ${serverRec.eventTitle} on ${dateStr} at ${serverRec.eventLocation}`;
  }

  return {
    title,
    body,
    data: { eventId: serverRec.eventId, screen: "event" },
  };
}

/**
 * On sign-in (or app launch after reinstall), fetch reminder records from the server
 * and reconcile them with the OS notification scheduler.
 *
 * - Records already in the OS scheduler are preserved as-is.
 * - Records missing from the OS scheduler (e.g. after reinstall) are rescheduled.
 * - Records whose scheduled time has already passed are pruned from the server.
 *
 * Returns the up-to-date list of active reminder records and persists them to
 * local AsyncStorage.
 */
export async function rehydrateRemindersFromServer(
  apiBaseUrl: string,
  getAuthToken: () => Promise<string | null>
): Promise<ReminderRecord[]> {
  if (Platform.OS === "web") return [];

  const authToken = await getAuthToken();
  if (!authToken) return getPendingReminders();

  let serverRecords: ServerReminderRecord[];
  try {
    const resp = await fetch(`${apiBaseUrl}/api/registrations/my/reminders`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!resp.ok) return getPendingReminders();
    serverRecords = await resp.json();
  } catch {
    return getPendingReminders();
  }

  if (serverRecords.length === 0) {
    await saveReminderRecords([]);
    return [];
  }

  let scheduled: Notifications.NotificationRequest[] = [];
  try {
    scheduled = await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return getPendingReminders();
  }
  const scheduledIds = new Set(scheduled.map((n) => n.identifier));

  const { status: permStatus } = await Notifications.getPermissionsAsync();
  const hasPermission = permStatus === "granted";

  const now = new Date();
  const updatedRecords: ReminderRecord[] = [];
  const toPrune: number[] = [];

  for (const serverRec of serverRecords) {
    const eventDate = new Date(serverRec.eventDate);
    const scheduledAt = serverRec.scheduledAt ? new Date(serverRec.scheduledAt) : null;

    // Event has already passed — prune server entry
    if (eventDate < now) {
      toPrune.push(serverRec.registrationId);
      continue;
    }

    if (scheduledIds.has(serverRec.notificationIdentifier)) {
      // Already in the OS scheduler — keep the record exactly as stored
      updatedRecords.push({
        registrationId: serverRec.registrationId,
        eventId: serverRec.eventId,
        eventTitle: serverRec.eventTitle,
        eventDate: serverRec.eventDate,
        notificationIdentifier: serverRec.notificationIdentifier,
        reminderLabel: serverRec.reminderLabel ?? undefined,
        scheduledAt: serverRec.scheduledAt ?? undefined,
      });
    } else if (scheduledAt && scheduledAt > now && hasPermission) {
      // Not in OS (reinstall/restore) but the reminder time is still in the future — reschedule
      try {
        const newIdentifier = await Notifications.scheduleNotificationAsync({
          content: buildReminderContent(serverRec),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: scheduledAt,
          },
        });

        const newRecord: ReminderRecord = {
          registrationId: serverRec.registrationId,
          eventId: serverRec.eventId,
          eventTitle: serverRec.eventTitle,
          eventDate: serverRec.eventDate,
          notificationIdentifier: newIdentifier,
          reminderLabel: serverRec.reminderLabel ?? undefined,
          scheduledAt: serverRec.scheduledAt ?? undefined,
        };

        updatedRecords.push(newRecord);

        // Update the server with the fresh OS identifier
        syncReminderToServer(apiBaseUrl, getAuthToken, newRecord).catch(() => {});
      } catch {
        // If rescheduling fails, skip this entry
      }
    } else {
      // scheduledAt is in the past (or null) and not in OS — notification already fired
      toPrune.push(serverRec.registrationId);
    }
  }

  // Prune stale entries from server (fire-and-forget)
  for (const regId of toPrune) {
    removeReminderFromServer(apiBaseUrl, getAuthToken, regId).catch(() => {});
  }

  await saveReminderRecords(updatedRecords);
  return updatedRecords;
}

export async function scheduleConfirmationNotification(event: {
  id: number;
  title: string;
  date: string;
  location: string;
}): Promise<void> {
  if (Platform.OS === "web") return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "You're registered! 🎉",
      body: `See you at ${event.title} on ${new Date(event.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}`,
      data: { eventId: event.id, screen: "event" },
    },
    trigger: null,
  });
}

/**
 * Schedule a reminder for an event based on a chosen timing offset.
 * offsetDays = 0 means morning of the event; 1 = day before; 7 = week before.
 * Returns the notification identifier and the scheduled Date, or null if
 * the reminder would fire in the past or permissions are not granted.
 */
export async function scheduleReminderWithOffset(
  event: {
    id: number;
    title: string;
    date: string;
    location: string;
  },
  timing: ReminderTiming
): Promise<{ identifier: string; scheduledAt: Date } | null> {
  if (Platform.OS === "web") return null;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return null;

  const eventDate = new Date(event.date);
  const reminderDate = new Date(eventDate);
  reminderDate.setDate(reminderDate.getDate() - timing.offsetDays);
  reminderDate.setHours(9, 0, 0, 0);

  if (reminderDate <= new Date()) return null;

  const timeStr = eventDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateStr = eventDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  let notifTitle: string;
  let notifBody: string;

  if (timing.offsetDays === 0) {
    notifTitle = "Your event is today! 🌟";
    notifBody = `${event.title} is today at ${timeStr} at ${event.location}`;
  } else if (timing.offsetDays === 1) {
    notifTitle = "Your event is tomorrow! ✨";
    notifBody = `Don't forget — ${event.title} is tomorrow at ${timeStr} at ${event.location}`;
  } else {
    notifTitle = "Upcoming event reminder 📅";
    notifBody = `Coming up in ${timing.offsetDays} days — ${event.title} on ${dateStr} at ${event.location}`;
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: notifTitle,
      body: notifBody,
      data: { eventId: event.id, screen: "event" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });

  return { identifier, scheduledAt: reminderDate };
}

/** @deprecated Use scheduleReminderWithOffset instead */
export async function scheduleDayBeforeReminder(event: {
  id: number;
  title: string;
  date: string;
  location: string;
}): Promise<string | null> {
  const result = await scheduleReminderWithOffset(event, { label: "1 day before", offsetDays: 1 });
  return result?.identifier ?? null;
}

export async function cancelEventReminder(identifier: string): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}
