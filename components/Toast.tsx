import { useAppTheme } from "@/contexts/ThemeContext";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

let _showToast: ((msg: string, type: ToastType) => void) | null = null;
let _counter = 0;

export function showToast(message: string, type: ToastType = "info") {
  if (_showToast) {
    _showToast(message, type);
  }
}

const ACCENT: Record<ToastType, string> = {
  success: "#4CAF50",
  error: "#F44336",
  info: "#2196F3",
};

function ToastItem({
  message,
  type,
  onDone,
}: {
  message: string;
  type: ToastType;
  onDone: () => void;
}) {
  const { colors, tokens } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  // Stable ref so animation doesn't restart when parent re-renders
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.delay(1600),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]);
    anim.start(() => onDoneRef.current());
    return () => anim.stop();
  }, []); // empty deps — run once on mount only

  return (
    <Animated.View
      style={[styles.pill, { backgroundColor: colors.surface, opacity }]}
    >
      <View style={[styles.accent, { backgroundColor: ACCENT[type] }]} />
      <Text
        style={[
          styles.text,
          { color: colors.textPrimary, fontSize: tokens.font.sm },
        ]}
        numberOfLines={3}
      >
        {message}
      </Text>
    </Animated.View>
  );
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    _showToast = (message, type) => {
      const id = ++_counter;
      setToasts((prev) => [...prev, { id, message, type }]);
    };
    return () => {
      _showToast = null;
    };
  }, []);

  const remove = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent>
      <View style={styles.container} pointerEvents="none">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            message={t.message}
            type={t.type}
            onDone={() => remove(t.id)}
          />
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 10,
    left: 16,
    right: 16,
    zIndex: 99999,
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
    paddingVertical: 12,
    paddingRight: 16,
    elevation: 6,
  },
  accent: {
    width: 4,
    alignSelf: "stretch",
    marginRight: 12,
  },
  text: {
    flex: 1,
    fontWeight: "600",
  },
});
