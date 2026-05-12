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
import { Text, View } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import { Icon } from "./ui/Icon";
import { PRESET_AVATARS } from "@/constants/avatarPresets";

interface AvatarProps {
  name: string;
  size?: number;
  isGroup?: boolean;
  isOnline?: boolean;
  color?: string;
  avatarPreset?: number | null;
}

export const Avatar = ({
  name,
  size = 44,
  isGroup = false,
  isOnline = false,
  color,
  avatarPreset,
}: AvatarProps) => {
  const { colors } = useAppTheme();

  const accentColors = [
    colors.primary,
    colors.accent1,
    colors.accent2,
    colors.accent3,
    colors.accent4,
    colors.accent5,
  ];
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const preset =
    avatarPreset != null && avatarPreset >= 0 && avatarPreset < PRESET_AVATARS.length
      ? PRESET_AVATARS[avatarPreset]
      : null;

  const bg = color || (preset ? preset.bg : accentColors[hash % accentColors.length]);
  const lightBg = bg + "18";

  const radius = size / 2;
  const iconSize = size * 0.4;

  return (
    <View style={{ position: "relative" }}>
      <View
        style={{
          width: size + 4,
          height: size + 4,
          borderRadius: radius + 2,
          borderWidth: 2,
          borderColor: isGroup ? bg + "40" : colors.borderLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: isGroup ? lightBg : bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isGroup ? (
            <Icon name="account-group" size={iconSize + 2} color={bg} />
          ) : preset ? (
            <Icon name={preset.icon as any} size={iconSize + 2} color="#FFFFFF" />
          ) : (
            <Text
              style={{
                fontSize: size * 0.38,
                color: "#FFFFFF",
                fontWeight: "700",
              }}
            >
              {name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
      </View>

      {isOnline && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: colors.online,
            }}
          />
        </View>
      )}
    </View>
  );
};
