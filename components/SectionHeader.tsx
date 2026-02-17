/**
 * SectionHeader — Consistent section titles with icon + "Voir tout"
 *
 * Usage:
 *   <SectionHeader icon="calendar-check-outline" title="Horaire" />
 *   <SectionHeader
 *     icon="chat-outline"
 *     title="Messagerie"
 *     onViewAll={() => navigate('AllChats')}
 *   />
 */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { T } from "../theme/tokens";
import { Icon } from "./ui/Icon";

interface SectionHeaderProps {
  icon: string;
  title: string;
  onViewAll?: () => void;
}

export const SectionHeader = ({
  icon,
  title,
  onViewAll,
}: SectionHeaderProps) => (
  <View style={styles.container}>
    <View style={styles.left}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={18} color={T.colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
    {onViewAll && (
      <TouchableOpacity
        onPress={onViewAll}
        activeOpacity={0.6}
        style={styles.viewAll}
      >
        <Text style={styles.viewAllText}>Voir tout</Text>
        <Icon name="chevron-right" size={16} color={T.colors.primary} />
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.space.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: T.radius.sm,
    backgroundColor: T.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: T.font.lg,
    fontWeight: "700",
    color: T.colors.textPrimary,
  },
  viewAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewAllText: {
    fontSize: T.font.sm,
    color: T.colors.primary,
    fontWeight: "600",
  },
});
