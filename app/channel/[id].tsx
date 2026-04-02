/**
 * Channel chat screen — Messenger/Instagram-style
 *
 * Uses custom MessageBubble + ChatInputBar components for a polished,
 * performant experience on both native and web.
 */

import { showToast } from "@/components/Toast";
import ChatInputBar from "@/components/chat/ChatInputBar";
import EmojiPickerSheet from "@/components/chat/EmojiPickerSheet";
import ForwardModal from "@/components/chat/ForwardModal";
import MessageActionModal, { MessageAction } from "@/components/chat/MessageActionModal";
import MessageBubble from "@/components/chat/MessageBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import type { ChatMessage, FileData, PollData, ReplyInfo } from "@/components/chat/types";
import { sendExpoPush } from "@/hooks/use-push-notifications";
import { useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import {
  uploadDocument,
  uploadImageBase64,
  uploadImageUri,
} from "@/lib/uploadToSupabase";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/contexts/ThemeContext";
import { db } from "../../firebaseConfig";

// ─── Notification helper ──────────────────────────────────────────────────────

async function notifyChannelMembers(
  channelId: string,
  channelName: string,
  senderName: string,
  senderUid: string,
  preview: string,
): Promise<void> {
  const channelSnap = await getDoc(doc(db, "channels", channelId));
  if (!channelSnap.exists()) return;
  const channelData = channelSnap.data();
  const audienceType = channelData.audienceType as "public" | "roles" | "private";

  let userDocs: { id: string; data: () => any }[] = [];
  if (audienceType === "private") {
    const members = (channelData.members as string[] | undefined) ?? [];
    const targets = members.filter((uid) => uid !== senderUid);
    if (!targets.length) return;
    userDocs = (await Promise.all(targets.map((uid) => getDoc(doc(db, "users", uid))))).filter(
      (s) => s.exists(),
    );
  } else if (audienceType === "roles") {
    const roles = channelData.allowedRoles as string[] | undefined;
    if (!roles?.length) return;
    userDocs = (await getDocs(query(collection(db, "users"), where("role", "in", roles)))).docs;
  } else {
    userDocs = (await getDocs(collection(db, "users"))).docs;
  }

  const tokenMap = new Map<string, string>();
  for (const d of userDocs) {
    if (d.id === senderUid) continue;
    const token = d.data().expoPushToken as string | undefined;
    if (token) tokenMap.set(token, d.id);
  }
  if (!tokenMap.size) return;

  const stale = (
    await Promise.all(
      [...tokenMap.keys()].map((token) =>
        sendExpoPush(token, channelName, `${senderName} : ${preview}`, {
          type: "message",
          channelId,
          channelName,
        }),
      ),
    )
  ).flat();

  if (stale.length) {
    await Promise.all(
      stale.map((token) => {
        const uid = tokenMap.get(token);
        if (!uid) return;
        return updateDoc(doc(db, "users", uid), { expoPushToken: deleteField() });
      }),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SCREEN
// ═════════════════════════════════════════════════════════════════════════════

export default function ChannelScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);

  // ── Auth & user profile ───────────────────────────────────────────────────
  const auth = getAuth();
  const user = auth.currentUser;
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserProfile(snap.data());
    });
  }, [user]);

  const currentUser = useMemo(
    () => ({
      _id: user?.uid ?? "anonyme",
      name: userProfile?.firstName
        ? `${userProfile.firstName} ${userProfile.lastName ?? ""}`.trim()
        : user?.displayName ?? "Utilisateur",
      avatar: user?.photoURL ?? null,
      avatarPreset: userProfile?.avatarPreset ?? null,
      role: userProfile?.role ?? "Membre",
    }),
    [user, userProfile],
  );

  // ── Messages ──────────────────────────────────────────────────────────────
  const PAGE_SIZE = 30;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<any>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // ── Typing indicator ──────────────────────────────────────────────────────
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, "channels", id, "messages"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE),
    );
    return onSnapshot(q, (snap) => {
      if (snap.docs.length < PAGE_SIZE) setHasMore(false);
      if (snap.docs.length > 0) cursorRef.current = snap.docs[snap.docs.length - 1];
      setMessages(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            _id: d.id,
            text: data.text ?? "",
            createdAt: data.createdAt?.toDate() ?? new Date(),
            user: {
              _id: data.user._id,
              name: data.user.name,
              avatar: data.user.avatar ?? null,
              avatarPreset: data.user.avatarPreset ?? null,
              role: data.user.role ?? "Membre",
            },
            image: data.image ?? null,
            audio: data.audio ?? null,
            poll: data.poll ?? null,
            file: data.file ?? null,
            replyTo: data.replyTo ?? null,
            reactions: data.reactions ?? {},
            edited: data.edited ?? false,
            forwarded: data.forwarded ?? false,
          } as ChatMessage;
        }),
      );
      setLoading(false);
    });
  }, [id]);

  // ── Load more (pagination) ────────────────────────────────────────────────
  const loadMoreMessages = useCallback(async () => {
    if (!id || loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "channels", id, "messages"),
        orderBy("createdAt", "desc"),
        startAfter(cursorRef.current),
        limit(PAGE_SIZE),
      );
      const snap = await getDocs(q);
      if (snap.docs.length < PAGE_SIZE) setHasMore(false);
      if (snap.docs.length > 0) cursorRef.current = snap.docs[snap.docs.length - 1];
      const older = snap.docs.map((d) => {
        const data = d.data();
        return {
          _id: d.id,
          text: data.text ?? "",
          createdAt: data.createdAt?.toDate() ?? new Date(),
          user: {
            _id: data.user._id,
            name: data.user.name,
            avatar: data.user.avatar ?? null,
            avatarPreset: data.user.avatarPreset ?? null,
            role: data.user.role ?? "Membre",
          },
          image: data.image ?? null,
          audio: data.audio ?? null,
          poll: data.poll ?? null,
          file: data.file ?? null,
          replyTo: data.replyTo ?? null,
          reactions: data.reactions ?? {},
          edited: data.edited ?? false,
          forwarded: data.forwarded ?? false,
        } as ChatMessage;
      });
      setMessages((prev) => [...prev, ...older]);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [id, loadingMore, hasMore]);

  // ── Typing: listen to channel doc ─────────────────────────────────────────
  useEffect(() => {
    if (!id || !user) return;
    return onSnapshot(doc(db, "channels", id), (snap) => {
      if (!snap.exists()) return;
      const typingUsers = snap.data().typingUsers as Record<string, any> | undefined;
      if (!typingUsers) {
        setTypingNames([]);
        return;
      }
      const now = Date.now();
      const staleThresholdMs = 6000;
      const activeNames: string[] = [];
      for (const [uid, ts] of Object.entries(typingUsers)) {
        if (uid === user.uid) continue;
        const tsMs = ts?.toMillis?.() ?? 0;
        if (now - tsMs < staleThresholdMs) {
          activeNames.push(uid); // We'll resolve names below
        }
      }
      // We just track UIDs for now and show count, actual names fetched from userProfile if available
      setTypingNames(activeNames.slice(0, 3)); // limit to 3
    });
  }, [id, user]);

  // ── Typing: publish own status ────────────────────────────────────────────
  const handleTyping = useCallback(() => {
    if (!id || !user) return;
    // Update typing status in Firestore
    updateDoc(doc(db, "channels", id), {
      [`typingUsers.${user.uid}`]: Timestamp.now(),
    }).catch(() => {}); // fire and forget
    // Auto-clear after 5 seconds of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, "channels", id), {
        [`typingUsers.${user.uid}`]: deleteField(),
      }).catch(() => {});
    }, 5000);
  }, [id, user]);

  // Clean up typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (id && user) {
        updateDoc(doc(db, "channels", id), {
          [`typingUsers.${user.uid}`]: deleteField(),
        }).catch(() => {});
      }
    };
  }, [id, user]);

  // ── Accessible channels (for forward) ────────────────────────────────────
  const [accessibleChannels, setAccessibleChannels] = useState<
    { id: string; name: string; audienceType?: string }[]
  >([]);

  useEffect(() => {
    if (!user || !userProfile) return;
    getDocs(collection(db, "channels")).then((snap) => {
      setAccessibleChannels(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((ch) => {
            if (ch.id === id) return false;
            if (ch.audienceType === "public") return true;
            if (ch.audienceType === "roles")
              return ch.allowedRoles?.includes(userProfile.role);
            if (ch.audienceType === "private")
              return ch.members?.includes(user.uid);
            return false;
          }),
      );
    });
  }, [user, userProfile, id]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Emoji picker
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);

  // Modals
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // Action modal
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionModalMessage, setActionModalMessage] = useState<ChatMessage | null>(null);
  const [actionModalActions, setActionModalActions] = useState<MessageAction[]>([]);

  // ── Core send to Firestore ────────────────────────────────────────────────
  const sendToFirestore = useCallback(
    async (
      text: string,
      imageUri?: string,
      poll?: any,
      file?: FileData,
      audioUrl?: string,
    ) => {
      const content = text.trim();
      if (!content && !imageUri && !poll && !file && !audioUrl) return;
      if (!id) return;

      // Edit mode — updateDoc only
      if (editingMessage) {
        setSending(true);
        try {
          await updateDoc(
            doc(db, "channels", id, "messages", editingMessage._id),
            { text: content, edited: true, editedAt: Timestamp.now() },
          );
          setEditingMessage(null);
        } catch {
          showToast("Modification échouée", "error");
        } finally {
          setSending(false);
        }
        return;
      }

      const replyData: ReplyInfo | null = replyToMessage
        ? {
            id: replyToMessage._id,
            text:
              replyToMessage.text ||
              (replyToMessage.audio ? "Message vocal" : "Photo"),
            userName: replyToMessage.user.name,
          }
        : null;
      setReplyToMessage(null);

      setSending(true);
      try {
        await addDoc(collection(db, "channels", id, "messages"), {
          text: content,
          createdAt: Timestamp.now(),
          user: currentUser,
          image: imageUri ?? null,
          poll: poll ?? null,
          file: file ?? null,
          audio: audioUrl ?? null,
          replyTo: replyData,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        const preview = poll
          ? poll.question
          : audioUrl
            ? "Message vocal"
            : content || "Photo";

        await updateDoc(doc(db, "channels", id), {
          lastMessage: file ? file.name : preview,
          lastMessageAt: Timestamp.now(),
        });

        notifyChannelMembers(
          id,
          name ?? id,
          currentUser.name,
          currentUser._id,
          preview,
        ).catch((e) => console.warn("[notify]", e));
      } catch {
        showToast("Message non envoyé", "error");
      } finally {
        setSending(false);
      }
    },
    [id, name, currentUser, editingMessage, replyToMessage],
  );

  // ── ChatInputBar callbacks ────────────────────────────────────────────────
  const handleSend = useCallback(
    (text: string) => sendToFirestore(text),
    [sendToFirestore],
  );

  const handleSendAudio = useCallback(
    (audioUrl: string) => sendToFirestore("", undefined, undefined, undefined, audioUrl),
    [sendToFirestore],
  );

  // Camera image from ChatInputBar — upload to Supabase then store URL
  const handleSendImage = useCallback(
    async (uri: string) => {
      if (!id) return;
      setSending(true);
      try {
        let imageUrl: string;
        if (uri.startsWith("data:")) {
          imageUrl = await uploadImageBase64(uri, id);
        } else {
          imageUrl = await uploadImageUri(uri, id);
        }
        await sendToFirestore("", imageUrl);
      } catch {
        showToast("Erreur upload image", "error");
      } finally {
        setSending(false);
      }
    },
    [id, sendToFirestore],
  );

  const handleOpenGallery = useCallback(async () => {
    if (!id) return;
    const opts: ImagePicker.ImagePickerOptions = { quality: 0.7 };
    const result = await ImagePicker.launchImageLibraryAsync(
      Platform.OS === "web" ? { ...opts, allowsEditing: false } : opts,
    );
    if (!result.canceled) {
      setSending(true);
      try {
        const imageUrl = await uploadImageUri(result.assets[0].uri, id);
        await sendToFirestore("", imageUrl);
      } catch {
        showToast("Erreur upload image", "error");
      } finally {
        setSending(false);
      }
    }
  }, [id, sendToFirestore]);

  const handleOpenPoll = useCallback(() => {
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollModalVisible(true);
  }, []);

  const handleOpenDocument = useCallback(async () => {
    if (!id) return;
    const { getDocumentAsync } = await import("expo-document-picker");
    const result = await getDocumentAsync({ type: "*/*" });
    if (!result.canceled) {
      const file = result.assets[0];
      setSending(true);
      try {
        const publicUrl = await uploadDocument(
          file.uri,
          file.name,
          id,
          file.mimeType ?? "application/octet-stream",
        );
        await sendToFirestore(file.name, undefined, undefined, {
          uri: publicUrl,
          name: file.name,
          size: file.size ?? 0,
        });
      } catch {
        showToast("Erreur upload document", "error");
      } finally {
        setSending(false);
      }
    }
  }, [id, sendToFirestore]);

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
    setEditingMessage(null);
  }, []);

  // ── MessageBubble callbacks ───────────────────────────────────────────────
  const handleLongPress = useCallback(
    (msg: ChatMessage) => {
      const isMe = msg.user._id === currentUser._id;
      const actions: MessageAction[] = [
        {
          id: "reply",
          label: "Répondre",
          icon: "arrow-undo-outline",
          style: "default",
          onPress: () => setReplyToMessage(msg),
        },
        {
          id: "forward",
          label: "Transférer",
          icon: "arrow-redo-outline",
          style: "default",
          onPress: () => {
            setForwardMessage(msg);
            setForwardModalVisible(true);
          },
        },
      ];

      if (isMe && msg.text && !msg.poll && !msg.audio) {
        actions.splice(1, 0, {
          id: "edit",
          label: "Modifier",
          icon: "pencil-outline",
          style: "default",
          onPress: () => setEditingMessage(msg),
        });
      }

      if (msg.image) {
        actions.push({
          id: "save",
          label: "Enregistrer l'image",
          icon: "download-outline",
          style: "default",
          onPress: () => handleSaveImage(msg.image!),
        });
      }

      if (isMe) {
        actions.push({
          id: "delete",
          label: "Supprimer",
          icon: "trash-outline",
          style: "destructive",
          onPress: () =>
            deleteDoc(doc(db, "channels", id!, "messages", msg._id)),
        });
      }

      // Copy available for text messages
      if (msg.text && !msg.poll) {
        actions.unshift({
          id: "copy",
          label: "Copier",
          icon: "copy-outline",
          style: "default" as const,
          onPress: () => {
            Clipboard.setStringAsync(msg.text).then(() =>
              showToast("Message copié", "success"),
            );
          },
        });
      }

      setActionModalMessage(msg);
      setActionModalActions(actions);
      setActionModalVisible(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser._id, id],
  );

  const handleReactionPress = useCallback(
    async (messageId: string, emoji: string) => {
      if (!id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const msgRef = doc(db, "channels", id, "messages", messageId);
      const snap = await getDoc(msgRef);
      if (!snap.exists()) return;
      const reactions: Record<string, string[]> = snap.data().reactions ?? {};
      const users = reactions[emoji] ?? [];
      reactions[emoji] = users.includes(currentUser._id)
        ? users.filter((u) => u !== currentUser._id)
        : [...users, currentUser._id];
      await updateDoc(msgRef, { reactions });
    },
    [id, currentUser._id],
  );

  const handleAddReaction = useCallback((messageId: string) => {
    setEmojiPickerFor(messageId);
  }, []);

  const handleModalReaction = useCallback(
    (emoji: string) => {
      if (actionModalMessage) {
        handleReactionPress(actionModalMessage._id, emoji);
      }
    },
    [actionModalMessage, handleReactionPress],
  );

  const handleModalOpenFullPicker = useCallback(() => {
    if (actionModalMessage) {
      setEmojiPickerFor(actionModalMessage._id);
    }
  }, [actionModalMessage]);

  const handleEmojiSelected = useCallback(
    (emoji: string) => {
      if (emojiPickerFor) handleReactionPress(emojiPickerFor, emoji);
      setEmojiPickerFor(null);
    },
    [emojiPickerFor, handleReactionPress],
  );

  const handleImagePress = useCallback((uri: string) => {
    setSelectedImage(uri);
  }, []);

  const handlePollVote = useCallback(
    async (messageId: string, poll: PollData, optionIndex: number) => {
      if (!id) return;
      const hasVoted = poll.options.some((o) =>
        o.voters.includes(currentUser._id),
      );
      if (hasVoted) {
        showToast("Vous avez déjà voté.", "info");
        return;
      }
      const updated = poll.options.map((o, i) =>
        i === optionIndex
          ? { ...o, voters: [...o.voters, currentUser._id] }
          : o,
      );
      await updateDoc(doc(db, "channels", id, "messages", messageId), {
        poll: { ...poll, options: updated },
      });
    },
    [id, currentUser._id],
  );

  const handleFileDownload = useCallback(
    async (fileUri: string, fileName: string) => {
      try {
        if (Platform.OS !== "web") {
          const localUri = (FileSystem.cacheDirectory ?? "") + fileName;
          const dl = FileSystem.createDownloadResumable(fileUri, localUri);
          const result = await dl.downloadAsync();
          if (result?.uri && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(result.uri);
          }
        } else {
          const a = document.createElement("a");
          a.href = fileUri;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch {
        showToast("Téléchargement impossible", "error");
      }
    },
    [],
  );

  // ── Image save ────────────────────────────────────────────────────────────
  const handleSaveImage = useCallback(async (imageUri: string) => {
    if (Platform.OS === "web") {
      const a = document.createElement("a");
      a.href = imageUri;
      a.download = `image_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("Image téléchargée", "success");
    } else {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          showToast("Permission galerie refusée", "error");
          return;
        }
        const localUri = (FileSystem.cacheDirectory ?? "") + `img_${Date.now()}.jpg`;
        if (imageUri.startsWith("data:")) {
          await FileSystem.writeAsStringAsync(localUri, imageUri.split(",")[1], {
            encoding: FileSystem.EncodingType.Base64,
          });
        } else {
          await FileSystem.downloadAsync(imageUri, localUri);
        }
        await MediaLibrary.saveToLibraryAsync(localUri);
        showToast("Image sauvegardée dans la galerie", "success");
      } catch {
        showToast("Erreur de sauvegarde", "error");
      }
    }
  }, []);

  // ── Forward ───────────────────────────────────────────────────────────────
  const handleForward = useCallback(
    async (targetChannelId: string) => {
      if (!forwardMessage) return;
      setForwardModalVisible(false);
      try {
        await addDoc(collection(db, "channels", targetChannelId, "messages"), {
          text: forwardMessage.text ?? "",
          createdAt: Timestamp.now(),
          user: currentUser,
          image: forwardMessage.image ?? null,
          audio: forwardMessage.audio ?? null,
          file: forwardMessage.file ?? null,
          poll: null,
          replyTo: null,
          forwarded: true,
        });
        await updateDoc(doc(db, "channels", targetChannelId), {
          lastMessage: forwardMessage.text || "Photo",
          lastMessageAt: Timestamp.now(),
        });
        showToast("Message transféré ✓", "success");
      } catch {
        showToast("Transfert échoué", "error");
      } finally {
        setForwardMessage(null);
      }
    },
    [forwardMessage, currentUser],
  );

  // ── Poll submit ───────────────────────────────────────────────────────────
  const handleSubmitPoll = useCallback(async () => {
    const validOptions = pollOptions.filter((o) => o.trim());
    if (!pollQuestion.trim()) {
      showToast("Veuillez entrer une question.", "error");
      return;
    }
    if (validOptions.length < 2) {
      showToast("Au moins 2 options requises.", "error");
      return;
    }
    setPollModalVisible(false);
    await sendToFirestore(pollQuestion.trim(), undefined, {
      question: pollQuestion.trim(),
      options: validOptions.map((o) => ({ text: o, voters: [] })),
      createdAt: new Date(),
      isActive: true,
    });
    setPollQuestion("");
    setPollOptions(["", ""]);
  }, [pollQuestion, pollOptions, sendToFirestore]);

  // ── Swipe reply ───────────────────────────────────────────────────────────
  const handleSwipeReply = useCallback((msg: ChatMessage) => {
    setReplyToMessage(msg);
  }, []);

  // ── FlatList renderItem ───────────────────────────────────────────────────
  // Messages are ordered newest-first (inverted FlatList), so:
  //   - previousMessage (visually above) = messages[index + 1]
  //   - nextMessage     (visually below) = messages[index - 1]
  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => (
      <MessageBubble
        message={item}
        previousMessage={messages[index + 1] ?? null}
        nextMessage={messages[index - 1] ?? null}
        currentUserId={currentUser._id}
        onLongPress={handleLongPress}
        onReactionPress={handleReactionPress}
        onAddReaction={handleAddReaction}
        onImagePress={handleImagePress}
        onPollVote={handlePollVote}
        onFileDownload={handleFileDownload}
        onSwipeReply={handleSwipeReply}
      />
    ),
    [
      messages,
      currentUser._id,
      handleLongPress,
      handleReactionPress,
      handleAddReaction,
      handleImagePress,
      handlePollVote,
      handleFileDownload,
      handleSwipeReply,
    ],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item._id, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.root, { backgroundColor: colors.surfaceDim }]}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
        enabled={Platform.OS !== "web"}
        keyboardVerticalOffset={Platform.select({ ios: 90, android: 80, default: 0 })}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            removeClippedSubviews={Platform.OS !== "web"}
            windowSize={10}
            maxToRenderPerBatch={12}
            updateCellsBatchingPeriod={30}
            initialNumToRender={20}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color={colors.primary} style={{ padding: 16 }} />
              ) : null
            }
            ListHeaderComponent={
              typingNames.length > 0 ? (
                <TypingIndicator typingNames={typingNames} />
              ) : null
            }
          />
        )}

        <ChatInputBar
          channelId={id ?? ""}
          replyToMessage={replyToMessage}
          editingMessage={editingMessage}
          onSend={handleSend}
          onSendAudio={handleSendAudio}
          onSendImage={handleSendImage}
          onOpenGallery={handleOpenGallery}
          onOpenPoll={handleOpenPoll}
          onOpenDocument={handleOpenDocument}
          onCancelReply={handleCancelReply}
          sending={sending}
          onTyping={handleTyping}
        />
      </KeyboardAvoidingView>

      {/* Image fullscreen viewer */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModal}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setSelectedImage(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={34} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && (
            <>
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.imageDownloadBtn}
                onPress={() => handleSaveImage(selectedImage)}
              >
                <Ionicons name="download-outline" size={20} color="#FFF" />
                <Text style={styles.imageDownloadText}>Enregistrer</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* Emoji picker */}
      <EmojiPickerSheet
        visible={emojiPickerFor !== null}
        onClose={() => setEmojiPickerFor(null)}
        onEmojiSelected={handleEmojiSelected}
      />

      {/* Forward modal */}
      <ForwardModal
        visible={forwardModalVisible}
        channels={accessibleChannels}
        onClose={() => setForwardModalVisible(false)}
        onForward={handleForward}
      />

      {/* Message action modal */}
      <MessageActionModal
        visible={actionModalVisible}
        actions={actionModalActions}
        onReaction={handleModalReaction}
        onOpenFullPicker={handleModalOpenFullPicker}
        onClose={() => setActionModalVisible(false)}
      />

      {/* Poll creation modal */}
      <Modal
        visible={pollModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPollModalVisible(false)}
      >
        <View style={styles.sheet}>
          <View style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              Créer un sondage
            </Text>

            <TextInput
              style={[styles.pollInput, { borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Votre question ?"
              placeholderTextColor={colors.textTertiary}
              value={pollQuestion}
              onChangeText={setPollQuestion}
            />

            {pollOptions.map((opt, i) => (
              <View key={i} style={styles.pollOptionRow}>
                <TextInput
                  style={[
                    styles.pollInput,
                    { flex: 1, marginBottom: 0, borderColor: colors.border, color: colors.textPrimary },
                  ]}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={colors.textTertiary}
                  value={opt}
                  onChangeText={(t) => {
                    const next = [...pollOptions];
                    next[i] = t;
                    setPollOptions(next);
                  }}
                />
                {pollOptions.length > 2 && (
                  <TouchableOpacity
                    onPress={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                    style={styles.pollRemoveBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#F44336" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {pollOptions.length < 6 && (
              <TouchableOpacity
                onPress={() => setPollOptions([...pollOptions, ""])}
                style={[styles.addOptionBtn, { backgroundColor: colors.surfaceDim }]}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={[styles.addOptionText, { color: colors.primary }]}>
                  Ajouter une option
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.pollActions}>
              <TouchableOpacity
                onPress={() => setPollModalVisible(false)}
                style={styles.pollCancelBtn}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitPoll}
                style={[styles.pollSubmitBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: "#FFF", fontWeight: "700" }}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    root: { flex: 1 },
    flex1: { flex: 1 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { paddingVertical: tokens.space.md },

    // Image modal
    imageModal: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.94)",
      justifyContent: "center",
      alignItems: "center",
    },
    imageModalClose: { position: "absolute", top: 52, right: 20, zIndex: 10 },
    fullImage: { width: "100%", height: "80%" },
    imageDownloadBtn: {
      position: "absolute",
      bottom: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(255,255,255,0.18)",
      paddingHorizontal: 20,
      paddingVertical: 11,
      borderRadius: 22,
    },
    imageDownloadText: { color: "#FFF", fontWeight: "600", fontSize: tokens.font.base },

    // Bottom sheet (poll)
    sheet: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
    sheetContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 40,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 20,
    },

    // Poll modal
    pollInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: tokens.font.md,
      marginBottom: 12,
    },
    pollOptionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
    },
    pollRemoveBtn: { padding: 2 },
    addOptionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 12,
      marginBottom: 16,
    },
    addOptionText: { fontSize: tokens.font.base, fontWeight: "600" },
    pollActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
    },
    pollCancelBtn: { paddingVertical: 11, paddingHorizontal: 16 },
    pollSubmitBtn: {
      paddingVertical: 11,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
  });
