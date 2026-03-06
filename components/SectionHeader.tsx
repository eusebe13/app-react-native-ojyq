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
import { useAppTheme } from "../contexts/ThemeContext";
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
}: SectionHeaderProps) => {
  const { colors, tokens } = useAppTheme();
  const styles = getStyles(colors, tokens);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Icon name={icon} size={18} color={colors.primary} />
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
          <Icon name="chevron-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: tokens.space.md,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.sm,
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: tokens.font.lg,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    viewAll: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    viewAllText: {
      fontSize: tokens.font.sm,
      color: colors.primary,
      fontWeight: "600",
    },
  });
