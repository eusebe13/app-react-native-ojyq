import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { uploadAudio } from "@/lib/uploadToSupabase";
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
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ChatMessage } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChatInputBarProps {
  channelId: string;
  replyToMessage: ChatMessage | null;
  editingMessage: ChatMessage | null;
  onSend: (text: string) => void;
  onSendAudio: (audioUrl: string) => void;
  onSendImage: (base64Uri: string) => void;
  onOpenGallery: () => void;
  onOpenPoll: () => void;
  onOpenDocument: () => void;
  onCancelReply: () => void;
  onTyping: () => void;
  sending: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatInputBar({
  channelId,
  replyToMessage,
  editingMessage,
  onSend,
  onSendAudio,
  onSendImage,
  onOpenGallery,
  onOpenPoll,
  onOpenDocument,
  onCancelReply,
  onTyping,
  sending,
}: ChatInputBarProps) {
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);

  // -------------------------------------------------------------------------
  // Text input state
  // -------------------------------------------------------------------------

  const [text, setText] = useState("");
  const [inputHeight, setInputHeight] = useState(38);

  // -------------------------------------------------------------------------
  // Expandable action panel state & animations
  // -------------------------------------------------------------------------

  const [panelOpen, setPanelOpen] = useState(false);
  const panelAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (editingMessage !== null) {
      setText(editingMessage.text ?? "");
    } else {
      setText("");
    }
  }, [editingMessage]);

  // -------------------------------------------------------------------------
  // Recording state
  // -------------------------------------------------------------------------

  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Native recording ref
  const recordingRef = useRef<Audio.Recording | null>(null);
  // Web recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // Timer ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -------------------------------------------------------------------------
  // Pulsing dot animation
  // -------------------------------------------------------------------------

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  // -------------------------------------------------------------------------
  // Timer helpers
  // -------------------------------------------------------------------------

  const startTimer = useCallback(() => {
    setRecordingDuration(0);
    timerRef.current = setInterval(() => {
      setRecordingDuration((d) => d + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordingDuration(0);
  }, []);

  // -------------------------------------------------------------------------
  // Upload helper
  // -------------------------------------------------------------------------

  const uploadAudioBlob = useCallback(
    (blob: Blob, ext: "m4a" | "webm"): Promise<string> =>
      uploadAudio(blob, channelId, ext),
    [channelId],
  );

  // -------------------------------------------------------------------------
  // Native recording
  // -------------------------------------------------------------------------

  const startRecordingNative = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setIsRecording(true);
    startPulse();
    startTimer();
  }, [startPulse, startTimer]);

  const stopRecordingNative = useCallback(
    async (cancel: boolean) => {
      const recording = recordingRef.current;
      if (!recording) return;

      stopPulse();
      stopTimer();
      setIsRecording(false);
      recordingRef.current = null;

      await recording.stopAndUnloadAsync();

      if (cancel) return;

      const uri = recording.getURI();
      if (!uri) return;

      setIsUploading(true);
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const url = await uploadAudioBlob(blob, "m4a");
        onSendAudio(url);
      } finally {
        setIsUploading(false);
      }
    },
    [stopPulse, stopTimer, uploadAudioBlob, onSendAudio]
  );

  // -------------------------------------------------------------------------
  // Web recording
  // -------------------------------------------------------------------------

  const startRecordingWeb = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunksRef.current = [];
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    startPulse();
    startTimer();
  }, [startPulse, startTimer]);

  const stopRecordingWeb = useCallback(
    (cancel: boolean) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return;

      stopPulse();
      stopTimer();
      setIsRecording(false);

      recorder.onstop = async () => {
        // Stop all tracks to release microphone
        recorder.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current = null;

        if (cancel) return;

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];

        setIsUploading(true);
        try {
          const url = await uploadAudioBlob(blob, "webm");
          onSendAudio(url);
        } finally {
          setIsUploading(false);
        }
      };

      recorder.stop();
    },
    [stopPulse, stopTimer, uploadAudioBlob, onSendAudio]
  );

  // -------------------------------------------------------------------------
  // Unified recording controls
  // -------------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    if (Platform.OS !== "web") {
      await startRecordingNative();
    } else {
      await startRecordingWeb();
    }
  }, [startRecordingNative, startRecordingWeb]);

  const stopRecording = useCallback(async () => {
    if (Platform.OS !== "web") {
      await stopRecordingNative(false);
    } else {
      stopRecordingWeb(false);
    }
  }, [stopRecordingNative, stopRecordingWeb]);

  const cancelRecording = useCallback(async () => {
    if (Platform.OS !== "web") {
      await stopRecordingNative(true);
    } else {
      stopRecordingWeb(true);
    }
  }, [stopRecordingNative, stopRecordingWeb]);

  // -------------------------------------------------------------------------
  // Send handler
  // -------------------------------------------------------------------------

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !editingMessage) return;
    onSend(trimmed);
    setText("");
  }, [text, editingMessage, onSend]);

  // -------------------------------------------------------------------------
  // Camera handler
  // -------------------------------------------------------------------------

  // Web hidden file input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCameraNative = useCallback(async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return;

    // No base64 — use the local file URI directly; uploadImageUri fetches it as a blob
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });

    if (result.canceled) return;
    onSendImage(result.assets[0].uri);
  }, [onSendImage]);

  const handleCameraWeb = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleWebFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        onSendImage(result);
      };
      reader.readAsDataURL(file);
      // Reset so same file can be selected again
      e.target.value = "";
    },
    [onSendImage]
  );

  const handleCamera = useCallback(() => {
    if (Platform.OS !== "web") {
      handleCameraNative();
    } else {
      handleCameraWeb();
    }
  }, [handleCameraNative, handleCameraWeb]);

  // -------------------------------------------------------------------------
  // Action panel toggle
  // -------------------------------------------------------------------------

  const handlePlusPress = useCallback(() => {
    const toValue = panelOpen ? 0 : 1;
    setPanelOpen(!panelOpen);
    Animated.parallel([
      Animated.spring(panelAnim, {
        toValue,
        tension: 200,
        friction: 20,
        useNativeDriver: false, // height animation needs false
      }),
      Animated.spring(rotateAnim, {
        toValue,
        tension: 200,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();
  }, [panelOpen, panelAnim, rotateAnim]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    Animated.parallel([
      Animated.spring(panelAnim, { toValue: 0, tension: 200, friction: 20, useNativeDriver: false }),
      Animated.spring(rotateAnim, { toValue: 0, tension: 200, friction: 20, useNativeDriver: true }),
    ]).start();
  }, [panelAnim, rotateAnim]);

  // -------------------------------------------------------------------------
  // Panel action callbacks
  // -------------------------------------------------------------------------

  const handleGalleryAction = useCallback(() => {
    closePanel();
    onOpenGallery();
  }, [closePanel, onOpenGallery]);

  const handlePollAction = useCallback(() => {
    closePanel();
    onOpenPoll();
  }, [closePanel, onOpenPoll]);

  const handleDocumentAction = useCallback(() => {
    closePanel();
    onOpenDocument();
  }, [closePanel, onOpenDocument]);

  const handleCameraAction = useCallback(() => {
    closePanel();
    handleCamera();
  }, [closePanel, handleCamera]);

  // -------------------------------------------------------------------------
  // Animated interpolations
  // -------------------------------------------------------------------------

  const panelHeight = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 88],
  });
  const panelOpacity = panelAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.7, 1],
  });
  const plusRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  // -------------------------------------------------------------------------
  // Derived flags
  // -------------------------------------------------------------------------

  const showSendButton = text.trim().length > 0 || editingMessage !== null;
  const showReplyBar = replyToMessage !== null || editingMessage !== null;

  const replyBarName = editingMessage
    ? "Modifier le message"
    : replyToMessage
    ? replyToMessage.user.name
    : "";

  const replyBarText = editingMessage
    ? (editingMessage.text ?? "")
    : replyToMessage
    ? (replyToMessage.text ?? "")
    : "";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={styles.wrapper}>
      {/* ------------------------------------------------------------------ */}
      {/* Expandable action panel                                             */}
      {/* ------------------------------------------------------------------ */}
      <Animated.View style={[styles.actionPanel, { height: panelHeight, opacity: panelOpacity }]}>
        <View style={styles.actionPanelRow}>
          {[
            { icon: "camera-outline" as const, label: "Caméra", onPress: handleCameraAction },
            { icon: "image-outline" as const, label: "Galerie", onPress: handleGalleryAction },
            { icon: "bar-chart-outline" as const, label: "Sondage", onPress: handlePollAction },
            { icon: "document-attach-outline" as const, label: "Document", onPress: handleDocumentAction },
          ].map(({ icon, label, onPress }) => (
            <TouchableOpacity
              key={label}
              style={styles.actionPanelBtn}
              onPress={onPress}
              activeOpacity={0.75}
            >
              <View style={styles.actionPanelBtnCircle}>
                <Ionicons name={icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.actionPanelBtnLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* ------------------------------------------------------------------ */}
      {/* Reply / Edit preview bar                                            */}
      {/* ------------------------------------------------------------------ */}
      {showReplyBar && (
        <View style={styles.replyBar}>
          <View style={styles.replyStripe} />
          <View style={styles.replyContent}>
            <Text style={styles.replyName} numberOfLines={1}>
              {replyBarName}
            </Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {replyBarText}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCancelReply}
            style={styles.replyClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Recording bar                                                        */}
      {/* ------------------------------------------------------------------ */}
      {isRecording ? (
        <View style={styles.inputRow}>
          {/* Pulsing dot */}
          <Animated.View
            style={[styles.recordingDot, { opacity: pulseAnim }]}
          />

          {/* Timer */}
          <Text style={styles.recordingTimer}>
            {formatDuration(recordingDuration)}
          </Text>

          {/* Label */}
          <Text style={styles.recordingLabel}>Enregistrement…</Text>

          {/* Cancel / trash */}
          <TouchableOpacity
            onPress={cancelRecording}
            style={styles.iconButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="trash" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Stop / send */}
          <TouchableOpacity
            onPress={stopRecording}
            style={[styles.circleButton, styles.recordingStop]}
          >
            <Ionicons name="stop" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        /* ----------------------------------------------------------------- */
        /* Normal input bar                                                   */
        /* ----------------------------------------------------------------- */
        <View style={styles.inputRow}>
          {/* Plus button — rotates to × when panel is open */}
          <TouchableOpacity
            onPress={handlePlusPress}
            style={[styles.circleButton, { backgroundColor: colors.primaryTint }]}
            activeOpacity={0.75}
          >
            <Animated.View style={{ transform: [{ rotate: plusRotate }] }}>
              <Ionicons name="add" size={22} color={colors.primary} />
            </Animated.View>
          </TouchableOpacity>

          {/* Hidden web file input for camera capture */}
          {Platform.OS === "web" && (
            // @ts-ignore – web-only element
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={handleWebFileChange}
            />
          )}

          {/* Text input */}
          <TextInput
            style={[styles.textInput, { height: inputHeight }]}
            value={text}
            onChangeText={(t) => {
              setText(t);
              if (t.length > 0) onTyping();
            }}
            onContentSizeChange={(e) => {
              const h = e.nativeEvent.contentSize.height;
              setInputHeight(Math.min(Math.max(38, h), 120));
            }}
            placeholder="Message…"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={4000}
          />

          {/* Send or Mic button */}
          {isUploading ? (
            <View style={[styles.circleButton, styles.sendButton]}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          ) : showSendButton ? (
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending}
              style={[
                styles.circleButton,
                styles.sendButton,
                { backgroundColor: colors.primary },
              ]}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={startRecording}
              style={[
                styles.circleButton,
                { backgroundColor: colors.primaryTint },
              ]}
            >
              <Ionicons name="mic" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function getStyles(colors: any, tokens: any) {
  return StyleSheet.create({
    // Container
    wrapper: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingBottom: Platform.OS === "ios" ? 0 : 4,
    },

    // -------------------------------------------------------------------------
    // Expandable action panel
    // -------------------------------------------------------------------------
    actionPanel: {
      overflow: "hidden",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    actionPanelRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 12,
      alignItems: "flex-start",
    },
    actionPanelBtn: {
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    actionPanelBtnCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    actionPanelBtnLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: "500",
      textAlign: "center",
    },

    // -------------------------------------------------------------------------
    // Reply / Edit bar
    // -------------------------------------------------------------------------
    replyBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingVertical: 6,
      paddingRight: 12,
    },
    replyStripe: {
      width: 3,
      alignSelf: "stretch",
      backgroundColor: colors.primary,
      marginRight: 10,
      borderRadius: 2,
    },
    replyContent: {
      flex: 1,
      justifyContent: "center",
    },
    replyName: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
      marginBottom: 1,
    },
    replyText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    replyClose: {
      paddingLeft: 8,
    },

    // -------------------------------------------------------------------------
    // Input row (shared by both normal and recording bars)
    // -------------------------------------------------------------------------
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: tokens.space.sm,
      paddingVertical: tokens.space.sm,
      gap: 6,
    },

    // -------------------------------------------------------------------------
    // Buttons
    // -------------------------------------------------------------------------
    circleButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    sendButton: {
      // backgroundColor set inline via colors.primary
    },
    iconButton: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
    },

    // -------------------------------------------------------------------------
    // TextInput
    // -------------------------------------------------------------------------
    textInput: {
      flex: 1,
      borderRadius: 22,
      backgroundColor: colors.surfaceDim,
      color: colors.textPrimary,
      fontSize: tokens.font.md,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "ios" ? 10 : 9,
      paddingBottom: Platform.OS === "ios" ? 10 : 9,
      minHeight: 38,
      lineHeight: 20,
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
    },

    // -------------------------------------------------------------------------
    // Recording bar
    // -------------------------------------------------------------------------
    recordingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#F44336",
      marginBottom: 14,
      flexShrink: 0,
    },
    recordingTimer: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 10,
      marginLeft: 2,
    },
    recordingLabel: {
      flex: 1,
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      marginBottom: 10,
      marginLeft: 6,
    },
    recordingStop: {
      backgroundColor: "#F44336",
    },
  });
}
