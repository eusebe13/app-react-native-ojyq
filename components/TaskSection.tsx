/**
 * TaskSection — Task management section for the home screen.
 *
 * Features:
 *  - Regular members see their assigned tasks (by uid or by role)
 *  - Managers (Président / Administrateur / Vice-Président) see all tasks + can create/edit/delete
 *  - Color-coded priority stripe (red / gold / green)
 *  - Deadline urgency badges (overdue / today / soon / future)
 *  - Tap card → detail modal with full info
 *  - Tap checkbox → toggle done (Firestore)
 *  - Long-press → quick delete (managers only)
 *  - Completed tasks collapse into a toggle row
 *  - Creation / edit bottom sheet with title, description, priority, deadline, assignee
 *  - Push notification sent to assignee on create / reassign
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "@/firebaseConfig";
import { useAppTheme } from "@/contexts/ThemeContext";
import useAuth from "@/hooks/use-auth";
import { useMembers } from "@/hooks/use-members";
import { useProfile } from "@/hooks/use-profile";
import { sendExpoPush } from "@/hooks/use-push-notifications";
import { useTasks, Task } from "@/hooks/use-tasks";
import { UserRole } from "@/types";
import { Icon } from "./ui/Icon";

// ─── Constants ────────────────────────────────────────────────────────────────

const MANAGE_ROLES: UserRole[] = ["Président", "Administrateur", "Vice-Président"];

const ALL_ROLES: UserRole[] = [
  "Membre",
  "Secrétaire",
  "Trésorier",
  "Vice-Président",
  "Président",
  "Administrateur",
];

const PRIORITIES = [
  { key: "low" as const, label: "Faible" },
  { key: "medium" as const, label: "Moyenne" },
  { key: "high" as const, label: "Haute" },
];

const PRIORITY_LABELS: Record<string, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Haute",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDeadlineInfo(date: Date, colors: any) {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (diff < 0)
    return { label: "En retard", bg: colors.accent6 + "25", textColor: colors.accent6 };
  if (days === 0)
    return { label: "Aujourd'hui", bg: colors.accent1 + "25", textColor: colors.accent1 };
  if (days <= 3)
    return {
      label: `${days} jour${days > 1 ? "s" : ""}`,
      bg: colors.accent1 + "25",
      textColor: colors.accent1,
    };
  return {
    label: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    bg: colors.online + "20",
    textColor: colors.online,
  };
}

function getPriorityColor(priority: string, colors: any): string {
  if (priority === "high") return colors.accent6;
  if (priority === "medium") return colors.accent1;
  return colors.accent5;
}

function parseDateStr(str: string): Date | null {
  const parts = str.trim().split("-");
  if (parts.length !== 3) return null;
  const d = new Date(
    parseInt(parts[0]),
    parseInt(parts[1]) - 1,
    parseInt(parts[2])
  );
  return isNaN(d.getTime()) ? null : d;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Notification helper ──────────────────────────────────────────────────────

async function notifyAssignee(
  assigneeType: "user" | "role",
  assigneeId: string,
  taskTitle: string,
  senderName: string
) {
  if (assigneeType !== "user") return; // role notifications not supported client-side
  try {
    const snap = await getDoc(doc(db, "users", assigneeId));
    const token = snap.data()?.expoPushToken as string | undefined;
    if (!token) return;
    await sendExpoPush(
      token,
      "Nouvelle tâche assignée",
      `${senderName} vous a assigné : ${taskTitle}`,
      { type: "task" }
    );
  } catch (e) {
    console.warn("[notifyAssignee]", e);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export const TaskSection = () => {
  const { colors, tokens } = useAppTheme();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { members } = useMembers();
  const { myTasks, allTasks, loading: tasksLoading } = useTasks(
    user?.uid ?? "",
    profile.role
  );

  const styles = getStyles(colors, tokens);

  const canManage = MANAGE_ROLES.includes(profile.role as UserRole);
  const displayTasks = canManage ? allTasks : myTasks;
  const pending = displayTasks.filter((t) => t.status === "todo");
  const completed = displayTasks.filter((t) => t.status === "done");

  // ── Modal visibility ─────────────────────────────────────────────────────
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null); // null = new task
  const [showCompleted, setShowCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Form state ───────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [deadlineStr, setDeadlineStr] = useState("");
  const [assigneeType, setAssigneeType] = useState<"user" | "role">("user");
  const [assigneeId, setAssigneeId] = useState("");

  // ── Form helpers ─────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDeadlineStr("");
    setAssigneeType("user");
    setAssigneeId("");
    setEditingTask(null);
  }, []);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    resetForm();
  }, [resetForm]);

  const openCreate = useCallback(() => {
    resetForm();
    setFormVisible(true);
  }, [resetForm]);

  const openEdit = useCallback((task: Task) => {
    setDetailTask(null);
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setDeadlineStr(formatDateStr(task.deadline));
    setAssigneeType(task.assigneeType);
    setAssigneeId(task.assigneeId);
    setFormVisible(true);
  }, []);

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert("Erreur", "Le titre est obligatoire");
      return;
    }
    const deadline = parseDateStr(deadlineStr);
    if (!deadline) {
      Alert.alert("Format invalide", "Utilisez le format AAAA-MM-JJ");
      return;
    }
    if (!assigneeId) {
      Alert.alert("Erreur", "Veuillez sélectionner un assigné");
      return;
    }

    const assigneeName =
      assigneeType === "user"
        ? (() => {
            const m = members.find((m) => m.uid === assigneeId);
            return m ? `${m.firstName} ${m.lastName}` : "";
          })()
        : assigneeId;

    const senderName = `${profile.firstName} ${profile.lastName}`.trim();
    setSaving(true);

    try {
      if (editingTask) {
        // ── Edit existing task ──
        const wasReassigned = editingTask.assigneeId !== assigneeId;
        await updateDoc(doc(db, "tasks", editingTask.id), {
          title: title.trim(),
          description: description.trim(),
          priority,
          deadline: Timestamp.fromDate(deadline),
          assigneeType,
          assigneeId,
          assigneeName,
        });
        // Notify new assignee only if reassigned to a different user
        if (wasReassigned) {
          notifyAssignee(assigneeType, assigneeId, title.trim(), senderName);
        }
      } else {
        // ── Create new task ──
        await addDoc(collection(db, "tasks"), {
          title: title.trim(),
          description: description.trim(),
          priority,
          deadline: Timestamp.fromDate(deadline),
          assigneeType,
          assigneeId,
          assigneeName,
          status: "todo",
          createdBy: user?.uid ?? "",
          createdByName: senderName,
          createdAt: Timestamp.now(),
          completedAt: null,
        });
        notifyAssignee(assigneeType, assigneeId, title.trim(), senderName);
      }
      closeForm();
    } catch {
      Alert.alert("Erreur", "Impossible de sauvegarder la tâche");
    } finally {
      setSaving(false);
    }
  }, [
    title, description, priority, deadlineStr, assigneeType, assigneeId,
    members, user, profile, editingTask, closeForm,
  ]);

  const handleToggle = useCallback(async (task: Task) => {
    const newStatus = task.status === "todo" ? "done" : "todo";
    await updateDoc(doc(db, "tasks", task.id), {
      status: newStatus,
      completedAt: newStatus === "done" ? Timestamp.now() : null,
    }).catch(() => Alert.alert("Erreur", "Impossible de mettre à jour la tâche"));
  }, []);

  const handleDelete = useCallback(
    (task: Task) => {
      if (!canManage) return;
      Alert.alert(
        "Supprimer la tâche",
        `Supprimer "${task.title}" ? Cette action est irréversible.`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: () => {
              setDetailTask(null);
              deleteDoc(doc(db, "tasks", task.id)).catch(() =>
                Alert.alert("Erreur", "Impossible de supprimer la tâche")
              );
            },
          },
        ]
      );
    },
    [canManage]
  );

  const handleLongPress = useCallback(
    (task: Task) => {
      if (!canManage) return;
      handleDelete(task);
    },
    [canManage, handleDelete]
  );

  // ── Task card ─────────────────────────────────────────────────────────────

  const renderTaskCard = (task: Task) => {
    const isDone = task.status === "done";
    const stripeColor = isDone
      ? colors.online
      : getPriorityColor(task.priority, colors);
    const dl = getDeadlineInfo(task.deadline, colors);
    const isOverdue = task.deadline < new Date() && !isDone;

    return (
      <TouchableOpacity
        key={task.id}
        style={[
          styles.taskCard,
          isDone && styles.taskCardDone,
          isOverdue && { borderColor: colors.accent6 + "50" },
        ]}
        onPress={() => setDetailTask(task)}
        onLongPress={() => handleLongPress(task)}
        activeOpacity={0.85}
      >
        {/* Priority / completion stripe */}
        <View style={[styles.taskStripe, { backgroundColor: stripeColor }]} />

        <View style={styles.taskBody}>
          {/* Row 1: title + checkbox */}
          <View style={styles.taskTitleRow}>
            <Text
              style={[styles.taskTitle, isDone && styles.taskTitleDone]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
            <TouchableOpacity
              onPress={() => handleToggle(task)}
              style={[
                styles.checkbox,
                isDone && { backgroundColor: colors.online, borderColor: colors.online },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isDone && <Icon name="check" size={12} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>

          {/* Row 2: description preview */}
          {!!task.description && (
            <Text style={styles.taskDesc} numberOfLines={1}>
              {task.description}
            </Text>
          )}

          {/* Row 3: deadline + assignee */}
          <View style={styles.taskMeta}>
            <View style={[styles.deadlineBadge, { backgroundColor: dl.bg }]}>
              <Icon name="calendar-clock-outline" size={11} color={dl.textColor} />
              <Text style={[styles.badgeText, { color: dl.textColor }]}>
                {dl.label}
              </Text>
            </View>
            <View style={styles.assigneeBadge}>
              <Icon
                name={
                  task.assigneeType === "role"
                    ? "account-group-outline"
                    : "account-outline"
                }
                size={11}
                color={colors.textTertiary}
              />
              <Text style={styles.assigneeText} numberOfLines={1}>
                {task.assigneeName}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (profileLoading || tasksLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View>
      {/* ── Section header ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLeft}>
          <View style={styles.sectionIconWrap}>
            <Icon name="clipboard-check-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Tâches</Text>
          {pending.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pending.length}</Text>
            </View>
          )}
        </View>
        {canManage && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={openCreate}
            activeOpacity={0.7}
          >
            <Icon name="plus" size={16} color={colors.primary} />
            <Text style={styles.addBtnLabel}>Ajouter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Pending tasks ── */}
      {pending.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Icon name="clipboard-check-outline" size={28} color={colors.textTertiary} />
          <Text style={styles.emptyText}>
            {canManage ? "Aucune tâche créée" : "Aucune tâche assignée"}
          </Text>
        </View>
      ) : (
        <View style={styles.taskList}>{pending.map(renderTaskCard)}</View>
      )}

      {/* ── Completed (collapsible) ── */}
      {completed.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.completedToggle}
            onPress={() => setShowCompleted((v) => !v)}
            activeOpacity={0.7}
          >
            <Icon
              name={showCompleted ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.textTertiary}
            />
            <Text style={styles.completedToggleText}>
              Terminées ({completed.length})
            </Text>
          </TouchableOpacity>
          {showCompleted && (
            <View style={styles.taskList}>{completed.map(renderTaskCard)}</View>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DETAIL MODAL
          ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!detailTask}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailTask(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setDetailTask(null)}
          />

          {detailTask && (
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* ── Priority stripe banner ── */}
                <View
                  style={[
                    styles.detailBanner,
                    {
                      backgroundColor:
                        detailTask.status === "done"
                          ? colors.online + "18"
                          : getPriorityColor(detailTask.priority, colors) + "18",
                      borderColor:
                        detailTask.status === "done"
                          ? colors.online + "40"
                          : getPriorityColor(detailTask.priority, colors) + "40",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.detailPriorityDot,
                      {
                        backgroundColor:
                          detailTask.status === "done"
                            ? colors.online
                            : getPriorityColor(detailTask.priority, colors),
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.detailPriorityLabel,
                      {
                        color:
                          detailTask.status === "done"
                            ? colors.online
                            : getPriorityColor(detailTask.priority, colors),
                      },
                    ]}
                  >
                    {detailTask.status === "done"
                      ? "Terminée"
                      : `Priorité ${PRIORITY_LABELS[detailTask.priority]}`}
                  </Text>
                </View>

                {/* ── Title ── */}
                <Text style={styles.detailTitle}>{detailTask.title}</Text>

                {/* ── Description ── */}
                {!!detailTask.description && (
                  <Text style={styles.detailDescription}>
                    {detailTask.description}
                  </Text>
                )}

                {/* ── Meta rows ── */}
                <View style={styles.detailMetaBlock}>
                  <DetailRow
                    icon="calendar-clock-outline"
                    label="Échéance"
                    value={detailTask.deadline.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    colors={colors}
                    tokens={tokens}
                    valueColor={
                      getDeadlineInfo(detailTask.deadline, colors).textColor
                    }
                  />
                  <DetailRow
                    icon={
                      detailTask.assigneeType === "role"
                        ? "account-group-outline"
                        : "account-outline"
                    }
                    label="Assigné à"
                    value={detailTask.assigneeName}
                    colors={colors}
                    tokens={tokens}
                  />
                  <DetailRow
                    icon="account-edit-outline"
                    label="Créé par"
                    value={detailTask.createdByName}
                    colors={colors}
                    tokens={tokens}
                  />
                  <DetailRow
                    icon="clock-outline"
                    label="Créé le"
                    value={detailTask.createdAt.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    colors={colors}
                    tokens={tokens}
                  />
                  {detailTask.completedAt && (
                    <DetailRow
                      icon="check-circle-outline"
                      label="Terminé le"
                      value={detailTask.completedAt.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      colors={colors}
                      tokens={tokens}
                      valueColor={colors.online}
                    />
                  )}
                </View>

                {/* ── Actions ── */}
                <View style={styles.detailActions}>
                  {/* Toggle done — available to everyone */}
                  <TouchableOpacity
                    style={[
                      styles.detailActionBtn,
                      {
                        backgroundColor:
                          detailTask.status === "done"
                            ? colors.surfaceDim
                            : colors.online + "15",
                        borderColor:
                          detailTask.status === "done"
                            ? colors.border
                            : colors.online + "40",
                      },
                    ]}
                    onPress={() => {
                      handleToggle(detailTask);
                      setDetailTask((t) =>
                        t
                          ? { ...t, status: t.status === "todo" ? "done" : "todo" }
                          : null
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={
                        detailTask.status === "done"
                          ? "refresh"
                          : "check-circle-outline"
                      }
                      size={18}
                      color={
                        detailTask.status === "done"
                          ? colors.textSecondary
                          : colors.online
                      }
                    />
                    <Text
                      style={[
                        styles.detailActionLabel,
                        {
                          color:
                            detailTask.status === "done"
                              ? colors.textSecondary
                              : colors.online,
                        },
                      ]}
                    >
                      {detailTask.status === "done"
                        ? "Rouvrir"
                        : "Marquer terminée"}
                    </Text>
                  </TouchableOpacity>

                  {/* Edit — managers only */}
                  {canManage && (
                    <TouchableOpacity
                      style={[
                        styles.detailActionBtn,
                        {
                          backgroundColor: colors.primary + "15",
                          borderColor: colors.primary + "40",
                        },
                      ]}
                      onPress={() => openEdit(detailTask)}
                      activeOpacity={0.7}
                    >
                      <Icon name="pencil-outline" size={18} color={colors.primary} />
                      <Text
                        style={[
                          styles.detailActionLabel,
                          { color: colors.primary },
                        ]}
                      >
                        Modifier
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* ── Delete ── */}
                {canManage && (
                  <TouchableOpacity
                    style={styles.detailDeleteBtn}
                    onPress={() => handleDelete(detailTask)}
                    activeOpacity={0.7}
                  >
                    <Icon name="trash-can-outline" size={16} color={colors.accent6} />
                    <Text style={[styles.detailDeleteLabel, { color: colors.accent6 }]}>
                      Supprimer la tâche
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: 8 }} />
              </ScrollView>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          CREATION / EDIT MODAL
          ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={formVisible}
        animationType="slide"
        transparent
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeForm}
          />

          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingTask ? "Modifier la tâche" : "Nouvelle tâche"}
              </Text>

              {/* ── Title ── */}
              <Text style={styles.label}>TITRE *</Text>
              <TextInput
                style={styles.input}
                placeholder="Titre de la tâche..."
                placeholderTextColor={colors.textTertiary}
                value={title}
                onChangeText={setTitle}
                autoFocus={!editingTask}
              />

              {/* ── Description ── */}
              <Text style={styles.label}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Décrivez la tâche (optionnel)..."
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              {/* ── Priority ── */}
              <Text style={styles.label}>PRIORITÉ</Text>
              <View style={styles.chipRow}>
                {PRIORITIES.map(({ key, label }) => {
                  const active = priority === key;
                  const pColor = getPriorityColor(key, colors);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? pColor : colors.surfaceDim,
                          borderColor: active ? pColor : colors.border,
                        },
                      ]}
                      onPress={() => setPriority(key)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? "#FFFFFF" : colors.textSecondary },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Deadline ── */}
              <Text style={styles.label}>ÉCHÉANCE * (AAAA-MM-JJ)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-06-01"
                placeholderTextColor={colors.textTertiary}
                value={deadlineStr}
                onChangeText={setDeadlineStr}
                keyboardType="numbers-and-punctuation"
              />

              {/* ── Assignee type ── */}
              <Text style={styles.label}>ASSIGNER À</Text>
              <View style={[styles.chipRow, { marginBottom: tokens.space.md }]}>
                {(["user", "role"] as const).map((type) => {
                  const active = assigneeType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chip,
                        styles.chipFlex,
                        {
                          backgroundColor: active ? colors.primary : colors.surfaceDim,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setAssigneeType(type);
                        setAssigneeId("");
                      }}
                    >
                      <Icon
                        name={
                          type === "user" ? "account-outline" : "account-group-outline"
                        }
                        size={14}
                        color={active ? "#FFFFFF" : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: active ? "#FFFFFF" : colors.textSecondary,
                            marginLeft: 4,
                          },
                        ]}
                      >
                        {type === "user" ? "Personne" : "Groupe (rôle)"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Assignee picker ── */}
              {assigneeType === "user" ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: tokens.space.lg }}
                >
                  {members.map((m) => {
                    const sel = assigneeId === m.uid;
                    return (
                      <TouchableOpacity
                        key={m.uid}
                        style={[
                          styles.memberChip,
                          {
                            backgroundColor: sel ? colors.primary : colors.surfaceDim,
                            borderColor: sel ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setAssigneeId(m.uid)}
                      >
                        <View
                          style={[
                            styles.memberInitial,
                            {
                              backgroundColor: sel
                                ? "rgba(255,255,255,0.2)"
                                : colors.primaryTint,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.memberInitialText,
                              { color: sel ? "#FFFFFF" : colors.primary },
                            ]}
                          >
                            {m.firstName[0]?.toUpperCase() ?? "?"}
                          </Text>
                        </View>
                        <View>
                          <Text
                            style={[
                              styles.memberName,
                              { color: sel ? "#FFFFFF" : colors.textPrimary },
                            ]}
                          >
                            {m.firstName}
                          </Text>
                          <Text
                            style={[
                              styles.memberRole,
                              {
                                color: sel
                                  ? "rgba(255,255,255,0.7)"
                                  : colors.textTertiary,
                              },
                            ]}
                          >
                            {m.role}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <View
                  style={[
                    styles.chipRow,
                    styles.chipWrap,
                    { marginBottom: tokens.space.lg },
                  ]}
                >
                  {ALL_ROLES.map((role) => {
                    const sel = assigneeId === role;
                    return (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: sel ? colors.primary : colors.surfaceDim,
                            borderColor: sel ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setAssigneeId(role)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: sel ? "#FFFFFF" : colors.textSecondary },
                          ]}
                        >
                          {role}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* ── Actions ── */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeForm}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editingTask ? "Enregistrer" : "Créer la tâche"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// ─── Detail row sub-component ──────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
  colors,
  tokens,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
  tokens: any;
  valueColor?: string;
}) {
  return (
    <View style={detailRowStyles(colors, tokens).row}>
      <View style={detailRowStyles(colors, tokens).iconWrap}>
        <Icon name={icon as any} size={14} color={colors.textTertiary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={detailRowStyles(colors, tokens).rowLabel}>{label}</Text>
        <Text
          style={[
            detailRowStyles(colors, tokens).rowValue,
            valueColor ? { color: valueColor } : undefined,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// cached outside component since it's only used in DetailRow
const detailRowStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: tokens.space.sm,
      paddingVertical: tokens.space.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: tokens.radius.sm,
      backgroundColor: colors.surfaceDim,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    rowLabel: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      fontWeight: "600",
      marginBottom: 2,
    },
    rowValue: {
      fontSize: tokens.font.base,
      color: colors.textPrimary,
      fontWeight: "500",
    },
  });

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    loadingWrap: {
      alignItems: "center",
      paddingVertical: tokens.space.lg,
    },

    // ── Section header ──
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: tokens.space.md,
    },
    sectionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
    },
    sectionIconWrap: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.sm,
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      fontSize: tokens.font.lg,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    countBadge: {
      backgroundColor: colors.primary,
      borderRadius: tokens.radius.pill,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    countBadgeText: {
      color: "#FFFFFF",
      fontSize: tokens.font.xs,
      fontWeight: "700",
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.primaryTint,
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.xs,
      borderRadius: tokens.radius.pill,
    },
    addBtnLabel: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
      color: colors.primary,
    },

    // ── Task list ──
    taskList: { gap: tokens.space.sm },

    // ── Task card ──
    taskCard: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    taskCardDone: { opacity: 0.6 },
    taskStripe: { width: 4 },
    taskBody: {
      flex: 1,
      padding: tokens.space.md,
      gap: 6,
    },
    taskTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: tokens.space.sm,
    },
    taskTitle: {
      flex: 1,
      fontSize: tokens.font.base,
      fontWeight: "600",
      color: colors.textPrimary,
      lineHeight: 20,
    },
    taskTitleDone: {
      textDecorationLine: "line-through",
      color: colors.textTertiary,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: 1,
    },
    taskDesc: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
    },
    taskMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
      flexWrap: "wrap",
    },
    deadlineBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: tokens.space.sm,
      paddingVertical: 3,
      borderRadius: tokens.radius.pill,
    },
    assigneeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    badgeText: { fontSize: tokens.font.xs, fontWeight: "600" },
    assigneeText: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
      fontWeight: "500",
    },

    // ── Completed toggle ──
    completedToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: tokens.space.sm,
      marginTop: tokens.space.xs,
    },
    completedToggleText: {
      fontSize: tokens.font.sm,
      color: colors.textTertiary,
      fontWeight: "600",
    },

    // ── Empty state ──
    emptyWrap: {
      alignItems: "center",
      gap: tokens.space.sm,
      paddingVertical: tokens.space.xl,
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    emptyText: {
      fontSize: tokens.font.base,
      color: colors.textTertiary,
      fontStyle: "italic",
    },

    // ── Modal (bottom sheet) ──
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 24,
      paddingBottom: Platform.OS === "ios" ? 40 : 24,
      maxHeight: "92%",
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: tokens.space.md,
      marginBottom: tokens.space.lg,
    },
    modalTitle: {
      fontSize: tokens.font.xl,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.xl,
    },
    label: {
      fontSize: tokens.font.xs,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 6,
      marginLeft: 4,
    },
    input: {
      borderWidth: 1,
      borderRadius: tokens.radius.md,
      padding: tokens.space.md,
      fontSize: tokens.font.md,
      marginBottom: tokens.space.lg,
      backgroundColor: colors.surfaceDim,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    textArea: { minHeight: 80, textAlignVertical: "top" },

    // ── Chips ──
    chipRow: {
      flexDirection: "row",
      gap: tokens.space.sm,
      marginBottom: tokens.space.lg,
    },
    chipWrap: { flexWrap: "wrap" },
    chip: {
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.sm,
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
    },
    chipFlex: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    chipText: { fontSize: tokens.font.sm, fontWeight: "600" },

    // ── Member picker ──
    memberChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.sm,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      marginRight: tokens.space.sm,
    },
    memberInitial: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    memberInitialText: { fontSize: tokens.font.sm, fontWeight: "700" },
    memberName: { fontSize: tokens.font.sm, fontWeight: "600" },
    memberRole: { fontSize: tokens.font.xs },

    // ── Modal buttons ──
    modalButtons: {
      flexDirection: "row",
      gap: tokens.space.md,
      marginTop: tokens.space.sm,
    },
    cancelBtn: {
      flex: 1,
      padding: 14,
      borderRadius: tokens.radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontSize: tokens.font.md,
      fontWeight: "600",
    },
    saveBtn: {
      flex: 2,
      padding: 14,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    saveBtnText: {
      color: "#FFFFFF",
      fontSize: tokens.font.md,
      fontWeight: "700",
    },

    // ── Detail modal ──
    detailBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.sm,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      marginBottom: tokens.space.md,
    },
    detailPriorityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    detailPriorityLabel: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    detailTitle: {
      fontSize: tokens.font.xxl,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.sm,
      lineHeight: 30,
    },
    detailDescription: {
      fontSize: tokens.font.base,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: tokens.space.lg,
    },
    detailMetaBlock: {
      backgroundColor: colors.surfaceDim,
      borderRadius: tokens.radius.lg,
      paddingHorizontal: tokens.space.md,
      marginBottom: tokens.space.lg,
      overflow: "hidden",
    },
    detailActions: {
      flexDirection: "row",
      gap: tokens.space.sm,
      marginBottom: tokens.space.sm,
    },
    detailActionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
    },
    detailActionLabel: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
    },
    detailDeleteBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      marginTop: tokens.space.xs,
    },
    detailDeleteLabel: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
    },
  });
