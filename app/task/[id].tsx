import { useAppTheme } from "@/contexts/ThemeContext";
import { useReadState } from "@/hooks/use-read-state";
import { useTasks } from "@/hooks/use-tasks";
import useAuth from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";

const PRIORITY_COLOR: Record<string, string> = {
  high: "#AE2012",
  medium: "#CA6702",
  low: "#1B4332",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "À faire",
  done: "Terminé",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { allTasks, loading } = useTasks(user?.uid ?? "", profile?.role ?? "");

  useReadState(id, "task");

  const task = allTasks.find((t) => t.id === id);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surfaceDim },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: tokens.space.lg,
      paddingVertical: tokens.space.md,
      gap: tokens.space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.surface,
    },
    back: { padding: 4 },
    headerTitle: {
      flex: 1,
      fontSize: tokens.font.lg,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    scroll: { flex: 1 },
    body: { padding: tokens.space.xl, gap: tokens.space.lg },
    card: {
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      gap: tokens.space.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderLight,
    },
    title: { fontSize: tokens.font.xl, fontWeight: "800", color: colors.textPrimary },
    desc: { fontSize: tokens.font.md, color: colors.textSecondary, lineHeight: 22 },
    row: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm },
    label: { fontSize: tokens.font.xs, fontWeight: "600", color: colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.5 },
    value: { fontSize: tokens.font.md, color: colors.textPrimary, fontWeight: "500" },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: tokens.radius.pill,
    },
    pillText: { fontSize: tokens.font.sm, fontWeight: "700", color: "#FFF" },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: tokens.space.sm },
    emptyText: { fontSize: tokens.font.md, color: colors.textTertiary },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Chargement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Icon name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tâche</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Tâche introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  const priorityColor = PRIORITY_COLOR[task.priority] ?? colors.textTertiary;
  const isOverdue = task.status === "todo" && task.deadline < new Date();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {task.title}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.title}>{task.title}</Text>
          {!!task.description && (
            <Text style={styles.desc}>{task.description}</Text>
          )}
        </View>

        <View style={styles.card}>
          {/* Status */}
          <View style={styles.row}>
            <Text style={styles.label}>Statut</Text>
            <View style={[styles.pill, { backgroundColor: task.status === "done" ? "#1B4332" : colors.primary }]}>
              <Text style={styles.pillText}>{STATUS_LABEL[task.status]}</Text>
            </View>
          </View>

          {/* Priority */}
          <View style={styles.row}>
            <Text style={styles.label}>Priorité</Text>
            <View style={[styles.pill, { backgroundColor: priorityColor }]}>
              <Text style={styles.pillText}>{task.priority}</Text>
            </View>
          </View>

          {/* Assignee */}
          <View style={styles.row}>
            <Text style={styles.label}>Assigné à</Text>
            <Text style={styles.value}>{task.assigneeName}</Text>
          </View>

          {/* Deadline */}
          <View style={styles.row}>
            <Text style={styles.label}>Échéance</Text>
            <Text style={[styles.value, isOverdue && { color: "#AE2012" }]}>
              {formatDate(task.deadline)}
              {isOverdue ? " — En retard" : ""}
            </Text>
          </View>

          {/* Created by */}
          <View style={styles.row}>
            <Text style={styles.label}>Créé par</Text>
            <Text style={styles.value}>{task.createdByName}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
