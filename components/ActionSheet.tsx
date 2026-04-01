import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

type SheetAction = {
  label: string;
  onPress: () => void;
  style?: "default" | "destructive" | "cancel";
};

type SheetConfig = {
  title: string;
  message?: string;
  actions: SheetAction[];
};

let _show: ((config: SheetConfig) => void) | null = null;

/**
 * Cross-platform action sheet.
 * On native → delegates to Alert.alert.
 * On web → shows a bottom-sheet style modal (requires <ActionSheet /> mounted in _layout).
 */
export function showActionSheet(config: SheetConfig) {
  if (Platform.OS !== "web") {
    Alert.alert(
      config.title,
      config.message,
      config.actions.map((a) => ({
        text: a.label,
        style: a.style,
        onPress: a.onPress,
      }))
    );
    return;
  }
  if (_show) _show(config);
}

export default function ActionSheet() {
  const { colors, tokens } = useAppTheme();
  const [sheet, setSheet] = useState<SheetConfig | null>(null);

  // Register global setter
  React.useEffect(() => {
    _show = setSheet;
    return () => { _show = null; };
  }, []);

  if (!sheet) return null;

  const close = () => setSheet(null);
  const nonCancel = sheet.actions.filter((a) => a.style !== "cancel");
  const cancel = sheet.actions.find((a) => a.style === "cancel");

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />

      {/* Sheet */}
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        {sheet.title ? (
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: tokens.font.base }]}>
            {sheet.title}
          </Text>
        ) : null}
        {sheet.message ? (
          <Text style={[styles.message, { color: colors.textSecondary, fontSize: tokens.font.sm }]}>
            {sheet.message}
          </Text>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {nonCancel.map((action, i) => (
          <TouchableOpacity
            key={i}
            style={styles.actionBtn}
            onPress={() => { close(); action.onPress(); }}
          >
            <Text
              style={[
                styles.actionLabel,
                { fontSize: tokens.font.base },
                action.style === "destructive"
                  ? { color: "#F44336", fontWeight: "600" }
                  : { color: colors.textPrimary },
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}

        {cancel && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.actionBtn} onPress={close}>
              <Text style={[styles.actionLabel, { color: colors.textSecondary, fontSize: tokens.font.base }]}>
                {cancel.label}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
    overflow: "hidden",
  },
  title: {
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  message: {
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
  },
  actionBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  actionLabel: {
    fontWeight: "500",
  },
});
