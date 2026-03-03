import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactElement,
} from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  PermissionsAndroid,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { db } from "../../firebaseConfig";
import { Message, Poll } from "../../types/models";
/**import { 
  createAgoraRtcEngine, 
  ChannelProfileType, 
  ClientRoleType, 
  RtcSurfaceView 
} from '../../components/chat/agora';*/
import type { IRtcEngine } from "react-native-agora";

// Utilisation de la variable d'environnement (assure-toi qu'elle est dans ton fichier .env)
const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || "";

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  blue: "#2563EB",
  blueLight: "#DBEAFE",
  green: "#22C55E",
  red: "#EF4444",
  white: "#FFFFFF",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  overlay: "rgba(0,0,0,0.6)",
};

const isWeb = Platform.OS === "web";
const FS = {
  xs: isWeb ? 13 : 11,
  sm: isWeb ? 15 : 13,
  base: isWeb ? 17 : 15,
  lg: isWeb ? 19 : 17,
  xl: isWeb ? 22 : 19,
};

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
  const scheme = useColorScheme();
  const dark = scheme === "dark";

  // ── Messages ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // ── Agora (WebRTC) ────────────────────────────────────────────────────────
  /* const agoraEngineRef = useRef<IRtcEngine | null>(null);
  const [callType, setCallType] = useState<CallType>(null);
  const [callActive, setCallActive] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number>(0);*/

// Utilisateur courant
  const auth = getAuth();
  const user = auth.currentUser;
  
  const currentUser = { 
    _id: user?.uid || "anonyme", 
    name: user?.displayName || user?.email?.split('@')[0] || "Utilisateur",
    avatar: user?.photoURL || null // 🟢 CORRECTION ICI : null au lieu de undefined
  };

  const bg = dark ? C.gray900 : C.gray50;
  const surface = dark ? C.gray800 : C.white;
  const border = dark ? C.gray700 : C.gray200;
  const textPrim = dark ? C.white : C.gray900;
  const textSec = dark ? C.gray400 : C.gray500;
  const inputBg = dark ? C.gray700 : C.gray100;

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
          user: currentUser, // Utilise le currentUser avec le "null"
          image: imageUri || null,
        });
        
        await updateDoc(doc(db, "channels", id), {
          lastMessage: content || "Photo",
          lastMessageAt: Timestamp.now(),
        });
      } catch (error) {
        // 🟢 AJOUT : Ceci t'affichera la VRAIE erreur dans ton terminal
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
        style={[s.msgRow, isMe ? s.msgRowRight : s.msgRowLeft]}
      >
        {!isMe && (
          <View style={[s.avatar, { backgroundColor: C.blue }]}>
            <Text style={s.avatarText}>
              {(item.user.name || "?")[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[s.msgWrap, { maxWidth: isWeb ? "60%" : "78%" }]}>
          {!isMe && (
            <Text style={[s.senderName, { color: C.blue, fontSize: FS.xs }]}>
              {item.user.name}
            </Text>
          )}
          <View
            style={[
              s.bubble,
              isMe
                ? [s.bubbleRight, { backgroundColor: C.blue }]
                : [
                    s.bubbleLeft,
                    { backgroundColor: surface, borderColor: border },
                  ],
            ]}
          >
            {item.image && (
              <Image
                source={{ uri: item.image }}
                style={s.msgImage}
                resizeMode="cover"
              />
            )}
            {item.poll && (
              <View style={s.pollContainer}>
                <Text
                  style={[
                    s.pollQuestion,
                    { color: isMe ? C.white : textPrim, fontSize: FS.sm },
                  ]}
                >
                  📊 {item.poll.question}
                </Text>
                {item.poll.isActive ? (
                  <View style={s.pollButtons}>
                    <TouchableOpacity
                      style={[s.pollBtn, { backgroundColor: C.green }]}
                      onPress={() => handleVote(item._id, item.poll!, "yes")}
                    >
                      <Text style={[s.pollBtnText, { fontSize: FS.xs }]}>
                        👍 Pour ({item.poll.yes})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.pollBtn, { backgroundColor: C.red }]}
                      onPress={() => handleVote(item._id, item.poll!, "no")}
                    >
                      <Text style={[s.pollBtnText, { fontSize: FS.xs }]}>
                        👎 Contre ({item.poll.no})
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text
                    style={[
                      {
                        color: isMe ? "rgba(255,255,255,0.7)" : C.gray400,
                        fontSize: FS.xs,
                        marginTop: 4,
                      },
                    ]}
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
                  s.msgText,
                  { fontSize: FS.base },
                  isMe ? { color: C.white } : { color: textPrim },
                ]}
              >
                {item.text}
              </Text>
            )}
            <Text
              style={[
                s.msgTime,
                { fontSize: FS.xs - 1 },
                isMe
                  ? { color: "rgba(255,255,255,0.65)", textAlign: "right" }
                  : { color: textSec },
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
    <View
      style={[s.inputBar, { backgroundColor: surface, borderTopColor: border }]}
    >
      <TouchableOpacity
        style={[s.inputAction, { backgroundColor: C.blueLight }]}
        onPress={() =>
          Alert.alert("Actions", "Choisissez", [
            { text: "Photo", onPress: handlePickImage },
            { text: "Sondage", onPress: handleCreatePoll },
            { text: "Annuler", style: "cancel" },
          ])
        }
      >
        <Ionicons name="add" size={22} color={C.blue} />
      </TouchableOpacity>
      <TextInput
        style={[
          s.textInput,
          { backgroundColor: inputBg, color: textPrim, fontSize: FS.base },
        ]}
        placeholder="Message..."
        placeholderTextColor={dark ? C.gray500 : C.gray400}
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
          s.sendBtn,
          { backgroundColor: inputText.trim() ? C.blue : C.gray300 },
        ]}
        onPress={() => sendMessage()}
        disabled={!inputText.trim() || sending}
        activeOpacity={0.8}
      >
        {sending ? (
          <ActivityIndicator size="small" color={C.white} />
        ) : (
          <Ionicons name="send" size={18} color={C.white} />
        )}
      </TouchableOpacity>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU — MODAL APPEL AGORA
  // ═══════════════════════════════════════════════════════════════════════════
  /** const renderCallModal = () => (
    <Modal visible={callActive} animationType="slide" transparent>
      <View style={s.callOverlay}>
        <View style={[s.callSheet, { backgroundColor: C.gray900 }]}>
          {callType === "video" ? (
            <View style={s.videoFull}>
              {remoteUid !== 0 ? (
                <RtcSurfaceView
                  canvas={{ uid: remoteUid }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : (
                <View
                  style={[
                    s.videoFull,
                    { justifyContent: "center", alignItems: "center" },
                  ]}
                >
                  <ActivityIndicator size="large" color={C.blue} />
                  <Text style={{ color: C.white, marginTop: 10 }}>
                    En attente de l'interlocuteur...
                  </Text>
                </View>
              )}
              {isJoined && (
                <View style={s.localVideoContainer}>
                  <RtcSurfaceView
                    canvas={{ uid: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>
              )}
            </View>
          ) : (
            <View style={s.audioCallDisplay}>
              <View style={[s.callAvatar, { backgroundColor: C.blue }]}>
                <Ionicons name="call" size={48} color={C.white} />
              </View>
              <Text style={[s.callName, { fontSize: FS.xl }]}>
                {name || "Discussion"}
              </Text>
              <Text style={[s.callStatus, { fontSize: FS.sm }]}>
                {remoteUid !== 0 ? "En communication" : "En attente..."}
              </Text>
            </View>
          )}
          <View style={s.callControls}>
            <TouchableOpacity
              style={[s.callBtn, { backgroundColor: C.red }]}
              onPress={endCall}
            >
              <Ionicons
                name="call"
                size={24}
                color={C.white}
                style={{ transform: [{ rotate: "135deg" }] }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );*/

  return (
    <SafeAreaView style={[s.flex1, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        // 🟢 C'est ici que la magie opère avec Platform.select :
        keyboardVerticalOffset={Platform.select({
          ios: 90,
          android: 80,
          default: 0,
        })}
      >
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={s.msgList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}
        {renderInput()}
      </KeyboardAvoidingView>
      {/* renderCallModal()*/}
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  flex1: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerButtons: { flexDirection: "row", marginRight: 8 },
  headerBtn: { padding: 6, marginLeft: 4 },
  msgList: { paddingHorizontal: 12, paddingVertical: 16 },
  msgRow: { flexDirection: "row", marginBottom: 12, alignItems: "flex-end" },
  msgRowRight: { justifyContent: "flex-end" },
  msgRowLeft: { justifyContent: "flex-start" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  msgWrap: { flexShrink: 1 },
  senderName: { marginBottom: 3, marginLeft: 4, fontWeight: "600" },
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
  bubbleLeft: { borderBottomLeftRadius: 4, borderWidth: 1 },
  msgText: { lineHeight: 22 },
  msgTime: { marginTop: 4 },
  msgImage: { width: 220, height: 160, borderRadius: 10, marginBottom: 4 },
  pollContainer: { paddingBottom: 4 },
  pollQuestion: { fontWeight: "700", marginBottom: 10 },
  pollButtons: { flexDirection: "row", gap: 8 },
  pollBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  pollBtnText: { color: "#fff", fontWeight: "700" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "android" ? 14 : 10,
  },
  inputAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
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
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginBottom: 1,
  },
  callOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: "flex-end",
  },
  callSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    minHeight: "55%",
  },
  audioCallDisplay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  callAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  callName: { color: C.white, fontWeight: "700", marginBottom: 8 },
  callStatus: { color: C.gray400 },
  videoFull: { flex: 1 },
  callControls: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 20,
  },
  callBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  localVideoContainer: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
