/**
 * Profile — Navigation hub
 *
 * Design:
 *  • Immersive header with avatar, name, email, role + status badges
 *  • Status quick-change row (saves immediately to Firestore)
 *  • iOS-Settings-style navigation cards, fully theme-aware (light & dark)
 *  • Administration section visible only to admins / VP / Président
 *  • Preset avatar picker (no storage required)
 *  • Logout at bottom
 */

import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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
import { auth } from "@/firebaseConfig";
import { logOut } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { UserRole, UserStatus } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  UserStatus,
  { color: string; bg: string; icon: string; label: string }
> = {
  Actif: {
    color: "#10B981",
    bg: "rgba(16,185,129,0.15)",
    icon: "check-circle",
    label: "Actif",
  },
  Pause: {
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.15)",
    icon: "pause-circle",
    label: "Pause",
  },
  Visite: {
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.15)",
    icon: "eye-circle",
    label: "Visite",
  },
  Arrêt: {
    color: "#EF4444",
    bg: "rgba(239,68,68,0.15)",
    icon: "close-circle",
    label: "Arrêt",
  },
};

const ROLE_BADGE: Record<UserRole, { bg: string; text: string }> = {
  Membre: { bg: "rgba(255,255,255,0.18)", text: "#FFFFFF" },
  "Vice-Président": { bg: "rgba(245,158,11,0.25)", text: "#FCD34D" },
  Président: { bg: "rgba(245,158,11,0.25)", text: "#FCD34D" },
  Secrétaire: { bg: "rgba(167,139,250,0.25)", text: "#DDD6FE" },
  Trésorier: { bg: "rgba(16,185,129,0.25)", text: "#6EE7B7" },
  Administrateur: { bg: "rgba(239,68,68,0.25)", text: "#FCA5A5" },
};

const MANAGE_ROLES: UserRole[] = [
  "Président",
  "Administrateur",
  "Vice-Président",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const { colors, tokens } = useAppTheme();
  return (
    <View
      style={{ marginHorizontal: tokens.space.lg, marginTop: tokens.space.lg }}
    >
      {title && (
        <Text
          style={{
            fontSize: tokens.font.xs,
            fontWeight: "700",
            color: colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: tokens.space.sm,
            paddingHorizontal: tokens.space.xs,
          }}
        >
          {title}
        </Text>
      )}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: tokens.radius.lg,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function NavRow({
  icon,
  iconBg,
  label,
  sublabel,
  onPress,
  last,
  rightElement,
  danger,
}: {
  icon: string;
  iconBg: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  last?: boolean;
  rightElement?: React.ReactNode;
  danger?: boolean;
}) {
  const { colors, tokens } = useAppTheme();
  return (
    <>
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.space.md,
          paddingHorizontal: tokens.space.lg,
          paddingVertical: tokens.space.md,
          minHeight: 58,
          backgroundColor: colors.surface,
        }}
        onPress={onPress}
        activeOpacity={0.55}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: tokens.radius.sm,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: iconBg,
          }}
        >
          <Icon name={icon} size={18} color={danger ? "#EF4444" : "#FFFFFF"} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: tokens.font.base,
              fontWeight: "600",
              color: danger ? "#EF4444" : colors.textPrimary,
            }}
          >
            {label}
          </Text>
          {sublabel && (
            <Text
              style={{
                fontSize: tokens.font.xs,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              {sublabel}
            </Text>
          )}
        </View>

        {rightElement ?? (
          <Icon name="chevron-right" size={20} color={colors.textTertiary} />
        )}
      </TouchableOpacity>

      {!last && (
        <View
          style={{
            height: 1,
            backgroundColor: colors.borderLight,
            marginLeft: 36 + tokens.space.md + tokens.space.lg,
          }}
        />
      )}
    </>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { profile, loading, saveProfile } = useProfile();
  const { colors, tokens } = useAppTheme();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const handleSelectPreset = async (index: number) => {
    setShowAvatarPicker(false);
    await saveProfile({ avatarPreset: index });
  };

  const handleResetAvatar = () => {
    setShowAvatarPicker(false);
    saveProfile({ avatarPreset: null });
  };

  const fullName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    "Compléter le profil";

  const initials =
    [profile.firstName, profile.lastName]
      .filter(Boolean)
      .map((n) => n[0].toUpperCase())
      .join("") || "?";

  const email = auth.currentUser?.email ?? "";
  const role = profile.role;
  const status = profile.status;

  const statusCfg = STATUS_CONFIG[status];
  const roleCfg = ROLE_BADGE[role] ?? ROLE_BADGE["Membre"];
  const canManage = MANAGE_ROLES.includes(role);

  const preset =
    profile.avatarPreset !== undefined && profile.avatarPreset !== null
      ? PRESET_AVATARS[profile.avatarPreset]
      : null;

  const handleStatusChange = async (s: UserStatus) => {
    if (s === status) return;
    await saveProfile({ status: s });
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnecter", style: "destructive", onPress: logOut },
    ]);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceDim,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const styles = getStyles(colors, tokens);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════ HEADER ══════════════════ */}
        <View style={styles.header}>
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          {/* Avatar — tappable */}
          <TouchableOpacity
            style={styles.avatarRing}
            onPress={() => setShowAvatarPicker(true)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.avatarCircle,
                preset && { backgroundColor: preset.bg },
              ]}
            >
              {preset ? (
                <Icon name={preset.icon} size={38} color="#FFFFFF" />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            {/* Edit badge */}
            <View style={styles.editBadge}>
              <Icon name="pencil" size={11} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Name + Email */}
          <Text style={styles.headerName}>{fullName}</Text>
          <Text style={styles.headerEmail}>{email}</Text>

          {/* Role + Status badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: roleCfg.bg }]}>
              <Icon name="shield-account" size={12} color={roleCfg.text} />
              <Text style={[styles.roleBadgeText, { color: roleCfg.text }]}>
                {role}
              </Text>
            </View>

            <View style={styles.badgeSep} />

            <View style={styles.statusBadge}>
              <View
                style={[styles.statusDot, { backgroundColor: statusCfg.color }]}
              />
              <Text style={styles.statusBadgeText}>{statusCfg.label}</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════ STATUS QUICK-CHANGE ══════════════════ */}
        <View style={styles.statusCard}>
          <Text style={styles.statusCardLabel}>Disponibilité</Text>
          <View style={styles.statusRow}>
            {(
              Object.entries(STATUS_CONFIG) as [
                UserStatus,
                (typeof STATUS_CONFIG)[UserStatus],
              ][]
            ).map(([key, cfg]) => {
              const active = status === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.statusChip,
                    active && {
                      backgroundColor: cfg.bg,
                      borderColor: cfg.color,
                    },
                  ]}
                  onPress={() => handleStatusChange(key)}
                  activeOpacity={0.65}
                >
                  <View
                    style={[
                      styles.statusChipDot,
                      { backgroundColor: active ? cfg.color : colors.border },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusChipText,
                      active && { color: cfg.color, fontWeight: "700" },
                    ]}
                  >
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ══════════════════ MON COMPTE ══════════════════ */}
        <NavCard title="Mon compte">
          <NavRow
            icon="account-edit"
            iconBg={colors.primary}
            label="Informations personnelles"
            sublabel="Nom, date de naissance, langue…"
            onPress={() => router.push("/account/edit")}
          />
          <NavRow
            icon="lock"
            iconBg={colors.primaryDark}
            label="Sécurité"
            sublabel="Changer le mot de passe"
            onPress={() => router.push("/account/security")}
            last
          />
        </NavCard>

        {/* ══════════════════ PRÉFÉRENCES ══════════════════ */}
        <NavCard title="Préférences">
          <NavRow
            icon="cog"
            iconBg={colors.textSecondary}
            label="Paramètres de l'application"
            sublabel="Thème, notifications"
            onPress={() => router.push("/account/settings")}
          />
          <NavRow
            icon="credit-card"
            iconBg={colors.accent4}
            label="Paiement & Abonnement"
            sublabel="Mensuel · Don unique"
            onPress={() => router.push("/account/payment")}
            last
          />
        </NavCard>

        {/* ══════════════════ ADMINISTRATION (role-gated) ══════════════════ */}
        {canManage && (
          <NavCard title="Administration">
            <NavRow
              icon="account-group"
              iconBg={colors.accent1}
              label="Gérer les membres"
              sublabel="Rôles, statuts, accès"
              onPress={() => router.push("/admin/members")}
              last
            />
          </NavCard>
        )}

        {/* ══════════════════ DÉCONNEXION ══════════════════ */}
        <NavCard>
          <NavRow
            icon="logout"
            iconBg="rgba(239,68,68,0.12)"
            label="Se déconnecter"
            onPress={handleLogout}
            last
            danger
          />
        </NavCard>

        <View style={{ height: tokens.space.xxxl }} />
      </ScrollView>

      {/* ══════════════════ AVATAR PICKER MODAL ══════════════════ */}
      <Modal
        visible={showAvatarPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAvatarPicker(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.surface }]}
          >
            {/* Handle */}
            <View
              style={[styles.modalHandle, { backgroundColor: colors.border }]}
            />

            {/* Title row */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Choisir un avatar
              </Text>
              <TouchableOpacity onPress={() => setShowAvatarPicker(false)}>
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Preset grid */}
            <View style={styles.presetGrid}>
              {PRESET_AVATARS.map((p, i) => {
                const selected = profile.avatarPreset === i;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.presetBubble,
                      { backgroundColor: p.bg },
                      selected && styles.presetBubbleSelected,
                    ]}
                    onPress={() => handleSelectPreset(i)}
                    activeOpacity={0.75}
                  >
                    <Icon name={p.icon} size={30} color="#FFFFFF" />
                    {selected && (
                      <View style={styles.presetCheck}>
                        <Icon name="check" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reset to initials */}
            {profile.avatarPreset !== undefined &&
              profile.avatarPreset !== null && (
                <TouchableOpacity
                  style={[styles.resetButton, { borderColor: colors.border }]}
                  onPress={handleResetAvatar}
                >
                  <Icon
                    name="text-short"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.resetButtonText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Utiliser mes initiales
                  </Text>
                </TouchableOpacity>
              )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (
  colors: ReturnType<typeof import("@/theme/tokens").getThemeTokens>["colors"],
  tokens: ReturnType<typeof import("@/theme/tokens").getThemeTokens>,
) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surfaceDim },
    scroll: { flex: 1 },
    content: { paddingBottom: tokens.space.xxl },

    // ── Header ──────────────────────────────────────────────────────────
    header: {
      backgroundColor: colors.primary,
      alignItems: "center",
      paddingTop: tokens.space.xxl,
      paddingBottom: 48,
      overflow: "hidden",
    },
    decorCircle1: {
      position: "absolute",
      top: -50,
      right: -50,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    decorCircle2: {
      position: "absolute",
      bottom: -60,
      left: -40,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: "rgba(255,255,255,0.05)",
    },
    avatarRing: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 2.5,
      borderColor: "rgba(255,255,255,0.4)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: tokens.space.md,
    },
    avatarCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarText: {
      fontSize: tokens.font.xxl,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 1.5,
    },
    editBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.3)",
    },
    headerName: {
      fontSize: tokens.font.xl,
      fontWeight: "700",
      color: "#FFFFFF",
      marginBottom: tokens.space.xs,
    },
    headerEmail: {
      fontSize: tokens.font.sm,
      color: "rgba(255,255,255,0.65)",
      marginBottom: tokens.space.lg,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
    },
    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: tokens.space.md,
      paddingVertical: 5,
      borderRadius: tokens.radius.pill,
    },
    roleBadgeText: {
      fontSize: tokens.font.xs,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    badgeSep: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.3)",
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: tokens.space.md,
      paddingVertical: 5,
      borderRadius: tokens.radius.pill,
      backgroundColor: "rgba(255,255,255,0.12)",
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    statusBadgeText: {
      fontSize: tokens.font.xs,
      fontWeight: "600",
      color: "rgba(255,255,255,0.9)",
    },

    // ── Status quick-change card ─────────────────────────────────────────
    statusCard: {
      backgroundColor: colors.surface,
      marginHorizontal: tokens.space.lg,
      marginTop: -20,
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    },
    statusCardLabel: {
      fontSize: tokens.font.xs,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: tokens.space.md,
    },
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
      borderColor: colors.border,
      backgroundColor: colors.surfaceDim,
    },
    statusChipDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    statusChipText: {
      fontSize: tokens.font.xs,
      fontWeight: "600",
      color: colors.textSecondary,
    },

    // ── Avatar picker modal ──────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: tokens.space.lg,
      paddingBottom: tokens.space.xxxl,
      paddingTop: tokens.space.sm,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: tokens.space.md,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: tokens.space.lg,
    },
    modalTitle: {
      fontSize: tokens.font.lg,
      fontWeight: "700",
    },
    presetGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.space.md,
      justifyContent: "center",
      marginBottom: tokens.space.lg,
    },
    presetBubble: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    presetBubbleSelected: {
      borderWidth: 3,
      borderColor: "#FFFFFF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    presetCheck: {
      position: "absolute",
      top: 2,
      right: 2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
    resetButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.space.sm,
      paddingVertical: tokens.space.md,
      borderRadius: tokens.radius.md,
      borderWidth: 1.5,
    },
    resetButtonText: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
    },
  });
