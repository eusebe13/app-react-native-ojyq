/**
 * Badge — Unread counts and status dots
 *
 * Usage:
 *   <Badge count={5} />                    // numeric badge
 *   <Badge dot color="#22C55E" />          // status dot
 *   <Badge count={3} size="sm" />          // small variant
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { T } from "../theme/tokens";

interface BadgeProps {
  count?: number;
  dot?: boolean;
  color?: string;
  size?: "sm" | "md";
}

export const Badge = ({
  count,
  dot,
  color = T.colors.primary,
  size = "md",
}: BadgeProps) => {
  if (dot) {
    const dotSize = size === "sm" ? 7 : 9;
    return (
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color,
          },
        ]}
      />
    );
  }

  const label = count !== undefined ? (count > 99 ? "99+" : String(count)) : "";
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.pill,
        isSmall && styles.pill_sm,
        { backgroundColor: color },
      ]}
    >
      <Text style={[styles.text, isSmall && styles.text_sm]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  pill: {
    backgroundColor: T.colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  pill_sm: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  text: {
    fontSize: T.font.xs,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  text_sm: {
    fontSize: 9,
  },
});
