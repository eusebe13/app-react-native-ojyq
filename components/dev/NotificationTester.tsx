import * as Notifications from "expo-notifications";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useUpdateStatus } from "@/contexts/UpdateContext";

const TEST_CASES = [
  {
    label: "Message",
    content: {
      title: "💬 Nouveau message",
      body: "Quelqu'un a écrit dans #général",
      data: { type: "message", channelId: "test-channel-id", channelName: "général" },
      categoryIdentifier: "message-actions",
    },
  },
  {
    label: "Tâche",
    content: {
      title: "✅ Nouvelle tâche",
      body: "Une tâche vous a été assignée",
      data: { type: "task", taskId: "test-task-id" },
    },
  },
  {
    label: "Événement",
    content: {
      title: "📅 Rappel événement",
      body: "Un événement commence bientôt",
      data: { type: "event", eventId: "test-event-id" },
      categoryIdentifier: "event-actions",
    },
  },
];

export function NotificationTester() {
  const [open, setOpen] = useState(false);
  const { setHasUpdate } = useUpdateStatus();

  async function fire(content: Notifications.NotificationContentInput) {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.warn("[NotificationTester] permission denied");
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

    await Notifications.scheduleNotificationAsync({
      content: {
        ...content,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        repeats: false,
      },
    });

    setOpen(false);
  }

  return (
    <View style={styles.container}>
      {open && (
        <View style={styles.panel}>
          {TEST_CASES.map((tc) => (
            <Pressable
              key={tc.label}
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
              onPress={() => fire(tc.content)}
            >
              <Text style={styles.btnText}>{tc.label}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.btn, styles.updateBtn]}
            onPress={() => { setHasUpdate(true); setOpen(false); }}
          >
            <Text style={styles.btnText}>🆕 Mise à jour</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.closeBtn]}
            onPress={() => setOpen(false)}
          >
            <Text style={styles.btnText}>✕ Fermer</Text>
          </Pressable>
        </View>
      )}
      <Pressable style={styles.fab} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.fabText}>🔔</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 110,
    right: 16,
    alignItems: "flex-end",
    zIndex: 9999,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#14389c",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  fabText: { fontSize: 22 },
  panel: { marginBottom: 10, gap: 8 },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: "#14389c",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  btnPressed: { opacity: 0.75 },
  updateBtn: { backgroundColor: "#059669" },
  closeBtn: { backgroundColor: "#444" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
