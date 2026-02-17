/**
 * Icon — Universal icon component
 *
 * Wraps react-native-vector-icons for consistent usage across the app.
 * Swap the underlying library here if you move to Expo or Lucide.
 *
 * Installation:
 *   npm install react-native-vector-icons
 *
 * Usage:
 *   <Icon name="calendar-check-outline" size={22} color={T.colors.primary} />
 */

import React from "react";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { T } from "../../theme/tokens";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: object;
}

export const Icon = ({
  name,
  size = 20,
  color = T.colors.textSecondary,
  style,
}: IconProps) => (
  <MaterialCommunityIcons name={name} size={size} color={color} style={style} />
);
