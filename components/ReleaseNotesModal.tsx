import { useAppTheme } from "@/contexts/ThemeContext";
import type { ChangeType, ReleaseNote } from "@/hooks/use-release-notes";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Change type config ───────────────────────────────────────────────────────

const CHANGE_CONFIG: Record<
  ChangeType,
  { icon: string; label: string; bg: string; color: string }
> = {
  new:     { icon: "sparkles",       label: "Nouveau",       bg: "#1D4ED8", color: "#EFF6FF" },
  fix:     { icon: "bug",            label: "Correction",    bg: "#B91C1C", color: "#FEF2F2" },
  improve: { icon: "flash",          label: "Amélioration",  bg: "#C2410C", color: "#FFF7ED" },
  remove:  { icon: "remove-circle",  label: "Retiré",        bg: "#4B5563", color: "#F9FAFB" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReleaseNotesModalProps {
  note: ReleaseNote;
  onDismiss: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReleaseNotesModal({
  note,
  onDismiss,
}: ReleaseNotesModalProps) {
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v{note.version}</Text>
            </View>
            <Text style={styles.title}>{note.title}</Text>
            {note.summary ? (
              <Text style={styles.summary}>{note.summary}</Text>
            ) : null}
          </View>

          {/* Changes */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {note.changes.map((change, i) => {
              const cfg = CHANGE_CONFIG[change.type] ?? CHANGE_CONFIG.new;
              return (
                <View key={i} style={styles.changeRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: cfg.bg },
                    ]}
                  >
                    <Ionicons
                      name={cfg.icon as any}
                      size={11}
                      color={cfg.color}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={[styles.typeLabel, { color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                  </View>
                  <Text style={styles.changeText}>{change.text}</Text>
                </View>
              );
            })}
          </ScrollView>

          {/* CTA */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={onDismiss}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>C'est parti !</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function getStyles(colors: any, tokens: any) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingBottom: Platform.OS === "ios" ? 36 : 24,
      maxHeight: "88%",
      ...(Platform.OS === "web" && {
        maxWidth: 520,
        width: "100%",
        alignSelf: "center",
        borderRadius: 20,
        marginBottom: 40,
      }),
    },
    handleRow: {
      alignItems: "center",
      paddingTop: 12,
      paddingBottom: 4,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    header: {
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: colors.surfaceDim,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    versionBadge: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginBottom: 8,
    },
    versionText: {
      color: "#FFF",
      fontSize: tokens.font.xs ?? 10,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    title: {
      fontSize: tokens.font.xl ?? 20,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: 4,
    },
    summary: {
      fontSize: tokens.font.sm ?? 13,
      color: colors.textSecondary,
      textAlign: "center",
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 12,
    },
    changeRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    typeBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 3,
      minWidth: 96,
      flexShrink: 0,
    },
    typeLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    changeText: {
      flex: 1,
      fontSize: tokens.font.sm ?? 13,
      color: colors.textPrimary,
      lineHeight: 18,
      paddingTop: 2,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    ctaBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    ctaText: {
      color: "#FFF",
      fontSize: tokens.font.base ?? 15,
      fontWeight: "700",
    },
  });
}
