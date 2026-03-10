import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { db } from "@/firebaseConfig";
import useAuth from "@/hooks/use-auth";

// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();
  const receivedSub = useRef<Notifications.EventSubscription | null>(null);
  const responseSub = useRef<Notifications.EventSubscription | null>(null);

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

    // User tapped on a notification
    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("[push] tapped:", response.notification.request.content.data);
      }
    );

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, [user?.uid]);
}

async function registerForPushNotificationsAsync(uid: string): Promise<void> {
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
 * Sends a push notification via Expo's push service (no server needed).
 * The recipient must have their expoPushToken stored in Firestore.
 */
export async function sendExpoPush(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        channelId: "default",   // required for Android
        title,
        body,
        data: data ?? {},
        priority: "high",
      }),
    });
    const json = await res.json();
    if (json?.data?.status === "error") {
      console.warn("[sendExpoPush] Expo error:", json.data.message);
    }
  } catch (e) {
    console.warn("[sendExpoPush] Network error:", e);
  }
}
