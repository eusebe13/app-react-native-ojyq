// utils/notificationRouting.ts

export interface NotificationRoute {
  pathname: string;
  params?: Record<string, string>;
}

export function getNotificationRoute(
  data: Record<string, unknown>,
): NotificationRoute | null {
  if (data?.type === "message" && typeof data.channelId === "string") {
    return {
      pathname: "/channel/[id]",
      params: {
        id: data.channelId,
        name: typeof data.channelName === "string" ? data.channelName : "Canal",
      },
    };
  }
  // NOTE: requires app/task/[id].tsx — implemented in Task 7
  if (data?.type === "task" && typeof data.taskId === "string") {
    return {
      pathname: "/task/[id]",
      params: { id: data.taskId },
    };
  }
  if (data?.type === "event" && typeof data.eventId === "string") {
    return {
      pathname: "/(tabs)/calendar",
      params: { eventId: data.eventId },
    };
  }
  return null;
}
