import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
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

async function loadReminderRecords(): Promise<ReminderRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveReminderRecords(records: ReminderRecord[]): Promise<void> {
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
