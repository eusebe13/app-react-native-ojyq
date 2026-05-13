import { showToast } from "@/components/Toast";
import { useAppTheme } from "@/contexts/ThemeContext";
import { db } from "@/firebaseConfig";
import { sendExpoPush } from "@/hooks/use-push-notifications";
import type { ChangeType, ReleaseChange } from "@/hooks/use-release-notes";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Change type options ──────────────────────────────────────────────────────

const CHANGE_TYPES: { value: ChangeType; label: string; color: string }[] = [
  { value: "new",     label: "Nouveau",      color: "#1D4ED8" },
  { value: "improve", label: "Amélioration", color: "#C2410C" },
  { value: "fix",     label: "Correction",   color: "#B91C1C" },
  { value: "remove",  label: "Retiré",       color: "#4B5563" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReleaseNoteEditScreen() {
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isNew = !id;

  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [changes, setChanges] = useState<ReleaseChange[]>([
    { type: "new", text: "" },
  ]);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Load existing note
  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "releaseNotes", id))
      .then((snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setVersion(data.version ?? "");
        setTitle(data.title ?? "");
        setSummary(data.summary ?? "");
        setChanges(data.changes?.length ? data.changes : [{ type: "new", text: "" }]);
        setIsPublished(data.isPublished ?? false);
      })
      .catch(() => showToast("Erreur de chargement", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Change list helpers ───────────────────────────────────────────────────

  const addChange = useCallback(() => {
    setChanges((prev) => [...prev, { type: "new", text: "" }]);
  }, []);

  const removeChange = useCallback((index: number) => {
    setChanges((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateChangeType = useCallback((index: number, type: ChangeType) => {
    setChanges((prev) =>
      prev.map((c, i) => (i === index ? { ...c, type } : c)),
    );
  }, []);

  const updateChangeText = useCallback((index: number, text: string) => {
    setChanges((prev) =>
      prev.map((c, i) => (i === index ? { ...c, text } : c)),
    );
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────

  const isValid = useCallback(() => {
    if (!version.trim() || !title.trim()) return false;
    if (changes.some((c) => !c.text.trim())) return false;
    return true;
  }, [version, title, changes]);

  // ── Save draft ────────────────────────────────────────────────────────────

  const handleSaveDraft = useCallback(async () => {
    if (!isValid()) {
      showToast("Remplissez la version, le titre et tous les changements", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        version: version.trim(),
        title: title.trim(),
        summary: summary.trim(),
        changes: changes.filter((c) => c.text.trim()),
        isPublished: false,
        updatedAt: serverTimestamp(),
      };
      if (isNew) {
        await addDoc(collection(db, "releaseNotes"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "releaseNotes", id!), payload);
      }
      showToast("Brouillon enregistré", "success");
      router.back();
    } catch {
      showToast("Erreur lors de l'enregistrement", "error");
    } finally {
      setSaving(false);
    }
  }, [isNew, id, version, title, summary, changes, isValid]);

  // ── Publish ───────────────────────────────────────────────────────────────

  const handlePublish = useCallback(async () => {
    if (!isValid()) {
      showToast("Remplissez la version, le titre et tous les changements", "error");
      return;
    }
    Alert.alert(
      "Publier la mise à jour ?",
      `Tous les membres recevront une notification pour la v${version}.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Publier",
          style: "default",
          onPress: async () => {
            setPublishing(true);
            try {
              const cleanChanges = changes.filter((c) => c.text.trim());
              const payload = {
                version: version.trim(),
                title: title.trim(),
                summary: summary.trim(),
                changes: cleanChanges,
                isPublished: true,
                publishedAt: Timestamp.now(),
                updatedAt: serverTimestamp(),
              };
              if (isNew) {
                await addDoc(collection(db, "releaseNotes"), {
                  ...payload,
                  createdAt: serverTimestamp(),
                });
              } else {
                await updateDoc(doc(db, "releaseNotes", id!), payload);
              }
              setIsPublished(true);
              await sendNotificationToAll(version.trim(), title.trim(), summary.trim());
              showToast("Publié et notifications envoyées", "success");
              router.back();
            } catch {
              showToast("Erreur lors de la publication", "error");
            } finally {
              setPublishing(false);
            }
          },
        },
      ],
    );
  }, [isNew, id, version, title, summary, changes, isValid]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.surfaceDim }]}
        edges={["bottom"]}
      >
        <Stack.Screen options={{ title: isNew ? "Nouvelle version" : "Modifier" }} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surfaceDim }]}
      edges={["bottom"]}
    >
      <Stack.Screen options={{ title: isNew ? "Nouvelle version" : "Modifier" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Info section ── */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            INFORMATIONS
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Version *
              </Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderLight }]}
                value={version}
                onChangeText={setVersion}
                placeholder="ex: 1.2.0"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
              />
            </View>
            <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Titre *
              </Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderLight }]}
                value={title}
                onChangeText={setTitle}
                placeholder="ex: Mise à jour 1.2.0"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Résumé
              </Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderLight }]}
                value={summary}
                onChangeText={setSummary}
                placeholder="Tagline optionnel"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {/* ── Changes section ── */}
          <View style={styles.changesTitleRow}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              CHANGEMENTS
            </Text>
            <TouchableOpacity onPress={addChange} style={styles.addBtn} activeOpacity={0.7}>
              <Ionicons name="add-circle" size={22} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {changes.map((change, index) => (
            <View
              key={index}
              style={[styles.changeCard, { backgroundColor: colors.surface }]}
            >
              {/* Type picker */}
              <View style={styles.typePicker}>
                {CHANGE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeChip,
                      change.type === t.value && {
                        backgroundColor: t.color,
                        borderColor: t.color,
                      },
                      change.type !== t.value && {
                        borderColor: colors.borderLight,
                        backgroundColor: colors.surfaceDim,
                      },
                    ]}
                    onPress={() => updateChangeType(index, t.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        {
                          color:
                            change.type === t.value ? "#FFF" : colors.textSecondary,
                        },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Text input + delete */}
              <View style={styles.changeInputRow}>
                <TextInput
                  style={[
                    styles.changeInput,
                    {
                      color: colors.textPrimary,
                      borderColor: colors.borderLight,
                      backgroundColor: colors.surfaceDim,
                    },
                  ]}
                  value={change.text}
                  onChangeText={(t) => updateChangeText(index, t)}
                  placeholder="Décrivez le changement…"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                />
                {changes.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeChange(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.accent6 ?? "#EF4444"} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {/* ── Actions ── */}
          <View style={styles.actions}>
            {!isPublished && (
              <TouchableOpacity
                style={[styles.draftBtn, { borderColor: colors.primary }]}
                onPress={handleSaveDraft}
                disabled={saving || publishing}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.draftBtnText, { color: colors.primary }]}>
                    Enregistrer le brouillon
                  </Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.publishBtn,
                { backgroundColor: isPublished ? colors.textTertiary : colors.primary },
              ]}
              onPress={handlePublish}
              disabled={saving || publishing || isPublished}
              activeOpacity={0.85}
            >
              {publishing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons
                    name={isPublished ? "checkmark-circle" : "send"}
                    size={16}
                    color="#FFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.publishBtnText}>
                    {isPublished ? "Déjà publié" : "Publier et notifier"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Push all members ────────────────────────────────────────────────────────

async function sendNotificationToAll(
  version: string,
  title: string,
  summary: string,
) {
  const snap = await getDocs(
    query(collection(db, "users"), where("status", "!=", "Arrêt")),
  );
  const tokens: string[] = [];
  for (const d of snap.docs) {
    const token = d.data().expoPushToken as string | undefined;
    if (token) tokens.push(token);
  }
  await Promise.allSettled(
    tokens.map((token) =>
      sendExpoPush(
        token,
        `Nouveautés · v${version} 🎉`,
        summary || title,
        { type: "release", version },
        "release-notes",
      ),
    ),
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function getStyles(colors: any, tokens: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, gap: 8, paddingBottom: 40 },
    sectionLabel: {
      fontSize: tokens.font.xs ?? 10,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 6,
      marginLeft: 4,
    },
    card: { borderRadius: 14, overflow: "hidden" },
    field: { padding: 14 },
    fieldLabel: {
      fontSize: tokens.font.xs ?? 10,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    input: {
      fontSize: tokens.font.md ?? 15,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    separator: { height: StyleSheet.hairlineWidth },
    changesTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      marginBottom: 6,
      paddingHorizontal: 4,
    },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    addBtnText: { fontSize: tokens.font.sm ?? 13, fontWeight: "600" },
    changeCard: { borderRadius: 14, padding: 12, gap: 10 },
    typePicker: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    typeChip: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    typeChipText: { fontSize: tokens.font.xs ?? 10, fontWeight: "700" },
    changeInputRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    changeInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: tokens.font.sm ?? 13,
      minHeight: 44,
    },
    actions: { gap: 10, marginTop: 12 },
    draftBtn: {
      height: 50,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    draftBtnText: { fontSize: tokens.font.base ?? 14, fontWeight: "600" },
    publishBtn: {
      height: 52,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    publishBtnText: {
      color: "#FFF",
      fontSize: tokens.font.base ?? 14,
      fontWeight: "700",
    },
  });
}
