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
import { useReadState } from "@/hooks/use-read-state";
import { useWriteReadReceipt } from "@/hooks/use-read-receipts";
import { router, useLocalSearchParams } from "expo-router";
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
  setDoc,
  serverTimestamp,
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
  deleteFromR2,
  uploadDocument,
  uploadImageBase64,
  uploadImageUri,
} from "@/lib/uploadToR2";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/contexts/ThemeContext";
import { db } from "../../firebaseConfig";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

// ─── Notification helper ──────────────────────────────────────────────────────

async function notifyChannelMembers(
  channelId: string,
  channelName: string,
  senderName: string,
  senderUid: string,
  preview: string,
  messageId: string,
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
    userDocs = (
      await getDocs(
        query(collection(db, "users"), where("status", "!=", "Arrêt")),
      )
    ).docs;
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
        sendExpoPush(
          token,
          channelName,
          `${senderName} : ${preview}`,
          { type: "message", channelId, channelName, messageId },
          "message-actions",
        ),
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
  const { id, name, isDM } = useLocalSearchParams<{ id: string; name: string; isDM?: string }>();
  const isDirectMessage = isDM === "1";
  const { colors, tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);

  useReadState(id, "channel");
  useWriteReadReceipt(id);

  // ── Channel color + initials (consistent with chat list) ─────────────────
  const channelPalette = [colors.primary, colors.accent1, colors.accent2, colors.accent3, colors.accent4];
  const channelColor = (() => {
    const n = name ?? "Canal";
    let h = 0;
    for (const c of n) h = (h * 31 + c.charCodeAt(0)) % channelPalette.length;
    return channelPalette[Math.abs(h)];
  })();
  const channelInitials = (name ?? "Canal")
    .split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("");

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

  // ── Channel doc (info panel) ──────────────────────────────────────────────
  const [channelDoc, setChannelDoc] = useState<any>(null);
  const [infoPanelVisible, setInfoPanelVisible] = useState(false);
  const [channelMembersData, setChannelMembersData] = useState<any[]>([]);

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
          projectLink: data.projectLink ?? null,
        } as ChatMessage;
      });
      setMessages((prev) => [...prev, ...older]);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [id, loadingMore, hasMore]);

  // ── Typing + channel doc: single snapshot ────────────────────────────────
  useEffect(() => {
    if (!id || !user) return;
    return onSnapshot(doc(db, "channels", id), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setChannelDoc(data);

      const typingUsers = data.typingUsers as Record<string, any> | undefined;
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
          activeNames.push(uid);
        }
      }
      setTypingNames(activeNames.slice(0, 3));
    });
  }, [id, user]);

  // ── Fetch member profiles for info panel ─────────────────────────────────
  useEffect(() => {
    if (!channelDoc) return;
    const type = channelDoc.audienceType as string;
    if (type === "private" || type === "direct") {
      const members: string[] = channelDoc.members ?? [];
      if (!members.length) { setChannelMembersData([]); return; }
      Promise.all(members.map((uid) => getDoc(doc(db, "users", uid)))).then(
        (snaps) => {
          setChannelMembersData(
            snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() })),
          );
        },
      );
    } else if (type === "roles") {
      const roles: string[] = channelDoc.allowedRoles ?? [];
      const q = roles.length
        ? query(collection(db, "users"), where("role", "in", roles), where("status", "!=", "Arrêt"))
        : query(collection(db, "users"), where("status", "!=", "Arrêt"));
      getDocs(q).then((snap) =>
        setChannelMembersData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      );
    } else {
      getDocs(query(collection(db, "users"), where("status", "!=", "Arrêt"))).then((snap) =>
        setChannelMembersData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      );
    }
  }, [channelDoc]);

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

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const searchInputRef = useRef<TextInput>(null);
  const searchBarAnim = useRef(new Animated.Value(0)).current;

  // Animate the search bar in/out
  useEffect(() => {
    Animated.timing(searchBarAnim, {
      toValue: searchActive ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      if (searchActive) searchInputRef.current?.focus();
    });
    if (!searchActive) {
      setSearchQuery("");
      setSearchMatchIndex(0);
    }
  }, [searchActive, searchBarAnim]);

  // Compute matches — indices into `messages` (newest-first order)
  const searchMatches = useMemo(() => {
    const q = (searchQuery ?? "").trim().toLowerCase();
    if (!q) return [];
    return messages
      .map((msg, index) => ({ index, id: msg._id }))
      .filter(({ index }) => (messages[index].text ?? "").toLowerCase().includes(q));
  }, [searchQuery, messages]);

  // Scroll to the focused match whenever index changes
  useEffect(() => {
    if (!searchMatches.length) return;
    const safeIdx = Math.min(searchMatchIndex, searchMatches.length - 1);
    try {
      flatListRef.current?.scrollToIndex({ index: searchMatches[safeIdx].index, animated: true });
    } catch {
      // ignore if not rendered yet
    }
  }, [searchMatchIndex, searchMatches]);

  const handleSearchNext = useCallback(() => {
    if (!searchMatches.length) return;
    setSearchMatchIndex((i) => (i + 1) % searchMatches.length);
  }, [searchMatches.length]);

  const handleSearchPrev = useCallback(() => {
    if (!searchMatches.length) return;
    setSearchMatchIndex((i) => (i - 1 + searchMatches.length) % searchMatches.length);
  }, [searchMatches.length]);

  // Reset match cursor when query changes
  useEffect(() => {
    setSearchMatchIndex(0);
  }, [searchQuery]);

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

  // ── Info panel: full media/link fetch ────────────────────────────────────
  const [allMediaMessages, setAllMediaMessages] = useState<ChatMessage[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaTab, setMediaTab] = useState<"images" | "fichiers" | "liens">("images");

  useEffect(() => {
    if (!infoPanelVisible || !id) return;
    setMediaLoading(true);
    getDocs(
      query(
        collection(db, "channels", id, "messages"),
        orderBy("createdAt", "desc"),
        limit(300),
      ),
    )
      .then((snap) => {
        setAllMediaMessages(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              _id: d.id,
              text: data.text ?? "",
              createdAt: data.createdAt?.toDate() ?? new Date(),
              user: { _id: data.user._id, name: data.user.name },
              image: data.image ?? null,
              audio: data.audio ?? null,
              file: data.file ?? null,
              poll: data.poll ?? null,
              reactions: {},
              edited: false,
              forwarded: false,
            } as ChatMessage;
          }),
        );
      })
      .catch(() => {})
      .finally(() => setMediaLoading(false));
  }, [infoPanelVisible, id]);

  const allImages = useMemo(
    () => allMediaMessages.filter((m) => m.image),
    [allMediaMessages],
  );
  const allFilesAndAudio = useMemo(
    () => allMediaMessages.filter((m) => m.file || m.audio),
    [allMediaMessages],
  );
  const allLinks = useMemo(() => {
    const links: { messageId: string; url: string; senderName: string }[] = [];
    for (const m of allMediaMessages) {
      if (!m.text) continue;
      const matches = m.text.match(/(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g);
      if (matches) {
        for (const url of matches) {
          links.push({ messageId: m._id, url, senderName: m.user.name });
        }
      }
    }
    return links;
  }, [allMediaMessages]);

  const pollMessages = useMemo(
    () => messages.filter((m) => m.poll),
    [messages],
  );

  // ── Navigate to a message in the chat list ────────────────────────────────
  const handleGoToMessage = useCallback(
    (messageId: string) => {
      setInfoPanelVisible(false);
      const idx = messages.findIndex((m) => m._id === messageId);
      setTimeout(() => {
        if (idx !== -1) {
          flatListRef.current?.scrollToIndex({ index: idx, animated: true });
        } else {
          showToast("Message non chargé dans la vue actuelle", "info");
        }
      }, 350);
    },
    [messages],
  );

  // ── Open a URL in the system browser ─────────────────────────────────────
  const handleOpenLink = useCallback(async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else showToast("Impossible d'ouvrir ce lien", "error");
    } catch {
      showToast("Impossible d'ouvrir ce lien", "error");
    }
  }, []);

  // ── Open (or create) a DM from the info panel ─────────────────────────────
  const handleOpenDMWithMember = useCallback(
    async (memberId: string, memberName: string, memberAvatar?: string | null) => {
      if (!user?.uid || memberId === user.uid) return;
      const myUid = user.uid;
      const dmId = "dm_" + [myUid, memberId].sort().join("_");
      const myName = userProfile
        ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() || "Moi"
        : "Moi";
      try {
        const dmSnap = await getDoc(doc(db, "channels", dmId));
        if (!dmSnap.exists()) {
          await setDoc(doc(db, "channels", dmId), {
            name: "dm",
            type: "private",
            audienceType: "direct",
            members: [myUid, memberId],
            dmParticipants: {
              [myUid]: { name: myName, avatar: userProfile?.avatarPreset ?? null },
              [memberId]: { name: memberName, avatar: memberAvatar ?? null },
            },
            createdAt: Timestamp.now(),
            createdBy: myUid,
            lastMessage: "",
            lastMessageAt: Timestamp.now(),
          });
        }
        setInfoPanelVisible(false);
        router.push(`/channel/${dmId}?name=${encodeURIComponent(memberName)}&isDM=1`);
      } catch {
        showToast("Impossible d'ouvrir la conversation", "error");
      }
    },
    [user, userProfile, router],
  );

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
        const msgRef = await addDoc(collection(db, "channels", id, "messages"), {
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
          msgRef.id,
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

  const handleDeleteMessage = useCallback(
    async (msg: ChatMessage) => {
      if (!id) return;
      await deleteDoc(doc(db, "channels", id, "messages", msg._id));
      // Clean up R2 media — non-blocking, FIFO may have already removed it
      const r2Path = (url: string) => url.split(".r2.dev/")[1];
      if (msg.image) deleteFromR2(r2Path(msg.image) ?? msg.image).catch(() => {});
      if (msg.audio) deleteFromR2(r2Path(msg.audio) ?? msg.audio).catch(() => {});
      if (msg.file)  deleteFromR2(r2Path(msg.file.uri) ?? msg.file.uri).catch(() => {});
    },
    [id],
  );

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
          onPress: () => handleDeleteMessage(msg),
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
      const uid = currentUser._id;
      const previousIndex = poll.options.findIndex((o) => o.voters.includes(uid));
      let updated: typeof poll.options;
      if (previousIndex === optionIndex) {
        // Same option tapped → cancel vote
        updated = poll.options.map((o, i) =>
          i === optionIndex
            ? { ...o, voters: o.voters.filter((v) => v !== uid) }
            : o,
        );
      } else {
        // Different option (or first vote) → move / add vote
        updated = poll.options.map((o, i) => {
          if (i === previousIndex) return { ...o, voters: o.voters.filter((v) => v !== uid) };
          if (i === optionIndex) return { ...o, voters: [...o.voters, uid] };
          return o;
        });
      }
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
  const activeSearchMatchId = searchMatches[searchMatchIndex]?.id ?? null;

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
        searchQuery={searchActive ? searchQuery : ""}
        isSearchFocus={searchActive && item._id === activeSearchMatchId}
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
      searchActive,
      searchQuery,
      activeSearchMatchId,
    ],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item._id, []);

  // ── ChannelInfoPanel callbacks ────────────────────────────────────────────

  const handleScrollToMessage = useCallback((messageId: string) => {
    const index = messages.findIndex((m) => m._id === messageId);
    if (index === -1) return;
    try {
      flatListRef.current?.scrollToIndex({ index, animated: true });
    } catch {
      flatListRef.current?.scrollToOffset({ offset: index * 80, animated: true });
    }
  }, [messages]);

  const handleStartDm = useCallback(async (member: { id: string; name: string }) => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "channels"),
        where("audienceType", "==", "private"),
        where("type", "==", "direct"),
        where("members", "array-contains", user.uid),
      );
      const snap = await getDocs(q);
      const existing = snap.docs.find((d) => (d.data().members as string[]).includes(member.id));
      if (existing) {
        router.push(`/channel/${existing.id}?name=${encodeURIComponent(member.name)}`);
      } else {
        const ref = await addDoc(collection(db, "channels"), {
          name: member.name,
          audienceType: "private",
          type: "direct",
          members: [user.uid, member.id],
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          lastMessage: "",
        });
        router.push(`/channel/${ref.id}?name=${encodeURIComponent(member.name)}`);
      }
    } catch {
      showToast("Impossible d'ouvrir la conversation", "error");
    }
  }, [user]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.root, { backgroundColor: colors.chatBackground }]}>
      {/* Custom header */}
      <View style={[styles.customHeader, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight, paddingTop: insets.top, height: 62 + insets.top }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.headerBack}
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>

        {/* Center: avatar + name + subtitle — tappable → info panel */}
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => setInfoPanelVisible(true)}
          activeOpacity={0.75}
        >
          <View style={[styles.headerAvatar, { backgroundColor: channelColor + "22" }]}>
            <Text style={[styles.headerAvatarText, { color: channelColor }]}>
              {channelInitials}
            </Text>
          </View>
          <View style={styles.headerTitleGroup}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {name ?? "Canal"}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
              {isDirectMessage ? "Message direct" : "Canal de discussion"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} style={{ marginRight: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSearchActive((v) => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.headerAction}
        >
          <Ionicons
            name={searchActive ? "close" : "search-outline"}
            size={22}
            color={searchActive ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      {searchActive && (
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} style={{ marginLeft: 12 }} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Rechercher dans la conversation..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchNext}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Text style={[styles.searchCount, { color: colors.textSecondary }]}>
              {searchMatches.length > 0
                ? `${searchMatchIndex + 1}/${searchMatches.length}`
                : "0"}
            </Text>
          )}
          {searchMatches.length > 1 && (
            <>
              <TouchableOpacity onPress={handleSearchPrev} style={styles.searchNavBtn} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <Ionicons name="chevron-up" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSearchNext} style={styles.searchNavBtn} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <Ionicons name="chevron-down" size={20} color={colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
        enabled={Platform.OS !== "web"}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0, default: 0 })}
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
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 64 }}>
                <Ionicons name="chatbubbles-outline" size={52} color={colors.textTertiary} />
                <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: "600", marginTop: 14 }}>
                  Commencez la conversation
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 4 }}>
                  Envoyez le premier message !
                </Text>
              </View>
            }
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

      {/* ── Channel Info Panel ──────────────────────────────────────────────── */}
      <Modal
        visible={infoPanelVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoPanelVisible(false)}
      >
        {/* Backdrop tap → close */}
        <TouchableOpacity
          style={styles.sheet}
          activeOpacity={1}
          onPress={() => setInfoPanelVisible(false)}
        >
          {/* Inner sheet — absorbs touches so backdrop doesn't fire */}
          <View
            style={[styles.infoPanelSheet, { backgroundColor: colors.surface }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              {/* Avatar + name */}
              <View style={styles.infoPanelHeader}>
                <View style={[styles.infoPanelAvatar, { backgroundColor: channelColor + "22" }]}>
                  <Text style={[styles.infoPanelAvatarText, { color: channelColor }]}>
                    {channelInitials}
                  </Text>
                </View>
                <Text style={[styles.infoPanelTitle, { color: colors.textPrimary }]}>
                  {name ?? "Canal"}
                </Text>
                {isDirectMessage ? (
                  <Text style={[styles.infoPanelBadge, { color: colors.primary, backgroundColor: colors.primaryTint }]}>
                    Message direct
                  </Text>
                ) : (
                  <Text style={[styles.infoPanelBadge, { color: colors.textSecondary, backgroundColor: colors.surfaceDim }]}>
                    {channelDoc?.audienceType === "public"
                      ? "Public"
                      : channelDoc?.audienceType === "roles"
                      ? "Par rôle"
                      : "Privé"}
                  </Text>
                )}
              </View>

              {/* Description */}
              {channelDoc?.description ? (
                <View style={[styles.infoPanelSection, { borderColor: colors.borderLight }]}>
                  <Text style={[styles.infoPanelSectionTitle, { color: colors.textSecondary }]}>
                    Description
                  </Text>
                  <Text style={[styles.infoPanelDesc, { color: colors.textPrimary }]}>
                    {channelDoc.description}
                  </Text>
                </View>
              ) : null}

              {/* Members — tappable → start DM */}
              {channelMembersData.length > 0 && (
                <View style={[styles.infoPanelSection, { borderColor: colors.borderLight }]}>
                  <Text style={[styles.infoPanelSectionTitle, { color: colors.textSecondary }]}>
                    {isDirectMessage ? "Participants" : `Membres (${channelMembersData.length})`}
                  </Text>
                  {channelMembersData.map((m) => {
                    const fullName =
                      `${m.firstName || ""} ${m.lastName || ""}`.trim() ||
                      m.email ||
                      "Inconnu";
                    const isMe = m.id === user?.uid;
                    const memberPhone: string | undefined = m.phoneNumber || undefined;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.infoPanelMemberRow}
                        onPress={() =>
                          !isMe &&
                          handleOpenDMWithMember(m.id, fullName, m.avatarPreset ?? null)
                        }
                        activeOpacity={isMe ? 1 : 0.7}
                      >
                        <View style={[styles.infoPanelMemberAvatar, { backgroundColor: channelColor + "22" }]}>
                          <Text style={[styles.infoPanelMemberInitials, { color: channelColor }]}>
                            {fullName.split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("")}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.infoPanelMemberName, { color: colors.textPrimary }]}>
                            {fullName}{isMe ? " (vous)" : ""}
                          </Text>
                          {m.role ? (
                            <Text style={[styles.infoPanelMemberRole, { color: colors.textTertiary }]}>
                              {m.role}
                            </Text>
                          ) : null}
                        </View>
                        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                          {!isMe && m.email ? (
                            <TouchableOpacity
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              onPress={(e) => {
                                e.stopPropagation?.();
                                Linking.openURL(`mailto:${m.email}`).catch(() => {});
                              }}
                            >
                              <Ionicons name="mail-outline" size={16} color={colors.primary} />
                            </TouchableOpacity>
                          ) : null}
                          {!isMe && memberPhone ? (
                            <TouchableOpacity
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              onPress={(e) => {
                                e.stopPropagation?.();
                                Linking.openURL(`tel:${memberPhone}`).catch(() => {});
                              }}
                            >
                              <Ionicons name="call-outline" size={16} color={colors.primary} />
                            </TouchableOpacity>
                          ) : null}
                          {!isMe && (
                            <Ionicons name="chatbubble-outline" size={16} color={colors.textTertiary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {channelMembersData.some((m) => m.email) && (
                    <TouchableOpacity
                      onPress={() => {
                        const isAdminUser = ["Administrateur", "Admin", "Président", "Vice-Président"].includes(
                          userProfile?.role ?? "",
                        );
                        const emails = channelMembersData.map((m) => m.email).filter(Boolean) as string[];
                        if (!emails.length) return;
                        const field = isAdminUser ? "to" : "bcc";
                        Linking.openURL(`mailto:?${field}=${emails.join(",")}`).catch(() => {});
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        marginTop: 8,
                        paddingVertical: 10,
                        backgroundColor: colors.primary + "18",
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.primary + "40",
                      }}
                    >
                      <Ionicons name="mail-outline" size={16} color={colors.primary} />
                      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                        Contacter tous les membres
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* ── Médias & Liens : tabs ──────────────────────────────────────── */}
              <View style={[styles.infoPanelSection, { borderColor: colors.borderLight }]}>
                {/* Tab bar */}
                <View style={[styles.mediaTabs, { borderColor: colors.borderLight }]}>
                  {(["images", "fichiers", "liens"] as const).map((tab) => {
                    const count =
                      tab === "images"
                        ? allImages.length
                        : tab === "fichiers"
                        ? allFilesAndAudio.length
                        : allLinks.length;
                    const label =
                      tab === "images" ? "Images" : tab === "fichiers" ? "Fichiers" : "Liens";
                    const active = mediaTab === tab;
                    return (
                      <TouchableOpacity
                        key={tab}
                        style={[
                          styles.mediaTabBtn,
                          active && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                        ]}
                        onPress={() => setMediaTab(tab)}
                      >
                        <Text style={[styles.mediaTabText, { color: active ? colors.primary : colors.textSecondary }]}>
                          {label}
                          {!mediaLoading && count > 0 ? ` (${count})` : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {mediaLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                ) : (
                  <>
                    {/* Images */}
                    {mediaTab === "images" && (
                      allImages.length === 0 ? (
                        <Text style={[styles.mediaEmptyText, { color: colors.textTertiary }]}>
                          Aucune image
                        </Text>
                      ) : (
                        <View style={styles.mediaGrid}>
                          {allImages.map((m) => (
                            <View key={m._id} style={styles.mediaThumbWrap}>
                              <TouchableOpacity
                                onPress={() => { setInfoPanelVisible(false); setSelectedImage(m.image!); }}
                                activeOpacity={0.85}
                              >
                                <Image source={{ uri: m.image! }} style={styles.mediaThumb} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.mediaGoBtn}
                                onPress={() => handleGoToMessage(m._id)}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <Ionicons name="navigate" size={11} color="#FFF" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )
                    )}

                    {/* Fichiers + Audio */}
                    {mediaTab === "fichiers" && (
                      allFilesAndAudio.length === 0 ? (
                        <Text style={[styles.mediaEmptyText, { color: colors.textTertiary }]}>
                          Aucun fichier
                        </Text>
                      ) : (
                        allFilesAndAudio.map((m) => {
                          const isAudio = !!m.audio && !m.file;
                          const fileName = m.file?.name ?? "Message vocal";
                          const fileUri = m.file?.uri ?? m.audio!;
                          const fileSize = m.file?.size;
                          return (
                            <View key={m._id} style={[styles.fileRow, { borderColor: colors.borderLight }]}>
                              <Ionicons
                                name={isAudio ? "musical-note-outline" : "document-outline"}
                                size={22}
                                color={colors.primary}
                              />
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  numberOfLines={1}
                                  style={[styles.fileName, { color: colors.textPrimary }]}
                                >
                                  {fileName}
                                </Text>
                                {fileSize != null && (
                                  <Text style={[styles.fileSize, { color: colors.textTertiary }]}>
                                    {formatSize(fileSize)}
                                  </Text>
                                )}
                              </View>
                              <TouchableOpacity
                                onPress={() => handleFileDownload(fileUri, fileName)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={{ marginLeft: 6 }}
                              >
                                <Ionicons name="download-outline" size={20} color={colors.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleGoToMessage(m._id)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={{ marginLeft: 6 }}
                              >
                                <Ionicons name="navigate-outline" size={20} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                          );
                        })
                      )
                    )}

                    {/* Liens */}
                    {mediaTab === "liens" && (
                      allLinks.length === 0 ? (
                        <Text style={[styles.mediaEmptyText, { color: colors.textTertiary }]}>
                          Aucun lien
                        </Text>
                      ) : (
                        allLinks.map((link, i) => (
                          <View key={`${link.messageId}-${i}`} style={[styles.linkRow, { borderColor: colors.borderLight }]}>
                            <Ionicons name="link-outline" size={18} color={colors.primary} style={{ flexShrink: 0 }} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                numberOfLines={2}
                                style={[styles.linkUrl, { color: colors.primary }]}
                              >
                                {link.url}
                              </Text>
                              <Text style={[styles.fileSize, { color: colors.textTertiary }]}>
                                {link.senderName}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleOpenLink(link.url)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={{ marginLeft: 6 }}
                            >
                              <Ionicons name="open-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleGoToMessage(link.messageId)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={{ marginLeft: 6 }}
                            >
                              <Ionicons name="navigate-outline" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                          </View>
                        ))
                      )
                    )}
                  </>
                )}
              </View>

              {/* Sondages */}
              {pollMessages.length > 0 && (
                <View style={[styles.infoPanelSection, { borderColor: colors.borderLight }]}>
                  <Text style={[styles.infoPanelSectionTitle, { color: colors.textSecondary }]}>
                    Sondages ({pollMessages.length})
                  </Text>
                  {pollMessages.map((m) => {
                    const totalVotes = m.poll!.options.reduce((acc, o) => acc + o.voters.length, 0);
                    return (
                      <TouchableOpacity
                        key={m._id}
                        style={styles.infoPanelPollRow}
                        onPress={() => handleGoToMessage(m._id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="bar-chart-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.infoPanelPollQuestion, { color: colors.textPrimary }]} numberOfLines={2}>
                            {m.poll!.question}
                          </Text>
                          <Text style={[styles.infoPanelMemberRole, { color: colors.textTertiary }]}>
                            {m.poll!.options.length} options · {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        <Ionicons name="navigate-outline" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Close */}
              <TouchableOpacity
                style={[styles.infoPanelClose, { backgroundColor: colors.surfaceDim, borderColor: colors.border }]}
                onPress={() => setInfoPanelVisible(false)}
              >
                <Text style={[styles.infoPanelCloseText, { color: colors.textSecondary }]}>
                  Fermer
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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

    // Custom header
    customHeader: {
      flexDirection: "row",
      alignItems: "center",
      height: 62,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    headerBack: {
      padding: 8,
      marginRight: 2,
    },
    headerCenter: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginRight: 4,
    },
    headerAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    headerAvatarText: {
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    headerTitleGroup: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    headerSubtitle: {
      fontSize: 11,
      marginTop: 1,
    },
    headerAction: {
      padding: 10,
    },

    // Search bar
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
      borderBottomWidth: 1,
      gap: 4,
    },
    searchInput: {
      flex: 1,
      fontSize: tokens.font.base,
      paddingVertical: 8,
      paddingHorizontal: 6,
    },
    searchCount: {
      fontSize: tokens.font.sm,
      minWidth: 38,
      textAlign: "center",
    },
    searchNavBtn: {
      padding: 6,
    },
    searchCloseBtn: {
      padding: 10,
    },

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

    // Media tabs
    mediaTabs: {
      flexDirection: "row",
      borderBottomWidth: StyleSheet.hairlineWidth,
      marginBottom: 12,
    },
    mediaTabBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    mediaTabText: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
    },
    mediaThumbWrap: {
      position: "relative",
    },
    mediaGoBtn: {
      position: "absolute",
      bottom: 4,
      right: 4,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 10,
      padding: 3,
    },
    mediaEmptyText: {
      textAlign: "center",
      paddingVertical: 20,
      fontSize: tokens.font.sm,
    },
    fileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    fileName: {
      fontSize: tokens.font.base,
      fontWeight: "500",
    },
    fileSize: {
      fontSize: tokens.font.xs,
      marginTop: 2,
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    linkUrl: {
      fontSize: tokens.font.sm,
      fontWeight: "500",
    },

    // Info panel
    infoPanelSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      maxHeight: "88%",
    },
    mediaGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 3,
    },
    mediaThumb: {
      width: 80,
      height: 80,
      borderRadius: 8,
    },
    infoPanelPollRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "transparent",
    },
    infoPanelPollQuestion: {
      fontSize: tokens.font.base,
      fontWeight: "600",
      marginBottom: 2,
    },
    infoPanelHeader: {
      alignItems: "center",
      marginBottom: 20,
    },
    infoPanelAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    infoPanelAvatarText: {
      fontSize: 22,
      fontWeight: "800",
    },
    infoPanelTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 6,
      textAlign: "center",
    },
    infoPanelBadge: {
      fontSize: 12,
      fontWeight: "600",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      overflow: "hidden",
    },
    infoPanelSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: 14,
      marginBottom: 14,
    },
    infoPanelSectionTitle: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    infoPanelDesc: {
      fontSize: tokens.font.base,
      lineHeight: 20,
    },
    infoPanelMemberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 7,
    },
    infoPanelMemberAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    infoPanelMemberInitials: {
      fontSize: 13,
      fontWeight: "700",
    },
    infoPanelMemberName: {
      fontSize: tokens.font.base,
      fontWeight: "600",
    },
    infoPanelMemberRole: {
      fontSize: tokens.font.sm,
      marginTop: 1,
    },
    infoPanelClose: {
      marginTop: 8,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: 1,
    },
    infoPanelCloseText: {
      fontSize: tokens.font.base,
      fontWeight: "600",
    },
  });
