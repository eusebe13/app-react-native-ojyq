/**
 * WeeklyCoverageChart
 *
 * Displays a 7-bar vertical chart showing daily availability coverage
 * against an 8-hour target for the current week.
 *
 * Pattern: Composite — the chart is composed of DayBar sub-components,
 * each encapsulating its own rendering logic.
 */

import { useAppTheme } from "@/contexts/ThemeContext";
import {
  calculateWeeklyCoverage,
  DAILY_TARGET_HOURS,
  type AvailabilityRecord,
  type DailyCoverage,
} from "@/utils/availabilityUtils";
import React from "react";
import { Text, View } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_HEIGHT = 120;
const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeeklyCoverageChartProps {
  availabilities: AvailabilityRecord[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyCoverageChart({ availabilities }: WeeklyCoverageChartProps) {
  const { colors, tokens } = useAppTheme();
  const weeklyCoverage = calculateWeeklyCoverage(availabilities);

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        backgroundColor: colors.surfaceDim,
        borderRadius: tokens.radius.lg,
        padding: tokens.space.lg,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: tokens.space.lg,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: tokens.font.base,
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            Couverture hebdomadaire
          </Text>
          <Text
            style={{
              fontSize: tokens.font.sm,
              color: colors.textSecondary,
              marginTop: 2,
            }}
          >
            Objectif : {DAILY_TARGET_HOURS}h / jour
          </Text>
        </View>

        {/* Legend */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <LegendDot color={colors.primary} label="En cours" tokens={tokens} colors={colors} />
          <LegendDot
            color={colors.accent5 ?? "#10B981"}
            label="Atteint"
            tokens={tokens}
            colors={colors}
          />
        </View>
      </View>

      {/* Bars */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height: CHART_HEIGHT + 40,
        }}
      >
        {weeklyCoverage.map((day, index) => (
          <DayBar
            key={day.dayName}
            day={day}
            label={DAY_LABELS[index]}
            colors={colors}
            tokens={tokens}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface DayBarProps {
  day: DailyCoverage;
  label: string;
  colors: any;
  tokens: any;
}

function DayBar({ day, label, colors, tokens }: DayBarProps) {
  const filledHeight = Math.max(
    (day.progressPercent / 100) * CHART_HEIGHT,
    day.coveredHours > 0 ? 4 : 0, // minimum visible height when there is coverage
  );
  const isComplete = day.coveredHours >= DAILY_TARGET_HOURS;
  const barColor = isComplete ? (colors.accent5 ?? "#10B981") : colors.primary;
  const hoursLabel =
    day.coveredHours > 0 ? `${day.coveredHours.toFixed(1)}h` : "";

  return (
    <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 3 }}>
      {/* Value label above bar */}
      <Text
        style={{
          fontSize: tokens.font.xs,
          color: isComplete ? (colors.accent5 ?? "#10B981") : colors.textSecondary,
          marginBottom: 4,
          fontWeight: "600",
          minHeight: 14,
        }}
      >
        {hoursLabel}
      </Text>

      {/* Track */}
      <View
        style={{
          height: CHART_HEIGHT,
          width: "100%",
          backgroundColor: colors.border,
          borderRadius: tokens.radius.sm,
          justifyContent: "flex-end",
          overflow: "hidden",
        }}
      >
        {/* Fill */}
        <View
          style={{
            height: filledHeight,
            backgroundColor: barColor,
            borderRadius: tokens.radius.sm,
            opacity: 0.9,
          }}
        />
      </View>

      {/* Day label */}
      <Text
        style={{
          fontSize: tokens.font.xs,
          color: colors.textSecondary,
          marginTop: 6,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

interface LegendDotProps {
  color: string;
  label: string;
  colors: any;
  tokens: any;
}

function LegendDot({ color, label, colors, tokens }: LegendDotProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
      <Text style={{ fontSize: tokens.font.xs, color: colors.textTertiary }}>
        {label}
      </Text>
    </View>
  );
}
