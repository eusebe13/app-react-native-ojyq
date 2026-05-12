import { db } from "@/firebaseConfig";
import useAuth from "@/hooks/use-auth";
import { getNotificationRoute } from "@/utils/notificationRouting";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

// Show notifications even when the app is in the foreground (native only)
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ─── Interactive notification categories ─────────────────────────────────────

async function registerNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync("message-actions", [
    {
      identifier: "reply",
      buttonTitle: "Répondre",
      textInput: {
        submitButtonTitle: "Envoyer",
        placeholder: "Répondre...",
      },
      options: { opensAppToForeground: false },
    },
    {
      identifier: "mark-read",
      buttonTitle: "Marquer lu",
      options: { opensAppToForeground: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync("event-actions", [
    {
      identifier: "going",
      buttonTitle: "✅ Je participe",
      options: { opensAppToForeground: false },
    },
    {
      identifier: "not-going",
      buttonTitle: "❌ Pas disponible",
      options: { opensAppToForeground: false },
    },
  ]);
}

// ─── Notification action handler ──────────────────────────────────────────────

async function handleNotificationAction(
  response: Notifications.NotificationResponse,
  uid: string,
): Promise<void> {
  const { actionIdentifier, userText } = response;
  const data = response.notification.request.content.data as Record<string, unknown>;

  if (data.type === "message" && typeof data.channelId === "string") {
    const channelId = data.channelId;

    if (actionIdentifier === "reply" && userText?.trim()) {
      const userSnap = await getDoc(doc(db, "users", uid));
      const ud = userSnap.data();
      const displayName =
        [ud?.firstName, ud?.lastName].filter(Boolean).join(" ") || "Membre";

      await addDoc(collection(db, "channels", channelId, "messages"), {
        text: userText.trim(),
        createdAt: Timestamp.now(),
        user: { _id: uid, name: displayName, avatar: null },
        image: null,
        poll: null,
        file: null,
        audio: null,
        replyTo: null,
      });
      await updateDoc(doc(db, "channels", channelId), {
        lastMessage: userText.trim(),
        lastMessageAt: Timestamp.now(),
      });
      // Mark read since the user just replied
      await setDoc(
        doc(db, "users", uid, "reads", channelId),
        { type: "channel", lastReadAt: serverTimestamp() },
        { merge: true },
      );
      return;
    }

    if (actionIdentifier === "mark-read") {
      await Promise.all([
        setDoc(
          doc(db, "users", uid, "reads", channelId),
          { type: "channel", lastReadAt: serverTimestamp() },
          { merge: true },
        ),
        updateDoc(doc(db, "channels", channelId), {
          [`lastMessageReadBy.${uid}`]: serverTimestamp(),
        }),
      ]);
    }
  }

  if (data.type === "event" && typeof data.eventId === "string") {
    const eventId = data.eventId;

    if (actionIdentifier === "going" || actionIdentifier === "not-going") {
      const userSnap = await getDoc(doc(db, "users", uid));
      const ud = userSnap.data();
      const displayName =
        [ud?.firstName, ud?.lastName].filter(Boolean).join(" ") || "Membre";

      await setDoc(doc(db, "events", eventId, "participants", uid), {
        userId: uid,
        userName: displayName,
        status: actionIdentifier === "going" ? "going" : "not_going",
        updatedAt: Timestamp.now(),
      });
    }
  }
}

// ─── Navigation helper ────────────────────────────────────────────────────────

function navigateFromNotification(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown>,
) {
  const route = getNotificationRoute(data);
  if (route) {
    router.push(route as any);
  }
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function usePushNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const receivedSub = useRef<Notifications.EventSubscription | null>(null);
  const responseSub = useRef<Notifications.EventSubscription | null>(null);

  const lastResponse =
    Platform.OS !== "web" ? Notifications.useLastNotificationResponse() : undefined;

  // Register interactive categories once on mount
  useEffect(() => {
    if (Platform.OS === "web") return;
    registerNotificationCategories().catch((e) =>
      console.warn("[push] category registration failed:", e),
    );
  }, []);

  // Handle cold start: app killed → opened via notification tap (default action only)
  useEffect(() => {
    if (!lastResponse) return;
    if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const data = lastResponse.notification.request.content.data as Record<string, unknown>;
    navigateFromNotification(router, data);
  }, [lastResponse, router]);

  useEffect(() => {
    if (!user?.uid || Platform.OS === "web") return;

    registerForPushNotificationsAsync(user.uid).catch((e) =>
      console.warn("[push-notifications] registration failed:", e),
    );

    receivedSub.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("[push] received:", notification.request.content.title);
      },
    );

    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        // Action button tapped — handle in Firestore, don't navigate
        if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
          handleNotificationAction(response, user.uid).catch((e) =>
            console.warn("[push] action handler failed:", e),
          );
          return;
        }
        // Notification body tapped — navigate
        const data = response.notification.request.content.data as Record<string, unknown>;
        navigateFromNotification(router, data);
      },
    );

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, [user?.uid, router]);
}

// ─── Push registration ────────────────────────────────────────────────────────

async function registerForPushNotificationsAsync(uid: string): Promise<void> {
  if (Constants.executionEnvironment === "storeClient") {
    console.log("[push-notifications] Expo Go detected — skipping push registration");
    return;
  }

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

// Re-export so existing imports from this file keep working
export { sendExpoPush } from "@/lib/sendExpoPush";
