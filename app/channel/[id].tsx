import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";
import { Message, Poll } from "../../types/models";
import { useAppTheme } from "../../contexts/ThemeContext";

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || "";

interface ExtendedMessage extends Message {
  _id: string;
}
type CallType = "audio" | "video" | null;

// ═════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════
export default function ChannelScreen(): ReactElement {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const navigation = useNavigation();
  const { colors, tokens } = useAppTheme();

  // ── Messages ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Utilisateur courant
  const auth = getAuth();
  const user = auth.currentUser;

  const currentUser = useMemo(() => ({
    _id: user?.uid || "anonyme",
    name: user?.displayName || user?.email?.split("@")[0] || "Utilisateur",
    avatar: user?.photoURL || null,
  }), [user?.uid, user?.displayName, user?.email, user?.photoURL]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRESTORE — MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, "channels", id, "messages"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map(
          (d) =>
            ({
              _id: d.id,
              ...d.data(),
              createdAt: d.data().createdAt?.toDate() || new Date(),
            }) as ExtendedMessage,
        ),
      );
      setLoading(false);
    });
    return unsub;
  }, [id]);

  const sendMessage = useCallback(
    async (text?: string, imageUri?: string) => {
      const content = (text ?? inputText).trim();
      if ((!content && !imageUri) || !id) return;

      setSending(true);
      setInputText("");

      try {
        await addDoc(collection(db, "channels", id, "messages"), {
          text: content,
          createdAt: Timestamp.now(),
          user: currentUser,
          image: imageUri || null,
        });

        await updateDoc(doc(db, "channels", id), {
          lastMessage: content || "Photo",
          lastMessageAt: Timestamp.now(),
        });
      } catch (error) {
        console.error("Erreur Firestore lors de l'envoi :", error);
        Alert.alert("Erreur", "Message non envoyé");
        setInputText(content);
      } finally {
        setSending(false);
      }
    },
    [inputText, id, currentUser],
  );

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      await sendMessage(
        "",
        `data:image/jpeg;base64,${result.assets[0].base64}`,
      );
    }
  };

  const handleCreatePoll = () => {
    Alert.prompt(
      "Créer un sondage",
      "Votre question :",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Créer",
          onPress: async (question?: string) => {
            if (!question?.trim() || !id) return;
            await addDoc(collection(db, "channels", id, "messages"), {
              text: `📊 ${question}`,
              createdAt: Timestamp.now(),
              user: currentUser,
              poll: {
                question,
                yes: 0,
                no: 0,
                voters: [],
                createdAt: new Date(),
                isActive: true,
              },
            });
          },
        },
      ],
      "plain-text",
      "Êtes-vous d'accord ?",
    );
  };

  const handleVote = async (msgId: string, poll: Poll, vote: "yes" | "no") => {
    if (!id) return;
    if (poll.voters?.includes(currentUser._id)) {
      Alert.alert("Déjà voté", "Vous avez déjà participé à ce sondage.");
      return;
    }
    await updateDoc(doc(db, "channels", id, "messages", msgId), {
      poll: {
        ...poll,
        yes: vote === "yes" ? poll.yes + 1 : poll.yes,
        no: vote === "no" ? poll.no + 1 : poll.no,
        voters: [...(poll.voters || []), currentUser._id],
      },
    });
  };

  const handleLongPress = (msg: ExtendedMessage) => {
    if (msg.user._id !== currentUser._id) return;
    Alert.alert("Supprimer ?", "Ce message sera définitivement supprimé.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () =>
          await deleteDoc(doc(db, "channels", id!, "messages", msg._id)),
      },
    ]);
  };

  const styles = getStyles(colors, tokens);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU — BULLE DE MESSAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMessage = ({ item }: { item: ExtendedMessage }) => {
    const isMe = item.user._id === currentUser._id;
    const time =
      item.createdAt instanceof Date
        ? item.createdAt.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => handleLongPress(item)}
        style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}
      >
        {!isMe && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {(item.user.name || "?")[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.msgWrap}>
          {!isMe && (
            <Text style={[styles.senderName, { color: colors.primary }]}>
              {item.user.name}
            </Text>
          )}
          <View
            style={[
              styles.bubble,
              isMe
                ? [styles.bubbleRight, { backgroundColor: colors.primary }]
                : [styles.bubbleLeft, { backgroundColor: colors.surface, borderColor: colors.border }],
            ]}
          >
            {item.image && (
              <Image
                source={{ uri: item.image }}
                style={styles.msgImage}
                resizeMode="cover"
              />
            )}
            {item.poll && (
              <View style={styles.pollContainer}>
                <Text
                  style={[
                    styles.pollQuestion,
                    { color: isMe ? "#FFFFFF" : colors.textPrimary },
                  ]}
                >
                  📊 {item.poll.question}
                </Text>
                {item.poll.isActive ? (
                  <View style={styles.pollButtons}>
                    <TouchableOpacity
                      style={[styles.pollBtn, { backgroundColor: colors.online }]}
                      onPress={() => handleVote(item._id, item.poll!, "yes")}
                    >
                      <Text style={styles.pollBtnText}>
                        👍 Pour ({item.poll.yes})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pollBtn, { backgroundColor: colors.accent6 }]}
                      onPress={() => handleVote(item._id, item.poll!, "no")}
                    >
                      <Text style={styles.pollBtnText}>
                        👎 Contre ({item.poll.no})
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text
                    style={{
                      color: isMe ? "rgba(255,255,255,0.7)" : colors.textTertiary,
                      fontSize: tokens.font.xs,
                      marginTop: 4,
                    }}
                  >
                    Sondage terminé · {item.poll.yes} pour / {item.poll.no}{" "}
                    contre
                  </Text>
                )}
              </View>
            )}
            {!!item.text && !item.poll && (
              <Text
                style={[
                  styles.msgText,
                  isMe ? { color: "#FFFFFF" } : { color: colors.textPrimary },
                ]}
              >
                {item.text}
              </Text>
            )}
            <Text
              style={[
                styles.msgTime,
                isMe
                  ? { color: "rgba(255,255,255,0.65)", textAlign: "right" }
                  : { color: colors.textTertiary },
              ]}
            >
              {time}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU — BARRE D'INPUT
  // ═══════════════════════════════════════════════════════════════════════════
  const renderInput = () => (
    <View style={styles.inputBar}>
      <TouchableOpacity
        style={[styles.inputAction, { backgroundColor: colors.primaryTint }]}
        onPress={() =>
          Alert.alert("Actions", "Choisissez", [
            { text: "Photo", onPress: handlePickImage },
            { text: "Sondage", onPress: handleCreatePoll },
            { text: "Annuler", style: "cancel" },
          ])
        }
      >
        <Ionicons name="add" size={22} color={colors.primary} />
      </TouchableOpacity>
      <TextInput
        style={styles.textInput}
        placeholder="Message..."
        placeholderTextColor={colors.textTertiary}
        value={inputText}
        onChangeText={setInputText}
        multiline
        onSubmitEditing={() => sendMessage()}
        blurOnSubmit={false}
        returnKeyType="send"
        enablesReturnKeyAutomatically
      />
      <TouchableOpacity
        style={[
          styles.sendBtn,
          { backgroundColor: inputText.trim() ? colors.primary : colors.border },
        ]}
        onPress={() => sendMessage()}
        disabled={!inputText.trim() || sending}
        activeOpacity={0.8}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="send" size={18} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.surfaceDim }]}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.select({
          ios: 90,
          android: 80,
          default: 0,
        })}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.msgList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}
        {renderInput()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    flex1:   { flex: 1 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    msgList: { paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.lg },
    msgRow:      { flexDirection: "row", marginBottom: tokens.space.md, alignItems: "flex-end" },
    msgRowRight: { justifyContent: "flex-end" },
    msgRowLeft:  { justifyContent: "flex-start" },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginRight: tokens.space.sm,
    },
    avatarText: { color: "#FFFFFF", fontWeight: "700", fontSize: tokens.font.sm },
    msgWrap:    { flexShrink: 1, maxWidth: "78%" },
    senderName: { marginBottom: 3, marginLeft: 4, fontWeight: "600", fontSize: tokens.font.xs },
    bubble: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 3,
      elevation: 1,
    },
    bubbleRight: { borderBottomRightRadius: 4 },
    bubbleLeft:  { borderBottomLeftRadius: 4, borderWidth: 1 },
    msgText:     { lineHeight: 22, fontSize: tokens.font.md },
    msgTime:     { marginTop: 4, fontSize: tokens.font.xs },
    msgImage:    { width: 220, height: 160, borderRadius: 10, marginBottom: 4 },
    pollContainer: { paddingBottom: 4 },
    pollQuestion:  { fontWeight: "700", marginBottom: 10, fontSize: tokens.font.sm },
    pollButtons:   { flexDirection: "row", gap: tokens.space.sm },
    pollBtn: {
      flex: 1,
      paddingVertical: tokens.space.sm,
      borderRadius: 10,
      alignItems: "center",
    },
    pollBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: tokens.font.xs },
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: tokens.space.md,
      paddingVertical: 10,
      borderTopWidth: 1,
      paddingBottom: Platform.OS === "android" ? 45 : 10,
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
    },
    inputAction: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      marginRight: tokens.space.sm,
      marginBottom: 1,
    },
    textInput: {
      flex: 1,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 10,
      maxHeight: 120,
      lineHeight: 20,
      fontSize: tokens.font.md,
      backgroundColor: colors.surfaceDim,
      color: colors.textPrimary,
    },
    sendBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: tokens.space.sm,
      marginBottom: 1,
    },
    // Call modal styles (kept for future use)
    callOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
    callSheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", minHeight: "55%" },
    audioCallDisplay: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 },
    callAvatar: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 20 },
    callName:     { color: "#FFFFFF", fontWeight: "700", marginBottom: 8, fontSize: tokens.font.xl },
    callStatus:   { color: "#9CA3AF", fontSize: tokens.font.sm },
    videoFull:    { flex: 1 },
    callControls: { flexDirection: "row", justifyContent: "center", paddingVertical: 24, gap: 20 },
    callBtn:      { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
    localVideoContainer: {
      position: "absolute", top: 20, right: 20,
      width: 100, height: 150, borderRadius: 10,
      overflow: "hidden", borderWidth: 2, borderColor: "#FFFFFF",
    },
  });
