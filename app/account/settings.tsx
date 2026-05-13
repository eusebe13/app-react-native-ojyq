import Constants from "expo-constants";
import React, { useMemo } from "react";
import { showToast } from "@/components/Toast";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useProfile } from "@/hooks/use-profile";
import useAuth from "@/hooks/use-auth";
import { useReleaseNotes, type ChangeType } from "@/hooks/use-release-notes";

// ─── Change type metadata ─────────────────────────────────────────────────────

const CHANGE_META: Record<ChangeType, { label: string; color: string }> = {
  new:     { label: "Nouveau",      color: "#1D4ED8" },
  improve: { label: "Amélioration", color: "#C2410C" },
  fix:     { label: "Correction",   color: "#B91C1C" },
  remove:  { label: "Retiré",       color: "#4B5563" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppSettings() {
  const { saving, saveProfile } = useProfile();
  const { isDark, setDark, colors, tokens } = useAppTheme();
  const { user } = useAuth();
  const { latestNote, loading: releaseLoading } = useReleaseNotes(user?.uid);

  const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);

  const handleDarkModeToggle = async (value: boolean) => {
    try {
      await setDark(value);
      await saveProfile({ darkMode: value });
    } catch {
      showToast("Impossible de mettre à jour le mode sombre", "error");
      await setDark(!value);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surfaceDim }]}
      edges={["left", "right", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Apparence ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apparence</Text>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Mode sombre</Text>
              <Text style={styles.settingDescription}>
                Adaptez l&apos;interface à votre préférence
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleDarkModeToggle}
              disabled={saving}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? "#FFFFFF" : colors.surfaceDim}
            />
          </View>
        </View>

        {/* ── À Propos ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À Propos</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>
              {Constants.expoConfig?.version ?? "1.0.0"}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>
              {Constants.expoConfig?.ios?.buildNumber ??
                String(Constants.expoConfig?.android?.versionCode ?? "—")}
            </Text>
          </View>
        </View>

        {/* ── Nouveautés ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nouveautés</Text>

          {releaseLoading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginVertical: 24 }}
            />
          ) : !latestNote ? (
            <View style={styles.emptyNote}>
              <Text style={[styles.emptyNoteText, { color: colors.textTertiary }]}>
                Aucune mise à jour publiée
              </Text>
            </View>
          ) : (
            <View style={styles.noteContainer}>
              {/* Header row */}
              <View style={styles.noteHeaderRow}>
                <View style={[styles.versionBadge, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.versionText, { color: colors.primary }]}>
                    v{latestNote.version}
                  </Text>
                </View>
                <Text style={[styles.noteDate, { color: colors.textTertiary }]}>
                  {latestNote.publishedAt.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>

              <Text style={[styles.noteTitle, { color: colors.textPrimary }]}>
                {latestNote.title}
              </Text>

              {!!latestNote.summary && (
                <Text style={[styles.noteSummary, { color: colors.textSecondary }]}>
                  {latestNote.summary}
                </Text>
              )}

              {/* Changes list */}
              <View style={styles.changesList}>
                {latestNote.changes.map((change, i) => {
                  const meta = CHANGE_META[change.type] ?? CHANGE_META.new;
                  return (
                    <View key={i} style={styles.changeRow}>
                      <View
                        style={[
                          styles.changeTypeBadge,
                          { backgroundColor: meta.color },
                        ]}
                      >
                        <Text style={styles.changeTypeText}>{meta.label}</Text>
                      </View>
                      <Text
                        style={[styles.changeText, { color: colors.textPrimary }]}
                      >
                        {change.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* ── Info ── */}
        <View style={[styles.section, { backgroundColor: colors.surfaceDim }]}>
          <Text style={styles.storageTitle}>Info</Text>
          <Text style={styles.storageText}>
            Vos préférences sont sauvegardées automatiquement dans le cloud.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function getStyles(colors: any, tokens: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
      padding: tokens.space.lg,
      paddingBottom: tokens.space.xxxl,
    },
    section: {
      marginBottom: tokens.space.xl,
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: tokens.font.xs,
      fontWeight: "700",
      color: colors.textSecondary,
      paddingHorizontal: tokens.space.xl,
      paddingTop: tokens.space.lg,
      paddingBottom: tokens.space.md,
      backgroundColor: colors.surface,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: tokens.space.xl,
      paddingVertical: tokens.space.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    settingInfo: {
      flex: 1,
      marginRight: tokens.space.md,
    },
    settingLabel: {
      fontSize: tokens.font.base,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: tokens.space.xs,
      letterSpacing: 0.2,
    },
    settingDescription: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    infoBox: {
      paddingHorizontal: tokens.space.xl,
      paddingVertical: tokens.space.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    infoLabel: {
      fontSize: tokens.font.base,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: tokens.font.base,
      fontWeight: "600",
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    emptyNote: {
      paddingVertical: 20,
      paddingHorizontal: tokens.space.xl,
      alignItems: "center",
    },
    emptyNoteText: {
      fontSize: tokens.font.sm,
    },
    noteContainer: {
      padding: tokens.space.xl,
      gap: 10,
    },
    noteHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    versionBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    versionText: {
      fontSize: tokens.font.xs,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    noteDate: {
      fontSize: tokens.font.xs,
    },
    noteTitle: {
      fontSize: tokens.font.md,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    noteSummary: {
      fontSize: tokens.font.sm,
      lineHeight: 19,
    },
    changesList: {
      gap: 8,
      marginTop: 4,
    },
    changeRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    changeTypeBadge: {
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
      marginTop: 1,
    },
    changeTypeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#FFF",
      letterSpacing: 0.3,
    },
    changeText: {
      flex: 1,
      fontSize: tokens.font.sm,
      lineHeight: 19,
    },
    storageTitle: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.sm,
      paddingHorizontal: tokens.space.xl,
      paddingTop: tokens.space.lg,
      letterSpacing: 0.3,
    },
    storageText: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      paddingHorizontal: tokens.space.xl,
      paddingBottom: tokens.space.lg,
      lineHeight: 19,
    },
  });
}
