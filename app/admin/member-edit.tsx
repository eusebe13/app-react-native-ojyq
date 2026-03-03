/**
 * Admin — Member edit
 *
 * Lets a Président / Administrateur / Vice-Président change the role
 * and status of any member. Writes directly to the `users/{uid}` Firestore
 * document (server-side rules must enforce access).
 *
 * Receives params: uid, firstName, lastName, role, status, avatarPreset
 */

import { router, Stack, useLocalSearchParams } from "expo-router";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/Icon";
import { PRESET_AVATARS } from "@/constants/avatarPresets";
import { useAppTheme } from "@/contexts/ThemeContext";
import { db } from "@/firebaseConfig";
import { UserRole, UserStatus } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES: UserRole[] = [
  "Membre",
  "Vice-Président",
  "Président",
  "Secrétaire",
  "Trésorier",
  "Administrateur",
];

const ALL_STATUSES: { key: UserStatus; color: string; bg: string }[] = [
  { key: "Actif", color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  { key: "Pause", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  { key: "Visite", color: "#06B6D4", bg: "rgba(6,182,212,0.12)" },
  { key: "Arrêt", color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MemberEditScreen() {
  const { colors, tokens } = useAppTheme();

  const params = useLocalSearchParams<{
    uid: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    avatarPreset?: string;
  }>();

  const uid = params.uid ?? "";
  const firstName = params.firstName ?? "";
  const lastName = params.lastName ?? "";

  const initialRole = (params.role ?? "Membre") as UserRole;
  const initialStatus = (params.status ?? "Actif") as UserStatus;

  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [selectedStatus, setSelectedStatus] =
    useState<UserStatus>(initialStatus);
  const [saving, setSaving] = useState(false);

  const displayName = `${firstName} ${lastName}`.trim() || "Membre sans nom";

  const hasChanges =
    selectedRole !== initialRole || selectedStatus !== initialStatus;
  const preset =
    params.avatarPreset !== undefined
      ? PRESET_AVATARS[parseInt(params.avatarPreset)]
      : null;
  const initials =
    firstName && lastName
      ? `${firstName[0]}${lastName[0]}`
      : firstName
        ? firstName[0]
        : lastName
          ? lastName[0]
          : "?";
  const handleSave = async () => {
    if (!hasChanges) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", uid),
        {
          role: selectedRole,
          status: selectedStatus,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      Alert.alert("Succès", `${displayName} mis à jour avec succès`);
      router.back();
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour ce membre");
    } finally {
      setSaving(false);
    }
  };

  const styles = getStyles(colors, tokens);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Dynamic header title */}
      <Stack.Screen options={{ title: displayName }} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Identity card (read-only) ──────────────────────────── */}
        <View style={styles.identityCard}>
          <View
            style={[styles.avatar, { backgroundColor: colors.primaryTint }]}
          >
            {preset ? (
              <Icon name={preset.icon} size={38} color="#FFFFFF" />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.uidLabel}>ID : {uid.slice(0, 12)}…</Text>
          </View>
        </View>

        {/* ── Role selector ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rôle</Text>
          <View style={styles.roleGrid}>
            {ALL_ROLES.map((role) => {
              const active = selectedRole === role;
              return (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleChip,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceDim,
                    },
                    active && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedRole(role)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      { color: colors.textSecondary },
                      active && { color: "#FFFFFF" },
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Status selector ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statut</Text>
          <View style={styles.statusRow}>
            {ALL_STATUSES.map(({ key, color, bg }) => {
              const active = selectedStatus === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.statusChip,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceDim,
                    },
                    active && { backgroundColor: bg, borderColor: color },
                  ]}
                  onPress={() => setSelectedStatus(key)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: active ? color : colors.border },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: active ? color : colors.textSecondary },
                      active && { fontWeight: "700" },
                    ]}
                  >
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Save button ────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: hasChanges ? colors.primary : colors.border },
            saving && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.75}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {hasChanges
                ? "Enregistrer les modifications"
                : "Aucune modification"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.surfaceDim,
    },
    content: {
      padding: tokens.space.lg,
      paddingBottom: tokens.space.xxxl,
    },

    // ── Identity ────────────────────────────────────────────────────────
    identityCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.md,
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      marginBottom: tokens.space.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: tokens.font.lg,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    displayName: {
      fontSize: tokens.font.lg,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 2,
    },
    uidLabel: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
      fontWeight: "500",
    },

    // ── Section card ────────────────────────────────────────────────────
    section: {
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      marginBottom: tokens.space.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: tokens.space.md,
    },

    // ── Role grid ───────────────────────────────────────────────────────
    roleGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.space.sm,
    },
    roleChip: {
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.sm,
      borderRadius: tokens.radius.md,
      borderWidth: 1.5,
    },
    roleChipText: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
      letterSpacing: 0.3,
    },

    // ── Status row ──────────────────────────────────────────────────────
    statusRow: {
      flexDirection: "row",
      gap: tokens.space.sm,
    },
    statusChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: tokens.space.sm,
      borderRadius: tokens.radius.md,
      borderWidth: 1.5,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    statusChipText: {
      fontSize: tokens.font.xs,
      fontWeight: "600",
    },

    // ── Save button ─────────────────────────────────────────────────────
    saveButton: {
      paddingVertical: tokens.space.md,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    saveButtonText: {
      color: "#FFFFFF",
      fontSize: tokens.font.base,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
  });
