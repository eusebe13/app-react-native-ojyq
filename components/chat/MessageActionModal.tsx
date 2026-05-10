/**
 * MessageActionModal — iOS/Instagram-style context menu
 *
 * Layout (bottom-anchored):
 *   ┌───────────────────────────────┐
 *   │  [😍][👍][😂][😮][😢][🔥][•••] │  ← floating reaction pill row
 *   ├───────────────────────────────┤
 *   │  [icon]  Action label         │  ← action card (colored icon squares)
 *   │  ─────────────────────────── │
 *   │  [icon]  Action label         │
 *   ├───────────────────────────────┤
 *   │            Annuler            │  ← separate cancel card
 *   └───────────────────────────────┘
 */

import { useAppTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

// Colored icon backgrounds per action id
const ACTION_ICON_MAP: Record<string, { bg: string; color: string }> = {
  copy: { bg: "#3B82F6", color: "#FFFFFF" },
  reply: { bg: "#6366F1", color: "#FFFFFF" },
  edit: { bg: "#F59E0B", color: "#FFFFFF" },
  forward: { bg: "#06B6D4", color: "#FFFFFF" },
  save: { bg: "#10B981", color: "#FFFFFF" },
  delete: { bg: DESTRUCTIVE_COLOR, color: "#FFFFFF" },
};

function getActionColors(
  id: string,
  isDestructive: boolean,
  primaryColor: string,
) {
  if (isDestructive) return { bg: DESTRUCTIVE_COLOR, color: "#FFFFFF" };
  return ACTION_ICON_MAP[id] ?? { bg: primaryColor, color: "#FFFFFF" };
}

// ─── Styles factory ───────────────────────────────────────────────────────────

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    // Full-screen backdrop
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },

    // Everything sits inside this bottom container
    bottomContainer: {
      paddingHorizontal: 12,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      gap: 10,
      ...(Platform.OS === "web" && {
        maxWidth: 520,
        width: "100%",
        alignSelf: "center",
      }),
    },

    // ── Reaction pill row ─────────────────────────────────────────────────────
    reactionCard: {
      backgroundColor: colors.surface,
      borderRadius: 50,
      paddingHorizontal: 6,
      paddingVertical: 6,
      alignSelf: "center",
      width: "100%",
      ...(Platform.OS === "web" && { maxWidth: 440 }),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    emojiButton: {
      width: 46,
      height: 46,
      justifyContent: "center",
      alignItems: "center",
    },
    emojiText: {
      fontSize: 22,
      lineHeight: Platform.OS === "android" ? 26 : undefined,
    },
    moreCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceDim,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: 3,
    },
    moreButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.textSecondary,
      letterSpacing: 1,
    },

    // ── Action card ───────────────────────────────────────────────────────────
    actionCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },

    // Action row
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      height: 58,
      paddingHorizontal: 16,
      gap: 14,
    },
    actionRowPressed: {
      backgroundColor: colors.surfaceDim,
    },
    actionIconSquare: {
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

    // Separator
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
      marginLeft: 16 + 34 + 14, // indent past icon
    },

    // Destructive group separator (full-width, slightly more visible)
    destructiveSeparator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 0,
    },

    // ── Cancel card ───────────────────────────────────────────────────────────
    cancelCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    cancelButton: {
      height: 58,
      justifyContent: "center",
      alignItems: "center",
    },
    cancelLabel: {
      fontSize: 17,
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

const EmojiButton = React.memo(
  ({ emoji, onPress, styles }: EmojiButtonProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = useCallback(() => {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.35,
          tension: 320,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 320,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start(() => onPress(emoji));
    }, [emoji, onPress, scaleAnim]);

    return (
      <TouchableOpacity
        style={styles.emojiButton}
        onPress={handlePress}
        activeOpacity={0.7}
        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      >
        <Animated.Text
          style={[styles.emojiText, { transform: [{ scale: scaleAnim }] }]}
        >
          {emoji}
        </Animated.Text>
      </TouchableOpacity>
    );
  },
);
EmojiButton.displayName = "EmojiButton";

// ─── ActionRow sub-component ──────────────────────────────────────────────────

interface ActionRowItemProps {
  action: MessageAction;
  isLast: boolean;
  isDestructive: boolean;
  isFirstDestructive: boolean;
  onPress: (action: MessageAction) => void;
  colors: any;
  styles: ReturnType<typeof getStyles>;
}

const ActionRowItem = React.memo(
  ({
    action,
    isLast,
    isDestructive,
    isFirstDestructive,
    onPress,
    colors,
    styles,
  }: ActionRowItemProps) => {
    const [pressed, setPressed] = useState(false);
    const { bg: iconBg, color: iconColor } = getActionColors(
      action.id,
      isDestructive,
      colors.primary,
    );
    const labelColor = isDestructive ? DESTRUCTIVE_COLOR : colors.textPrimary;

    const handlePress = useCallback(() => onPress(action), [action, onPress]);

    return (
      <>
        {/* Show a full-width separator before the first destructive action */}
        {isFirstDestructive && <View style={styles.destructiveSeparator} />}

        <TouchableOpacity
          style={[styles.actionRow, pressed && styles.actionRowPressed]}
          onPress={handlePress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          activeOpacity={1}
        >
          <View style={[styles.actionIconSquare, { backgroundColor: iconBg }]}>
            <Ionicons name={action.icon as any} size={17} color={iconColor} />
          </View>
          <Text style={[styles.actionLabel, { color: labelColor }]}>
            {action.label}
          </Text>
          {!isDestructive && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.borderLight}
            />
          )}
        </TouchableOpacity>

        {!isLast && !isDestructive && <View style={styles.separator} />}
      </>
    );
  },
);
ActionRowItem.displayName = "ActionRowItem";

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

    const [modalVisible, setModalVisible] = useState(visible);

    // Slide-up + fade animation
    const translateY = useRef(new Animated.Value(60)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (visible) {
        setModalVisible(true);
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
      } else {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 40,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 160,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setModalVisible(false);
          translateY.setValue(60);
        });
      }
    }, [visible, translateY, opacity]);

    const handleReaction = useCallback(
      (emoji: string) => {
        onReaction(emoji);
        onClose();
      },
      [onReaction, onClose],
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
      [onClose],
    );

    // Split actions: default vs destructive
    const defaultActions = actions.filter((a) => a.style !== "destructive");
    const destructiveActions = actions.filter((a) => a.style === "destructive");
    const allActions = [...defaultActions, ...destructiveActions];

    if (!modalVisible) return null;

    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity }]}>
            {/* Block touch on content */}
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation?.()}>
              <Animated.View
                style={[
                  styles.bottomContainer,
                  { transform: [{ translateY }] },
                ]}
              >
                {/* ── Reaction pill row ── */}
                <View style={styles.reactionCard}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 4,
                      gap: 6,
                      flexGrow: 1,
                    }}
                  >
                    {QUICK_EMOJIS.map((emoji) => (
                      <EmojiButton
                        key={emoji}
                        emoji={emoji}
                        onPress={handleReaction}
                        styles={styles}
                      />
                    ))}
                    {/* Full picker */}
                    <TouchableOpacity
                      style={styles.emojiButton}
                      onPress={handleOpenFullPicker}
                      activeOpacity={0.7}
                    >
                      <View style={styles.moreCircle}>
                        <Text style={styles.moreButtonText}>•••</Text>
                      </View>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* ── Action card ── */}
                <View style={styles.actionCard}>
                  {allActions.map((action, index) => {
                    const isDestructive = action.style === "destructive";
                    const isFirstDestructive =
                      isDestructive &&
                      defaultActions.length > 0 &&
                      index === defaultActions.length;
                    const isLast = index === allActions.length - 1;

                    return (
                      <ActionRowItem
                        key={action.id}
                        action={action}
                        isLast={isLast}
                        isDestructive={isDestructive}
                        isFirstDestructive={isFirstDestructive}
                        onPress={handleActionPress}
                        colors={colors}
                        styles={styles}
                      />
                    );
                  })}
                </View>

                {/* ── Cancel card ── */}
                <View style={styles.cancelCard}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelLabel}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  },
);

MessageActionModal.displayName = "MessageActionModal";

export default MessageActionModal;
