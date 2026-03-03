/**
 * Icon — Universal icon component
 *
 * Wraps react-native-vector-icons for consistent usage across the app.
 * Swap the underlying library here if you move to Expo or Lucide.
 *
 * Usage:
 *   <Icon name="calendar-check-outline" size={22} />
 *   <Icon name="calendar-check-outline" size={22} color={colors.primary} />
 */

import React from "react";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAppTheme } from "../../contexts/ThemeContext";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: object;
}

export const Icon = ({ name, size = 20, color, style }: IconProps) => {
  const { colors } = useAppTheme();
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color ?? colors.textSecondary}
      style={style}
    />
  );
};
