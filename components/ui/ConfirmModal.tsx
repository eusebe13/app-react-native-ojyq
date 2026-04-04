/**
 * ConfirmModal — global confirmation dialog
 *
 * Centered floating card with spring animation.
 * Replaces Alert.alert for confirmations app-wide.
 *
 * Usage: mount <ConfirmModal /> once in _layout, then call showConfirm() anywhere.
 *
 *   showConfirm({
 *     title: "Déconnexion",
 *     message: "Voulez-vous vraiment vous déconnecter ?",
 *     confirmLabel: "Déconnecter",
 *     destructive: true,
 *     onConfirm: logOut,
 *   });
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConfirmConfig = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

// ─── Global imperative API ────────────────────────────────────────────────────

let _show: ((config: ConfirmConfig) => void) | null = null;

export function showConfirm(config: ConfirmConfig) {
  if (_show) _show(config);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConfirmModal() {
  const { colors } = useAppTheme();
  const [config, setConfig] = useState<ConfirmConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    _show = (c) => {
      setConfig(c);
      setVisible(true);
    };
    return () => { _show = null; };
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 280,
          friction: 22,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scale, opacity]);

  if (!config || !visible) return null;

  const close = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.92, duration: 140, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setConfig(null);
      scale.setValue(0.88);
      cb?.();
    });
  };

  const handleConfirm = () => close(() => setTimeout(config.onConfirm, 50));
  const handleCancel = () => close(config.onCancel);

  const confirmColor = config.destructive ? "#EF4444" : colors.primary;

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleCancel}>
      <TouchableWithoutFeedback onPress={handleCancel}>
        <Animated.View style={[s.backdrop, { opacity }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation?.()}>
            <Animated.View
              style={[
                s.card,
                { backgroundColor: colors.surface, transform: [{ scale }] },
              ]}
            >
              {/* Title */}
              <Text style={[s.title, { color: colors.textPrimary }]}>
                {config.title}
              </Text>

              {/* Message */}
              {config.message ? (
                <Text style={[s.message, { color: colors.textSecondary }]}>
                  {config.message}
                </Text>
              ) : null}

              {/* Divider */}
              <View style={[s.divider, { backgroundColor: colors.borderLight }]} />

              {/* Buttons */}
              <View style={s.buttonRow}>
                <TouchableOpacity
                  style={[s.btn, s.btnCancel, { borderColor: colors.borderLight }]}
                  onPress={handleCancel}
                  activeOpacity={0.6}
                >
                  <Text style={[s.btnText, { color: colors.textSecondary }]}>
                    {config.cancelLabel ?? "Annuler"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.btn, s.btnConfirm, { backgroundColor: confirmColor }]}
                  onPress={handleConfirm}
                  activeOpacity={0.75}
                >
                  <Text style={[s.btnText, s.btnConfirmText]}>
                    {config.confirmLabel ?? "Confirmer"}
                  </Text>
                </TouchableOpacity>
              </View>
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    paddingTop: 26,
    paddingBottom: 20,
    paddingHorizontal: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 18,
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  btnCancel: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnConfirm: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  btnConfirmText: {
    color: "#FFFFFF",
  },
});
