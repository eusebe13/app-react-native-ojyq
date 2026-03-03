/**
 * usePushNotifications — registers the device for Expo push notifications
 * and stores the token in Firestore `users/{uid}.expoPushToken`.
 *
 * Call this once when the user is authenticated (e.g. in the root layout).
 * The token is used by task-assignment flows to send cross-device notifications.
 */

import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect } from "react";
import { Platform } from "react-native";
import { db } from "@/firebaseConfig";
import useAuth from "@/hooks/use-auth";

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;
    registerForPushNotifications(user.uid);
  }, [user?.uid]);
}

async function registerForPushNotifications(uid: string) {
  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "OJYQ",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  // projectId is required by getExpoPushTokenAsync — skip silently if not configured
  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;

  if (!projectId) {
    // EAS project not configured yet — push tokens unavailable in this build.
    // Run `eas init` to link the project and enable cross-device notifications.
    return;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await updateDoc(doc(db, "users", uid), { expoPushToken: token });
  } catch (e) {
    // Non-critical: simulator, revoked permission, network issue, etc.
    console.warn("[push-notifications]", e);
  }
}

/**
 * Sends a push notification to a single Expo push token via the Expo push service.
 * Safe to call from the client — no server needed.
 */
export async function sendExpoPush(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data: data ?? {},
        priority: "high",
      }),
    });
  } catch (e) {
    console.warn("[sendExpoPush]", e);
  }
}
