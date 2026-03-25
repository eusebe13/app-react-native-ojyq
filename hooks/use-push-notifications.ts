import { db } from "@/firebaseConfig";
import useAuth from "@/hooks/use-auth";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function navigateFromNotification(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown>
) {
  if (data?.type === "message" && data?.channelId) {
    router.push({
      pathname: "/channel/[id]",
      params: { id: data.channelId as string, name: (data.channelName as string) ?? "Canal" },
    });
  } else if (data?.type === "task") {
    router.push("/(tabs)");
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const receivedSub = useRef<Notifications.EventSubscription | null>(null);
  const responseSub = useRef<Notifications.EventSubscription | null>(null);

  // Handle cold start: app was killed and opened via notification tap
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!lastResponse) return;
    const data = lastResponse.notification.request.content.data as Record<string, unknown>;
    navigateFromNotification(router, data);
  }, [lastResponse, router]);

  useEffect(() => {
    if (!user?.uid) return;

    registerForPushNotificationsAsync(user.uid).catch((e) =>
      console.warn("[push-notifications] registration failed:", e)
    );

    // Notification received while app is open
    receivedSub.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("[push] received:", notification.request.content.title);
      }
    );

    // User tapped on a notification (app in foreground or background)
    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        navigateFromNotification(router, data);
      }
    );

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, [user?.uid, router]);
}

async function registerForPushNotificationsAsync(uid: string): Promise<void> {
  // Push notifications are not supported in Expo Go since SDK 53
  if (Constants.executionEnvironment === "storeClient") {
    console.log("[push-notifications] Expo Go detected — skipping push registration");
    return;
  }

  // Android requires a channel before any notification can appear
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "OJYQ",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("[push-notifications] Permission not granted:", finalStatus);
    return;
  }

  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;

  if (!projectId) {
    console.warn("[push-notifications] No EAS projectId found in app.json");
    return;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  console.log("[push-notifications] Token registered:", token);
  await updateDoc(doc(db, "users", uid), { expoPushToken: token });
}

/**
 * Sends push notifications to one or multiple tokens in one HTTP request.
 */
/**
 * Sends push notifications to one or multiple tokens.
 * Returns the list of stale tokens (DeviceNotRegistered) for cleanup.
 */
export async function sendExpoPush(
  tokens: string | string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string[]> {
  const list = Array.isArray(tokens) ? tokens : [tokens];
  if (!list.length) return [];

  const base = { sound: "default", channelId: "default", title, body, data: data ?? {}, priority: "high" };
  const staleTokens: string[] = [];

  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk.map((to) => ({ to, ...base }))),
      });
      const json = await res.json();
      const tickets: any[] = Array.isArray(json?.data) ? json.data : [];
      tickets.forEach((t, j) => {
        if (t?.status === "error") {
          console.warn("[sendExpoPush] error:", t.message);
          const errorCode = t?.details?.error;
          if (errorCode === "DeviceNotRegistered" || errorCode === "InvalidCredentials") {
            staleTokens.push(chunk[j]);
          }
        }
      });
    } catch (e) {
      console.warn("[sendExpoPush] Network error:", e);
    }
  }

  return staleTokens;
}
