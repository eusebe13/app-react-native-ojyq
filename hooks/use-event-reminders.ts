// hooks/use-event-reminders.ts
import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { Platform } from "react-native";
import type { CalendarItem } from "@/types/models";

interface ReminderDate {
  label: "week" | "day" | "hour" | "now";
  date: Date;
}

const OFFSETS: Array<{ label: ReminderDate["label"]; ms: number }> = [
  { label: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "day",  ms: 48 * 60 * 60 * 1000 },
  { label: "hour", ms: 60 * 60 * 1000 },
  { label: "now",  ms: 0 },
];

const BODY_MAP: Record<ReminderDate["label"], string> = {
  week: "dans 1 semaine",
  day:  "demain",
  hour: "dans 1 heure",
  now:  "maintenant",
};

/** Pure — exported for unit tests */
export function computeReminderDates(eventDate: Date): ReminderDate[] {
  const now = Date.now();
  return OFFSETS
    .map(({ label, ms }) => ({ label, date: new Date(eventDate.getTime() - ms) }))
    .filter(({ date }) => date.getTime() > now);
}

export async function scheduleEventReminders(event: CalendarItem): Promise<void> {
  if (Platform.OS === "web") return;

  const eventDate: Date | null =
    event.dateObj ??
    ((event.date as unknown as { toDate(): Date }).toDate?.() ?? null);

  if (!eventDate) return;

  await cancelEventReminders(event.id);

  for (const { label, date } of computeReminderDates(eventDate)) {
    await Notifications.scheduleNotificationAsync({
      identifier: `event-${event.id}-${label}`,
      content: {
        title: event.title,
        body: `Rappel : ${BODY_MAP[label]}`,
        data: { type: "event", eventId: event.id, eventTitle: event.title },
        sound: "default",
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  }
}

export async function cancelEventReminders(eventId: string): Promise<void> {
  if (Platform.OS === "web") return;
  for (const { label } of OFFSETS) {
    await Notifications.cancelScheduledNotificationAsync(
      `event-${eventId}-${label}`,
    ).catch(() => {});
  }
}
