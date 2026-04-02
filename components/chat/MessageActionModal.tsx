import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MessageAction {
  id: string;
  label: string;
  icon: string; // Ionicons name
  style?: "default" | "destructive";
  onPress: () => void;
}

interface MessageActionModalProps {
  visible: boolean;
  actions: MessageAction[];
  onReaction: (emoji: string) => void;
  onOpenFullPicker: () => void;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥", "👏", "🙏"] as const;
const DESTRUCTIVE_COLOR = "#EF4444";

// ─── Styles factory ───────────────────────────────────────────────────────────

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    // Backdrop
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      alignItems: "center",
    },

    // Card
    card: {
      width: "100%",
      maxWidth: 300,
      marginHorizontal: 24,
      borderRadius: 20,
      backgroundColor: colors.surface,
      overflow: "hidden",
      // Android
      elevation: 24,
      // iOS / web
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
    },

    // Quick reactions bar
    reactionsContainer: {
      paddingHorizontal: 10,
      paddingVertical: 12,
    },
    reactionsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    emojiButton: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    emojiCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceDim,
      justifyContent: "center",
      alignItems: "center",
    },
    emojiText: {
      fontSize: 18,
      lineHeight: Platform.OS === "android" ? 22 : undefined,
    },
    moreButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      letterSpacing: 1,
    },

    // Separators
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: 0,
    },

    // Action rows
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      height: 52,
      paddingHorizontal: 0,
    },
    actionRowPressed: {
      backgroundColor: colors.surfaceDim,
    },
    actionIconArea: {
      width: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    actionLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: "500",
    },

    // Cancel button
    cancelSeparator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    cancelButton: {
      height: 52,
      justifyContent: "center",
      alignItems: "center",
    },
    cancelLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
    },
  });

// ─── EmojiButton sub-component ────────────────────────────────────────────────

interface EmojiButtonProps {
  emoji: string;
  onPress: (emoji: string) => void;
  styles: ReturnType<typeof getStyles>;
}

const EmojiButton = React.memo(({ emoji, onPress, styles }: EmojiButtonProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.3,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onPress(emoji);
    });
  }, [emoji, onPress, scaleAnim]);

  return (
    <TouchableOpacity
      style={styles.emojiButton}
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
    >
      <Animated.View style={[styles.emojiCircle, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.emojiText}>{emoji}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

EmojiButton.displayName = "EmojiButton";

// ─── ActionRow sub-component ──────────────────────────────────────────────────

interface ActionRowProps {
  action: MessageAction;
  isLast: boolean;
  onPress: (action: MessageAction) => void;
  colors: any;
  styles: ReturnType<typeof getStyles>;
}

const ActionRow = React.memo(({ action, isLast, onPress, colors, styles }: ActionRowProps) => {
  const isDestructive = action.style === "destructive";
  const iconColor = isDestructive ? DESTRUCTIVE_COLOR : colors.textPrimary;
  const labelColor = isDestructive ? DESTRUCTIVE_COLOR : colors.textPrimary;
  const [pressed, setPressed] = useState(false);

  const handlePress = useCallback(() => {
    onPress(action);
  }, [action, onPress]);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.actionRow,
          pressed && styles.actionRowPressed,
        ]}
        onPress={handlePress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        activeOpacity={1}
      >
        <View style={styles.actionIconArea}>
          <Ionicons name={action.icon as any} size={20} color={iconColor} />
        </View>
        <Text style={[styles.actionLabel, { color: labelColor }]}>{action.label}</Text>
      </TouchableOpacity>
      {!isLast && <View style={styles.separator} />}
    </>
  );
});

ActionRow.displayName = "ActionRow";

// ─── Main component ───────────────────────────────────────────────────────────

const MessageActionModal = React.memo(
  ({
    visible,
    actions,
    onReaction,
    onOpenFullPicker,
    onClose,
  }: MessageActionModalProps) => {
    const { colors, tokens } = useAppTheme();
    const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);

    // Internal visibility state so the modal stays mounted during exit animation
    const [modalVisible, setModalVisible] = useState(visible);

    // Single progress value: 0 = hidden, 1 = shown
    const progress = useRef(new Animated.Value(0)).current;

    // Derived animated values
    const opacity = progress;
    const scale = useMemo(
      () =>
        progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
          extrapolate: "clamp",
        }),
      [progress]
    );

    useEffect(() => {
      if (visible) {
        setModalVisible(true);
        Animated.spring(progress, {
          toValue: 1,
          tension: 280,
          friction: 22,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(progress, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          setModalVisible(false);
        });
      }
    }, [visible, progress]);

    // ── Handlers ──

    const handleReaction = useCallback(
      (emoji: string) => {
        onReaction(emoji);
        onClose();
      },
      [onReaction, onClose]
    );

    const handleOpenFullPicker = useCallback(() => {
      onOpenFullPicker();
      onClose();
    }, [onOpenFullPicker, onClose]);

    const handleActionPress = useCallback(
      (action: MessageAction) => {
        action.onPress();
        onClose();
      },
      [onClose]
    );

    const handleBackdropPress = useCallback(() => {
      onClose();
    }, [onClose]);

    // ── Render ──

    if (!modalVisible) return null;

    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View style={[styles.backdrop, { opacity }]}>
            {/* Block touch propagation on the card itself */}
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation?.()}>
              <Animated.View
                style={[
                  styles.card,
                  { transform: [{ scale }] },
                ]}
              >
                {/* ── Quick reactions bar ── */}
                <View style={styles.reactionsContainer}>
                  <View style={styles.reactionsRow}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ flexDirection: "row", alignItems: "center" }}
                      scrollEnabled={true}
                    >
                      {QUICK_EMOJIS.map((emoji) => (
                        <EmojiButton
                          key={emoji}
                          emoji={emoji}
                          onPress={handleReaction}
                          styles={styles}
                        />
                      ))}

                      {/* ••• full picker button */}
                      <TouchableOpacity
                        style={styles.emojiButton}
                        onPress={handleOpenFullPicker}
                        activeOpacity={0.7}
                      >
                        <View style={styles.emojiCircle}>
                          <Text style={styles.moreButtonText}>•••</Text>
                        </View>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </View>

                {/* ── Separator ── */}
                <View style={styles.separator} />

                {/* ── Action rows ── */}
                {actions.map((action, index) => (
                  <ActionRow
                    key={action.id}
                    action={action}
                    isLast={index === actions.length - 1}
                    onPress={handleActionPress}
                    colors={colors}
                    styles={styles}
                  />
                ))}

                {/* ── Cancel button ── */}
                <View style={styles.cancelSeparator} />
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelLabel}>Annuler</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }
);

MessageActionModal.displayName = "MessageActionModal";

export default MessageActionModal;
