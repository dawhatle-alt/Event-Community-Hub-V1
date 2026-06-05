import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
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
};

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
  notificationIdentifier: string
): Promise<void> {
  const records = await loadReminderRecords();
  const filtered = records.filter((r) => r.registrationId !== registrationId);
  filtered.push({ registrationId, eventId, eventTitle, eventDate, notificationIdentifier });
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

export async function scheduleDayBeforeReminder(event: {
  id: number;
  title: string;
  date: string;
  location: string;
}): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return null;

  const eventDate = new Date(event.date);
  const reminderDate = new Date(eventDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(9, 0, 0, 0);

  if (reminderDate <= new Date()) return null;

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Your event is tomorrow! ✨",
      body: `Don't forget — ${event.title} is tomorrow at ${eventDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })} at ${event.location}`,
      data: { eventId: event.id, screen: "event" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });

  return identifier;
}

export async function cancelEventReminder(identifier: string): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}
