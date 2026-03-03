/**
 * Card — Base card component with variants
 *
 * Variants:
 *  - default:  Standard white card with border
 *  - elevated: Enhanced shadow for emphasis
 *  - tinted:   Auto-generates 10% bg + 20% border from tintColor
 *
 * Usage:
 *   <Card>...</Card>
 *   <Card variant="elevated">...</Card>
 *   <Card variant="tinted" tintColor={colors.primary}>...</Card>
 *   <Card onPress={() => navigate('...')}>...</Card>
 */

import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "tinted";
  tintColor?: string;
  style?: object;
  onPress?: () => void;
}

export const Card = ({
  children,
  variant = "default",
  tintColor,
  style,
  onPress,
}: CardProps) => {
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);

  const cardStyle = [
    styles.base,
    variant === "elevated" && styles.elevated,
    variant === "tinted" &&
      tintColor && {
        backgroundColor: tintColor + "0A",
        borderColor: tintColor + "20",
      },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.88}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    base: {
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    elevated: {
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.xl,
      borderWidth: 1,
      borderColor: colors.borderLight,
      shadowColor: "#070974ff",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
  });
