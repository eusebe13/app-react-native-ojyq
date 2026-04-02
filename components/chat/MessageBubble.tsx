/**
 * MessageBubble — Instagram/Messenger-style chat bubble
 *
 * Supports: text, image, audio, poll, file, reply quote, reactions,
 * forwarded label, date separators. Works on both native and web (react-native-web).
 */

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PRESET_AVATARS } from "@/constants/avatarPresets";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Icon } from "@/components/ui/Icon";
import type { ChatMessage, PollData } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: ChatMessage;
  previousMessage: ChatMessage | null;
  nextMessage: ChatMessage | null;
  currentUserId: string;
  onLongPress: (message: ChatMessage) => void;
  onReactionPress: (messageId: string, emoji: string) => void;
  onAddReaction: (messageId: string) => void;
  onImagePress: (uri: string) => void;
  onPollVote: (messageId: string, poll: PollData, optionIndex: number) => void;
  onFileDownload: (uri: string, name: string) => void;
  onSwipeReply: (message: ChatMessage) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get("window").width;
const BUBBLE_MAX_WIDTH = SCREEN_WIDTH * 0.78;

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDateLabel = (date: Date): string => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) return "Aujourd'hui";
  if (isSameDay(date, yesterday)) return "Hier";

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (date: Date): string =>
  date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const formatAudioTime = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

// ---------------------------------------------------------------------------
// AudioPlayer (inline, not exported)
// ---------------------------------------------------------------------------

interface AudioPlayerProps {
  uri: string;
  isMe: boolean;
  colors: any;
  tokens: any;
}

const AudioPlayer = React.memo(({ uri, isMe, colors, tokens }: AudioPlayerProps) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const accentColor = isMe ? "#FFFFFF" : colors.primary;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  const handlePlayPause = useCallback(async () => {
    if (isLoading) return;

    if (!sound) {
      setIsLoading(true);
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status) => {
            if (!status.isLoaded) return;
            setPositionMs(status.positionMillis ?? 0);
            setDurationMs(status.durationMillis ?? 0);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPositionMs(0);
              // Unload so next press recreates the sound from the beginning
              newSound.unloadAsync().catch(() => {});
              setSound(null);
            }
          }
        );
        setSound(newSound);
        setIsPlaying(true);
      } catch {
        // silently ignore load errors
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  }, [isLoading, sound, isPlaying, uri]);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <View style={audioStyles.container}>
      {/* Play/Pause */}
      <TouchableOpacity onPress={handlePlayPause} activeOpacity={0.7} style={audioStyles.button}>
        {isLoading ? (
          <ActivityIndicator size={32} color={accentColor} />
        ) : (
          <Ionicons
            name={isPlaying ? "pause-circle" : "play-circle"}
            size={32}
            color={accentColor}
          />
        )}
      </TouchableOpacity>

      {/* Progress + time */}
      <View style={audioStyles.trackArea}>
        <View style={[audioStyles.trackBg, { backgroundColor: isMe ? "rgba(255,255,255,0.3)" : colors.border }]}>
          <View
            style={[
              audioStyles.trackFill,
              { width: `${progress * 100}%`, backgroundColor: accentColor },
            ]}
          />
        </View>
        <Text style={[audioStyles.time, { color: isMe ? "rgba(255,255,255,0.8)" : colors.textSecondary }]}>
          {formatAudioTime(positionMs)} / {formatAudioTime(durationMs)}
        </Text>
      </View>
    </View>
  );
});

AudioPlayer.displayName = "AudioPlayer";

const audioStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 180,
  },
  button: {
    marginRight: 8,
  },
  trackArea: {
    flex: 1,
  },
  trackBg: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  trackFill: {
    height: 3,
    borderRadius: 2,
  },
  time: {
    fontSize: 10,
  },
});

// ---------------------------------------------------------------------------
// AvatarBubble (inline, not exported)
// ---------------------------------------------------------------------------

interface AvatarBubbleProps {
  avatarUri?: string | null;
  avatarPreset?: number | null;
  name: string;
  size?: number;
}

const AvatarBubble = React.memo(({ avatarUri, avatarPreset, name, size = 32 }: AvatarBubbleProps) => {
  const preset =
    avatarPreset != null && avatarPreset >= 0 && avatarPreset < PRESET_AVATARS.length
      ? PRESET_AVATARS[avatarPreset]
      : null;

  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const containerStyle: any = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: preset ? preset.bg : "#94A3B8",
  };

  if (avatarUri) {
    return (
      <View style={containerStyle}>
        <Image source={{ uri: avatarUri }} style={{ width: size, height: size }} />
      </View>
    );
  }

  if (preset) {
    return (
      <View style={containerStyle}>
        <Icon name={preset.icon} size={size * 0.6} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={{ color: "#FFFFFF", fontSize: size * 0.38, fontWeight: "700" }}>
        {initials}
      </Text>
    </View>
  );
});

AvatarBubble.displayName = "AvatarBubble";

// ---------------------------------------------------------------------------
// StyleSheet factory
// ---------------------------------------------------------------------------

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    // Date separator
    dateSeparatorWrapper: {
      alignItems: "center",
      marginVertical: 12,
    },
    dateSeparatorText: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
      backgroundColor: colors.surfaceDim,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      overflow: "hidden",
    },

    // Row wrapper
    rowWrapper: {
      paddingHorizontal: 12,
      paddingVertical: 2,
    },

    // Forwarded label
    forwardedLabel: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
      fontStyle: "italic",
      marginBottom: 2,
      marginLeft: 40, // indent to align with bubble when avatar present
    },
    forwardedLabelMe: {
      marginLeft: 0,
      textAlign: "right",
    },

    // Username label (others only)
    usernameLabel: {
      fontSize: tokens.font.xs,
      color: colors.textSecondary,
      marginBottom: 2,
      marginLeft: 40,
    },

    // Row: avatar + bubble column
    messageRow: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    messageRowMe: {
      flexDirection: "row-reverse",
    },

    // Avatar placeholder
    avatarPlaceholder: {
      width: 32,
      marginRight: 8,
    },
    avatarWrapper: {
      width: 32,
      marginRight: 8,
    },

    // Bubble column (contains bubble + meta + reactions)
    bubbleColumn: {
      maxWidth: BUBBLE_MAX_WIDTH,
      alignItems: "flex-start",
    },
    bubbleColumnMe: {
      alignItems: "flex-end",
    },

    // Bubble
    bubble: {
      borderRadius: 18,
      paddingVertical: 10,
      paddingHorizontal: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    bubbleOther: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 18, // default; overridden when tail
    },
    bubbleOtherTail: {
      borderBottomLeftRadius: 4,
    },
    bubbleMe: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 18, // default; overridden when tail
    },
    bubbleMeTail: {
      borderBottomRightRadius: 4,
    },

    // Reply quote
    replyQuote: {
      borderLeftWidth: 3,
      borderRadius: 6,
      paddingLeft: 8,
      paddingVertical: 4,
      marginBottom: 8,
      backgroundColor: "rgba(0,0,0,0.06)",
    },
    replyQuoteMe: {
      backgroundColor: "rgba(255,255,255,0.15)",
      borderLeftColor: "#FFFFFF",
    },
    replyQuoteOther: {
      borderLeftColor: colors.primary,
    },
    replyQuoteSender: {
      fontSize: tokens.font.xs,
      fontWeight: "700",
      marginBottom: 2,
    },
    replyQuoteSenderMe: {
      color: "#FFFFFF",
    },
    replyQuoteSenderOther: {
      color: colors.primary,
    },
    replyQuoteText: {
      fontSize: tokens.font.xs,
    },
    replyQuoteTextMe: {
      color: "rgba(255,255,255,0.75)",
    },
    replyQuoteTextOther: {
      color: colors.textSecondary,
    },

    // Image
    imageWrapper: {
      marginHorizontal: -14,
      marginVertical: 2,
      overflow: "hidden",
      borderRadius: 12,
    },
    messageImage: {
      width: 220,
      height: 160,
      borderRadius: 12,
    },

    // Text
    messageText: {
      fontSize: tokens.font.base,
      lineHeight: 20,
    },
    messageTextMe: {
      color: "#FFFFFF",
    },
    messageTextOther: {
      color: colors.textPrimary,
    },

    // Poll
    pollQuestion: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 8,
    },
    pollQuestionMe: {
      color: "#FFFFFF",
    },
    pollQuestionOther: {
      color: colors.textPrimary,
    },
    pollOption: {
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginBottom: 6,
      borderWidth: 1,
      alignItems: "center",
    },
    pollOptionMe: {
      borderColor: "rgba(255,255,255,0.6)",
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    pollOptionOther: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceDim,
    },
    pollOptionText: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
    },
    pollOptionTextMe: {
      color: "#FFFFFF",
    },
    pollOptionTextOther: {
      color: colors.primary,
    },
    pollEndedText: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
      textAlign: "center",
      marginTop: 4,
      fontStyle: "italic",
    },

    // File
    fileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    fileInfo: {
      flex: 1,
    },
    fileName: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
    },
    fileNameMe: {
      color: "#FFFFFF",
    },
    fileNameOther: {
      color: colors.textPrimary,
    },
    fileSize: {
      fontSize: tokens.font.xs,
      marginTop: 1,
    },
    fileSizeMe: {
      color: "rgba(255,255,255,0.7)",
    },
    fileSizeOther: {
      color: colors.textSecondary,
    },

    // Meta row (time + edited)
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
      gap: 4,
    },
    metaRowMe: {
      justifyContent: "flex-end",
    },
    metaRowOther: {
      justifyContent: "flex-start",
    },
    editedText: {
      fontSize: 10,
      fontStyle: "italic",
    },
    editedTextMe: {
      color: "rgba(255,255,255,0.55)",
    },
    editedTextOther: {
      color: colors.textTertiary,
    },
    timeText: {
      fontSize: 10,
    },
    timeTextMe: {
      color: "rgba(255,255,255,0.6)",
    },
    timeTextOther: {
      color: colors.textTertiary,
    },

    // Reactions
    reactionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: -8,
      gap: 4,
      paddingBottom: 2,
    },
    reactionPill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 1,
      elevation: 1,
      gap: 3,
    },
    reactionPillHighlighted: {
      backgroundColor: colors.primaryTint,
      borderColor: colors.primary,
    },
    reactionEmoji: {
      fontSize: 14,
    },
    reactionCount: {
      fontSize: tokens.font.xs,
      color: colors.textSecondary,
    },
    reactionCountHighlighted: {
      color: colors.primary,
      fontWeight: "700",
    },
    addReactionPill: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

  });

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const MessageBubble = React.memo(
  ({
    message,
    previousMessage,
    nextMessage,
    currentUserId,
    onLongPress,
    onReactionPress,
    onAddReaction,
    onImagePress,
    onPollVote,
    onFileDownload,
    onSwipeReply,
  }: MessageBubbleProps) => {
    const { colors, tokens } = useAppTheme();
    const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);

    const isMe = message.user._id === currentUserId;

    // Consecutive message detection
    const isFirstInGroup =
      previousMessage === null ||
      previousMessage.user._id !== message.user._id;
    const isLastInGroup =
      nextMessage === null || nextMessage.user._id !== message.user._id;

    // ── Swipe to reply ──────────────────────────────────────────────────────────
    const translateX = useRef(new Animated.Value(0)).current;
    const swipeTriggered = useRef(false);
    const SWIPE_THRESHOLD = 50;

    const panResponder = useMemo(() => {
      // On web, PanResponder doesn't support swipe well — disable
      if (Platform.OS === "web") return null;
      return PanResponder.create({
        onMoveShouldSetPanResponder: (_, gs) =>
          Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 8,
        onPanResponderGrant: () => {
          swipeTriggered.current = false;
        },
        onPanResponderMove: (_, gs) => {
          // isMe → swipe left (negative dx); others → swipe right (positive dx)
          const raw = isMe ? Math.min(0, gs.dx) : Math.max(0, gs.dx);
          const clamped = isMe
            ? Math.max(-SWIPE_THRESHOLD - 10, raw)
            : Math.min(SWIPE_THRESHOLD + 10, raw);
          translateX.setValue(clamped);
          if (!swipeTriggered.current && Math.abs(clamped) >= SWIPE_THRESHOLD) {
            swipeTriggered.current = true;
          }
        },
        onPanResponderRelease: () => {
          if (swipeTriggered.current) {
            onSwipeReply(message);
          }
          swipeTriggered.current = false;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 8,
          }).start();
        },
        onPanResponderTerminate: () => {
          swipeTriggered.current = false;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 8,
          }).start();
        },
      });
    }, [isMe, translateX, message, onSwipeReply]);

    // Date separator
    const showDateSeparator =
      previousMessage === null ||
      !isSameDay(
        new Date(message.createdAt),
        new Date(previousMessage.createdAt)
      );

    // Handlers
    const handleLongPress = useCallback(() => {
      onLongPress(message);
    }, [onLongPress, message]);

    const handleImagePress = useCallback(() => {
      if (message.image) onImagePress(message.image);
    }, [onImagePress, message.image]);

    const handleFileDownload = useCallback(() => {
      if (message.file) onFileDownload(message.file.uri, message.file.name);
    }, [onFileDownload, message.file]);

    const handleAddReaction = useCallback(() => {
      onAddReaction(message._id);
    }, [onAddReaction, message._id]);

    // Bubble tail corners
    const bubbleTailStyle = isLastInGroup
      ? isMe
        ? styles.bubbleMeTail
        : styles.bubbleOtherTail
      : null;

    // Reactions entries
    const reactionEntries = useMemo(() => {
      if (!message.reactions) return [];
      return Object.entries(message.reactions).filter(
        ([, users]) => users.length > 0
      );
    }, [message.reactions]);

    // ---------------------------------------------------------------------------
    // Sub-renders (defined as callbacks, not inline functions)
    // ---------------------------------------------------------------------------

    const renderDateSeparator = useCallback(() => {
      if (!showDateSeparator) return null;
      return (
        <View style={styles.dateSeparatorWrapper}>
          <Text style={styles.dateSeparatorText}>
            {formatDateLabel(new Date(message.createdAt))}
          </Text>
        </View>
      );
    }, [showDateSeparator, styles, message.createdAt]);

    const renderForwardedLabel = useCallback(() => {
      if (!message.forwarded) return null;
      return (
        <Text
          style={[
            styles.forwardedLabel,
            isMe && styles.forwardedLabelMe,
          ]}
        >
          ↗ Transferé
        </Text>
      );
    }, [message.forwarded, isMe, styles]);

    const renderUsernameLabel = useCallback(() => {
      if (isMe || !isFirstInGroup) return null;
      return (
        <Text style={styles.usernameLabel} numberOfLines={1}>
          {message.user.name}
        </Text>
      );
    }, [isMe, isFirstInGroup, styles, message.user.name]);

    const renderAvatar = useCallback(() => {
      if (isMe) return null;
      if (!isLastInGroup) {
        return <View style={styles.avatarPlaceholder} />;
      }
      return (
        <View style={styles.avatarWrapper}>
          <AvatarBubble
            avatarUri={message.user.avatar}
            avatarPreset={message.user.avatarPreset}
            name={message.user.name}
            size={32}
          />
        </View>
      );
    }, [isMe, isLastInGroup, styles, message.user]);

    const renderReplyQuote = useCallback(() => {
      if (!message.replyTo) return null;
      return (
        <View
          style={[
            styles.replyQuote,
            isMe ? styles.replyQuoteMe : styles.replyQuoteOther,
          ]}
        >
          <Text
            style={[
              styles.replyQuoteSender,
              isMe ? styles.replyQuoteSenderMe : styles.replyQuoteSenderOther,
            ]}
            numberOfLines={1}
          >
            {message.replyTo.userName}
          </Text>
          <Text
            style={[
              styles.replyQuoteText,
              isMe ? styles.replyQuoteTextMe : styles.replyQuoteTextOther,
            ]}
            numberOfLines={2}
          >
            {message.replyTo.text}
          </Text>
        </View>
      );
    }, [message.replyTo, isMe, styles]);

    const renderImage = useCallback(() => {
      if (!message.image) return null;
      return (
        <TouchableOpacity
          onPress={handleImagePress}
          activeOpacity={0.9}
          style={styles.imageWrapper}
        >
          <Image
            source={{ uri: message.image }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    }, [message.image, handleImagePress, styles]);

    const renderAudio = useCallback(() => {
      if (!message.audio) return null;
      return (
        <AudioPlayer
          uri={message.audio}
          isMe={isMe}
          colors={colors}
          tokens={tokens}
        />
      );
    }, [message.audio, isMe, colors, tokens]);

    const renderPoll = useCallback(() => {
      if (!message.poll) return null;
      const poll = message.poll;
      return (
        <View style={{ minWidth: 180 }}>
          <Text
            style={[
              styles.pollQuestion,
              isMe ? styles.pollQuestionMe : styles.pollQuestionOther,
            ]}
          >
            {poll.question}
          </Text>
          {poll.options.map((opt, idx) => {
            const voteCount = opt.voters.length;
            const handleVote = () => {
              if (poll.isActive) onPollVote(message._id, poll, idx);
            };
            return (
              <TouchableOpacity
                key={idx}
                onPress={handleVote}
                activeOpacity={poll.isActive ? 0.7 : 1}
                style={[
                  styles.pollOption,
                  isMe ? styles.pollOptionMe : styles.pollOptionOther,
                ]}
              >
                <Text
                  style={[
                    styles.pollOptionText,
                    isMe ? styles.pollOptionTextMe : styles.pollOptionTextOther,
                  ]}
                >
                  {opt.text} ({voteCount})
                </Text>
              </TouchableOpacity>
            );
          })}
          {!poll.isActive && (
            <Text style={styles.pollEndedText}>Sondage terminé</Text>
          )}
        </View>
      );
    }, [message.poll, message._id, isMe, styles, onPollVote]);

    const renderFile = useCallback(() => {
      if (!message.file) return null;
      const file = message.file;
      return (
        <TouchableOpacity
          onPress={handleFileDownload}
          activeOpacity={0.75}
          style={styles.fileRow}
        >
          <Ionicons
            name="document-outline"
            size={28}
            color={isMe ? "#FFFFFF" : colors.primary}
          />
          <View style={styles.fileInfo}>
            <Text
              style={[
                styles.fileName,
                isMe ? styles.fileNameMe : styles.fileNameOther,
              ]}
              numberOfLines={1}
            >
              {file.name}
            </Text>
            <Text
              style={[
                styles.fileSize,
                isMe ? styles.fileSizeMe : styles.fileSizeOther,
              ]}
            >
              {formatFileSize(file.size)}
            </Text>
          </View>
          <Ionicons
            name="download-outline"
            size={20}
            color={isMe ? "#FFFFFF" : colors.primary}
          />
        </TouchableOpacity>
      );
    }, [message.file, handleFileDownload, isMe, colors, styles]);

    const renderText = useCallback(() => {
      if (!message.text || message.poll) return null;
      return (
        <Text
          style={[
            styles.messageText,
            isMe ? styles.messageTextMe : styles.messageTextOther,
          ]}
        >
          {message.text}
        </Text>
      );
    }, [message.text, message.poll, isMe, styles]);

    const renderMeta = useCallback(() => {
      return (
        <View
          style={[
            styles.metaRow,
            isMe ? styles.metaRowMe : styles.metaRowOther,
          ]}
        >
          {message.edited && (
            <Text style={[styles.editedText, isMe ? styles.editedTextMe : styles.editedTextOther]}>
              modifié
            </Text>
          )}
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
            {formatTime(new Date(message.createdAt))}
          </Text>
        </View>
      );
    }, [message.edited, message.createdAt, isMe, styles]);

    const renderReactions = useCallback(() => {
      if (reactionEntries.length === 0) return null;

      return (
        <View
          style={[
            styles.reactionsRow,
            { justifyContent: isMe ? "flex-end" : "flex-start" },
          ]}
        >
          {reactionEntries.map(([emoji, users]) => {
            const isMineReaction = users.includes(currentUserId);
            const handlePress = () => onReactionPress(message._id, emoji);
            return (
              <TouchableOpacity
                key={emoji}
                onPress={handlePress}
                activeOpacity={0.75}
                style={[
                  styles.reactionPill,
                  isMineReaction && styles.reactionPillHighlighted,
                ]}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text
                  style={[
                    styles.reactionCount,
                    isMineReaction && styles.reactionCountHighlighted,
                  ]}
                >
                  {users.length}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={handleAddReaction}
            activeOpacity={0.75}
            style={styles.addReactionPill}
          >
            <Ionicons name="add" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      );
    }, [
      reactionEntries,
      isMe,
      currentUserId,
      message._id,
      handleAddReaction,
      onReactionPress,
      colors,
      styles,
    ]);

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
      <View>
        {/* Date separator */}
        {renderDateSeparator()}

        <Animated.View
          style={[styles.rowWrapper, { transform: [{ translateX }] }]}
          {...(panResponder ? panResponder.panHandlers : {})}
        >
          {/* Forwarded label */}
          {renderForwardedLabel()}

          {/* Username label (others, first in group) */}
          {renderUsernameLabel()}

          {/* Message row: avatar + bubble column */}
          <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
            {/* Avatar (others only) */}
            {renderAvatar()}

            {/* Bubble column */}
            <View
              style={[
                styles.bubbleColumn,
                isMe && styles.bubbleColumnMe,
              ]}
            >
              {/* Bubble */}
              <TouchableOpacity
                onLongPress={handleLongPress}
                activeOpacity={0.85}
                delayLongPress={350}
              >
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.bubbleMe : styles.bubbleOther,
                    bubbleTailStyle,
                  ]}
                >
                  {renderReplyQuote()}
                  {renderImage()}
                  {renderAudio()}
                  {renderPoll()}
                  {renderFile()}
                  {renderText()}
                  {renderMeta()}
                </View>
              </TouchableOpacity>

              {/* Reactions */}
              {renderReactions()}
            </View>
          </View>
        </Animated.View>
      </View>
    );
  }
);

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
