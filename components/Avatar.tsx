/**
 * Avatar — User/Group avatar with initial-based rendering
 *
 * Features:
 *  - Deterministic color from name (no random flicker)
 *  - Group vs individual variant
 *  - Online status dot
 *
 * Usage:
 *   <Avatar name="Marie Dubois" />
 *   <Avatar name="Équipe Organisation" isGroup />
 *   <Avatar name="Jean-Pierre" isOnline />
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { T } from "../theme/tokens";
import { Icon } from "./ui/Icon";

interface AvatarProps {
  name: string;
  size?: number;
  isGroup?: boolean;
  isOnline?: boolean;
  color?: string;
}

export const Avatar = ({
  name,
  size = 44,
  isGroup = false,
  isOnline = false,
  color,
}: AvatarProps) => {
  // Deterministic color from name hash (cycles through accent palette)
  const accentColors = [
    T.colors.primary,
    T.colors.accent1,
    T.colors.accent2,
    T.colors.accent3,
    T.colors.accent4,
    T.colors.accent5,
  ];
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const bg = color || accentColors[hash % accentColors.length];
  const lightBg = bg + "18"; // 10% opacity tint

  const radius = size / 2;
  const iconSize = size * 0.4;

  return (
    <View style={{ position: "relative" }}>
      {/* Ring */}
      <View
        style={[
          styles.ring,
          isGroup && { borderColor: bg + "40" },
          { width: size + 4, height: size + 4, borderRadius: radius + 2 },
        ]}
      >
        {/* Inner */}
        <View
          style={[
            styles.inner,
            {
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor: isGroup ? lightBg : bg,
            },
          ]}
        >
          {isGroup ? (
            <Icon name="account-group" size={iconSize + 2} color={bg} />
          ) : (
            <Text
              style={[
                styles.initial,
                { fontSize: size * 0.38, color: "#FFFFFF" },
              ]}
            >
              {name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
      </View>

      {/* Online dot */}
      {isOnline && (
        <View style={styles.onlineDot}>
          <View style={styles.onlineDotInner} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    borderColor: T.colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: T.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDotInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: T.colors.online,
  },
});
