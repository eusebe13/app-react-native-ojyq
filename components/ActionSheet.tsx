/**
 * ActionSheet — cross-platform bottom sheet menu
 *
 * Same visual language as MessageActionModal:
 *   • Colored icon squares (34×34)
 *   • Destructive group separator
 *   • Separate cancel card
 *   • Spring slide-up + fade animation
 *
 * Works on native AND web — no Alert.alert fallback.
 *
 * Usage: mount <ActionSheet /> once in _layout, then call showActionSheet() anywhere.
 *
 *   showActionSheet({
 *     title: "Options",
 *     actions: [
 *       { label: "Modifier", icon: "pencil-outline", onPress: () => {} },
 *       { label: "Supprimer", icon: "trash-outline", style: "destructive", onPress: () => {} },
 *       { label: "Annuler", style: "cancel", onPress: () => {} },
 *     ],
 *   });
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SheetAction = {
  label: string;
  onPress: () => void;
  style?: "default" | "destructive" | "cancel";
  icon?: string; // Ionicons name
  iconBg?: string; // override icon background
};

export type SheetConfig = {
  title: string;
  message?: string;
  actions: SheetAction[];
};

// ─── Icon color map ───────────────────────────────────────────────────────────

const DESTRUCTIVE_COLOR = "#EF4444";

const ICON_BG_MAP: Record<string, string> = {
  "pencil-outline":   "#F59E0B",
  "pencil":           "#F59E0B",
  "create-outline":   "#F59E0B",
  "trash-outline":    DESTRUCTIVE_COLOR,
  "trash":            DESTRUCTIVE_COLOR,
  "archive-outline":  "#6366F1",
  "archive":          "#6366F1",
  "copy-outline":     "#3B82F6",
  "copy":             "#3B82F6",
  "share-outline":    "#06B6D4",
  "share":            "#06B6D4",
  "save-outline":     "#10B981",
  "save":             "#10B981",
  "person-outline":   "#8B5CF6",
  "person":           "#8B5CF6",
  "settings-outline": "#64748B",
  "settings":         "#64748B",
  "ban-outline":      DESTRUCTIVE_COLOR,
  "log-out-outline":  DESTRUCTIVE_COLOR,
  "card-outline":     "#10B981",
  "business-outline": "#3B82F6",
  "link-outline":     "#06B6D4",
};

function getIconBg(action: SheetAction): string {
  if (action.iconBg) return action.iconBg;
  if (action.style === "destructive") return DESTRUCTIVE_COLOR;
  if (action.icon) return ICON_BG_MAP[action.icon] ?? "#64748B";
  return "#64748B";
}

// ─── Global imperative API ────────────────────────────────────────────────────

let _show: ((config: SheetConfig) => void) | null = null;

export function showActionSheet(config: SheetConfig) {
  if (_show) _show(config);
}

// ─── ActionRow sub-component ──────────────────────────────────────────────────

interface ActionRowProps {
  action: SheetAction;
  isLast: boolean;
  isDestructive: boolean;
  isFirstDestructive: boolean;
  onPress: (action: SheetAction) => void;
  colors: any;
}

const ActionRow = React.memo(
  ({ action, isLast, isDestructive, isFirstDestructive, onPress, colors }: ActionRowProps) => {
    const [pressed, setPressed] = useState(false);
    const iconBg = getIconBg(action);
    const labelColor = isDestructive ? DESTRUCTIVE_COLOR : colors.textPrimary;

    return (
      <>
        {isFirstDestructive && (
          <View style={[s.fullDivider, { backgroundColor: colors.border }]} />
        )}
        <TouchableOpacity
          style={[s.actionRow, pressed && { backgroundColor: colors.surfaceDim }]}
          onPress={() => onPress(action)}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          activeOpacity={1}
        >
          {action.icon ? (
            <View style={[s.iconSquare, { backgroundColor: iconBg }]}>
              <Ionicons name={action.icon as any} size={17} color="#FFFFFF" />
            </View>
          ) : (
            <View style={[s.iconSquare, { backgroundColor: iconBg }]} />
          )}
          <Text style={[s.actionLabel, { color: labelColor }]}>{action.label}</Text>
          {!isDestructive && (
            <Ionicons name="chevron-forward" size={16} color={colors.borderLight} />
          )}
        </TouchableOpacity>
        {!isLast && (
          <View style={[s.indentDivider, { backgroundColor: colors.borderLight }]} />
        )}
      </>
    );
  },
);
ActionRow.displayName = "ActionRow";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActionSheet() {
  const { colors } = useAppTheme();
  const [sheet, setSheet] = useState<SheetConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    _show = (config) => {
      setSheet(config);
      setVisible(true);
    };
    return () => { _show = null; };
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 260,
          friction: 24,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  if (!sheet || !visible) return null;

  const close = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 80, duration: 160, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setSheet(null);
      translateY.setValue(80);
      cb?.();
    });
  };

  const handlePress = (action: SheetAction) => {
    close(() => setTimeout(action.onPress, 160));
  };

  const defaultActions = sheet.actions.filter((a) => a.style !== "cancel" && a.style !== "destructive");
  const destructiveActions = sheet.actions.filter((a) => a.style === "destructive");
  const cancelAction = sheet.actions.find((a) => a.style === "cancel");
  const mainActions = [...defaultActions, ...destructiveActions];

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => close()}>
      <TouchableWithoutFeedback onPress={() => close()}>
        <Animated.View style={[s.backdrop, { opacity }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation?.()}>
            <Animated.View style={[s.container, { transform: [{ translateY }] }]}>

              {/* Main actions card */}
              <View style={[s.card, { backgroundColor: colors.surface }]}>
                {/* Title + message */}
                {(sheet.title || sheet.message) && (
                  <>
                    <View style={s.titleBlock}>
                      {sheet.title ? (
                        <Text style={[s.title, { color: colors.textPrimary }]}>
                          {sheet.title}
                        </Text>
                      ) : null}
                      {sheet.message ? (
                        <Text style={[s.message, { color: colors.textSecondary }]}>
                          {sheet.message}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[s.fullDivider, { backgroundColor: colors.borderLight }]} />
                  </>
                )}

                {mainActions.map((action, i) => {
                  const isDestructive = action.style === "destructive";
                  const isFirstDestructive =
                    isDestructive && defaultActions.length > 0 && i === defaultActions.length;
                  const isLast = i === mainActions.length - 1;

                  return (
                    <ActionRow
                      key={i}
                      action={action}
                      isLast={isLast}
                      isDestructive={isDestructive}
                      isFirstDestructive={isFirstDestructive}
                      onPress={handlePress}
                      colors={colors}
                    />
                  );
                })}
              </View>

              {/* Cancel card */}
              {cancelAction && (
                <View style={[s.cancelCard, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity style={s.cancelRow} onPress={() => close()} activeOpacity={0.6}>
                    <Text style={[s.cancelLabel, { color: colors.textSecondary }]}>
                      {cancelAction.label}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  container: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    gap: 10,
  },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  cancelCard: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.1,
    marginBottom: 3,
  },
  message: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  fullDivider: {
    height: StyleSheet.hairlineWidth,
  },
  indentDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16 + 34 + 14,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 58,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconSquare: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  cancelRow: {
    height: 58,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelLabel: {
    fontSize: 17,
    fontWeight: "600",
  },
});
