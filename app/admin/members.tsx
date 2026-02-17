/**
 * Admin — Members list
 *
 * Accessible only to Président / Administrateur / Vice-Président (guard is
 * enforced at the navigation level in profile.tsx; Firestore rules handle
 * server-side enforcement).
 *
 * Features:
 *  • Real-time search by name
 *  • Horizontal role-filter chips
 *  • Pull-to-refresh
 *  • Tap a row to edit role & status
 */

import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/Icon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { PRESET_AVATARS } from "@/constants/avatarPresets";
import { MemberEntry, useMembers } from "@/hooks/use-members";
import { UserRole, UserStatus } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

// rgba so badges work on both light (white) and dark (slate-900) cards
const ROLE_COLORS: Record<
  UserRole,
  { bg: string; text: string; border: string }
> = {
  Membre: {
    bg: "rgba(100,116,139,0.10)",
    text: "#64748B",
    border: "rgba(100,116,139,0.20)",
  },
  "Vice-Président": {
    bg: "rgba(245,158,11,0.12)",
    text: "#D97706",
    border: "rgba(245,158,11,0.28)",
  },
  Président: {
    bg: "rgba(245,158,11,0.12)",
    text: "#D97706",
    border: "rgba(245,158,11,0.28)",
  },
  Secrétaire: {
    bg: "rgba(109,40,217,0.10)",
    text: "#7C3AED",
    border: "rgba(109,40,217,0.22)",
  },
  Trésorier: {
    bg: "rgba(21,128,61,0.10)",
    text: "#15803D",
    border: "rgba(21,128,61,0.22)",
  },
  Administrateur: {
    bg: "rgba(185,28,28,0.10)",
    text: "#DC2626",
    border: "rgba(185,28,28,0.22)",
  },
};

const STATUS_COLOR: Record<UserStatus, string> = {
  Actif: "#10B981",
  Pause: "#F59E0B",
  Visite: "#06B6D4",
  Arrêt: "#EF4444",
};

const ROLE_FILTERS: Array<UserRole | "Tous"> = [
  "Tous",
  "Membre",
  "Vice-Président",
  "Président",
  "Secrétaire",
  "Trésorier",
  "Administrateur",
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MembersScreen() {
  const { colors, tokens } = useAppTheme();
  const { members, loading, refetch } = useMembers();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "Tous">("Tous");

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
      const matchSearch = fullName.includes(search.toLowerCase());
      const matchRole = roleFilter === "Tous" || m.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [members, search, roleFilter]);

  const getInitials = (m: MemberEntry) =>
    [m.firstName?.[0], m.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?";

  const getDisplayName = (m: MemberEntry) =>
    `${m.firstName} ${m.lastName}`.trim() || "Membre sans nom";

  const styles = getStyles(colors, tokens);

  // ── Member card ──────────────────────────────────────────────────────────
  const renderMember = ({ item }: { item: MemberEntry }) => {
    const roleCfg = ROLE_COLORS[item.role];
    return (
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() =>
          router.push({
            pathname: "/admin/member-edit",
            params: {
              uid: item.uid,
              firstName: item.firstName,
              lastName: item.lastName,
              role: item.role,
              status: item.status,
              avatarPreset: item.avatarPreset?.toString() ?? "",
            },
          })
        }
        activeOpacity={0.6}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: colors.primaryTint }]}>
          {item.avatarPreset !== undefined ? (
            <Icon
              name={PRESET_AVATARS[item.avatarPreset].icon}
              size={38}
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.avatarText}>{getInitials(item)}</Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>
            {getDisplayName(item)}
          </Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: roleCfg.bg, borderColor: roleCfg.border },
              ]}
            >
              <Text style={[styles.roleBadgeText, { color: roleCfg.text }]}>
                {item.role}
              </Text>
            </View>

            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: STATUS_COLOR[item.status] },
                ]}
              />
              <Text style={styles.statusLabel}>{item.status}</Text>
            </View>
          </View>
        </View>

        <Icon name="chevron-right" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  // ── Layout ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Icon name="magnify" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Rechercher un membre…"
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Role filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {ROLE_FILTERS.map((r) => {
          const active = roleFilter === r;
          return (
            <TouchableOpacity
              key={r}
              style={[
                styles.filterChip,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceDim,
                },
                active && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => setRoleFilter(r as typeof roleFilter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  active && { color: "#FFFFFF" },
                ]}
              >
                {r}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Count */}
      <Text style={styles.countLabel}>
        {filtered.length} membre{filtered.length !== 1 ? "s" : ""}
      </Text>

      {/* List */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.uid}
          renderItem={renderMember}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucun membre trouvé</Text>
            </View>
          }
        />
      )}
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

    // ── Search ──────────────────────────────────────────────────────────
    searchWrapper: {
      paddingHorizontal: tokens.space.lg,
      paddingTop: tokens.space.md,
      paddingBottom: tokens.space.sm,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
      borderWidth: 1.5,
      borderRadius: tokens.radius.md,
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: tokens.font.base,
      fontWeight: "500",
    },

    // ── Filters ──────────────────────────────────────────────────────────
    filterScroll: {
      flexGrow: 0,
      marginBottom: tokens.space.md,
    },
    filterRow: {
      paddingHorizontal: tokens.space.lg,
      gap: tokens.space.sm,
      flexDirection: "row",
      alignItems: "center",
    },
    filterChip: {
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.xs,
      borderRadius: tokens.radius.pill,
      borderWidth: 1.5,
    },
    filterChipText: {
      fontSize: tokens.font.xs,
      fontWeight: "700",
      letterSpacing: 0.3,
    },

    // ── Count label ──────────────────────────────────────────────────────
    countLabel: {
      fontSize: tokens.font.xs,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginHorizontal: tokens.space.lg,
      marginBottom: tokens.space.sm,
    },

    // ── Member list ──────────────────────────────────────────────────────
    list: {
      paddingHorizontal: tokens.space.lg,
      paddingBottom: tokens.space.xxxl,
    },
    separator: {
      height: tokens.space.sm,
    },
    memberCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.md,
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: tokens.font.base,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    memberInfo: { flex: 1 },
    memberName: {
      fontSize: tokens.font.base,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: tokens.space.xs,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
    },
    roleBadge: {
      paddingHorizontal: tokens.space.sm,
      paddingVertical: 2,
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
    },
    roleBadgeText: {
      fontSize: tokens.font.xs,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusLabel: {
      fontSize: tokens.font.xs,
      color: colors.textSecondary,
      fontWeight: "500",
    },

    // ── States ──────────────────────────────────────────────────────────
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    empty: {
      paddingTop: tokens.space.xxxl,
      alignItems: "center",
    },
    emptyText: {
      fontSize: tokens.font.base,
      color: colors.textSecondary,
    },
  });
