import { Icon } from "@/components/ui/Icon";
import { PRESET_AVATARS } from "@/constants/avatarPresets";
import { sendExpoPush } from "@/hooks/use-push-notifications";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../contexts/ThemeContext";
import { db } from "../../firebaseConfig";
import { Message } from "../../types/models";

interface ExtendedMessage extends Message {
  _id: string;
}

// ─── Notification helper ──────────────────────────────────────────────────────

async function notifyChannelMembers(
  channelId: string,
  channelName: string,
  senderName: string,
  senderUid: string,
  messagePreview: string,
): Promise<void> {
  const channelSnap = await getDoc(doc(db, "channels", channelId));
  if (!channelSnap.exists()) return;
  const channelData = channelSnap.data();
  const audienceType = channelData.audienceType as
    | "public"
    | "roles"
    | "private";

  // 1. Fetch recipient user docs
  let userDocs: { id: string; data: () => any }[] = [];
  if (audienceType === "private") {
    const memberUids = (channelData.members as string[] | undefined) ?? [];
    const targets = memberUids.filter((uid) => uid !== senderUid);
    if (!targets.length) return;
    userDocs = (
      await Promise.all(targets.map((uid) => getDoc(doc(db, "users", uid))))
    ).filter((s) => s.exists());
  } else if (audienceType === "roles") {
    const allowedRoles = channelData.allowedRoles as string[] | undefined;
    if (!allowedRoles?.length) return;
    userDocs = (
      await getDocs(
        query(collection(db, "users"), where("role", "in", allowedRoles)),
      )
    ).docs;
  } else {
    userDocs = (await getDocs(collection(db, "users"))).docs;
  }

  // 2. Build token → uid map (excludes sender)
  const tokenToUid = new Map<string, string>();
  for (const d of userDocs) {
    if (d.id === senderUid) continue;
    const token = d.data().expoPushToken as string | undefined;
    if (token) tokenToUid.set(token, d.id);
  }
  if (!tokenToUid.size) return;

  // 3. Send one request per token in parallel (avoids batch rejection on mixed valid/stale tokens)
  const staleTokens = (
    await Promise.all(
      [...tokenToUid.keys()].map((token) =>
        sendExpoPush(token, `OJYQ`, `${senderName}: ${messagePreview}`, {
          type: "message",
          channelId,
        }),
      ),
    )
  ).flat();

  // 4. Remove stale tokens from Firestore
  if (staleTokens.length) {
    await Promise.all(
      staleTokens.map((token) => {
        const uid = tokenToUid.get(token);
        if (!uid) return;
        return updateDoc(doc(db, "users", uid), {
          expoPushToken: deleteField(),
        });
      }),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════
export default function ChannelScreen(): ReactElement {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const navigation = useNavigation();
  const { colors, tokens } = useAppTheme();

  // ── États Messages & UI ───────────────────────────────────────────────────
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 1. Nouveaux États pour le Profil et l'Image
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 2. Nouveaux États pour le Sondage (Surtout pour Android)
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const auth = getAuth();
  const user = auth.currentUser;

  // 3. Récupérer le VRAI profil de l'utilisateur dans Firestore
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid); // Assure-toi que ta collection s'appelle bien "users"
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Utilisateur courant avec toutes ses infos (Avatar + Preset + Role)
  const currentUser = {
    _id: user?.uid || "anonyme",
    name: userProfile?.firstName
      ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
      : user?.displayName || "Utilisateur",
    avatar: user?.photoURL || null,
    avatarPreset: userProfile?.avatarPreset ?? null,
    role: userProfile?.role || "Membre",
  };

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
    async (text?: string, imageUri?: string, pollData?: any) => {
      const content = (text ?? inputText).trim();
      if ((!content && !imageUri && !pollData) || !id) return;

      setSending(true);
      setInputText("");

      try {
        await addDoc(collection(db, "channels", id, "messages"), {
          text: content,
          createdAt: Timestamp.now(),
          user: currentUser,
          image: imageUri || null,
          poll: pollData || null,
        });

        const preview = pollData
          ? `📊 ${pollData.question}`
          : content || "📷 Photo";
        await updateDoc(doc(db, "channels", id), {
          lastMessage: preview,
          lastMessageAt: Timestamp.now(),
        });

        notifyChannelMembers(
          id,
          name ?? id,
          currentUser.name,
          currentUser._id,
          preview,
        ).catch((e) => console.warn("[notifyChannelMembers]", e));
      } catch (error) {
        console.error("Erreur Firestore lors de l'envoi :", error);
        Alert.alert("Erreur", "Message non envoyé");
        setInputText(content);
      } finally {
        setSending(false);
      }
    },
    [inputText, id, name, currentUser],
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

  // 4. Création de Sondage compatible Android & iOS
  const handleCreatePoll = () => {
    // Plus de condition iOS/Android, tout le monde utilise le Modal !
    setPollQuestion("");
    setPollOptions(["", ""]); // On réinitialise avec 2 options vides
    setPollModalVisible(true);
  };

  const submitPoll = async () => {
    // On enlève les options laissées vides
    const validOptions = pollOptions.filter((opt) => opt.trim() !== "");

    if (!pollQuestion.trim()) {
      Alert.alert("Erreur", "Veuillez entrer une question.");
      return;
    }
    if (validOptions.length < 2) {
      Alert.alert("Erreur", "Veuillez définir au moins 2 options.");
      return;
    }

    setPollModalVisible(false);

    // Nouvelle structure de données pour le sondage
    const pollData = {
      question: pollQuestion.trim(),
      options: validOptions.map((opt) => ({ text: opt, voters: [] })), // Chaque option a son propre compteur
      createdAt: new Date(),
      isActive: true,
    };

    await sendMessage(`📊 ${pollQuestion.trim()}`, undefined, pollData);
  };

  const handleVote = async (msgId: string, poll: any, optionIndex: number) => {
    if (!id) return;

    // Vérifie si l'utilisateur a déjà voté dans N'IMPORTE QUELLE option
    const hasVoted = poll.options.some((opt: any) =>
      opt.voters.includes(currentUser._id),
    );
    if (hasVoted) {
      Alert.alert("Déjà voté", "Vous avez déjà participé à ce sondage.");
      return;
    }

    // Copie des options et ajout du vote
    const updatedOptions = [...poll.options];
    updatedOptions[optionIndex].voters.push(currentUser._id);

    await updateDoc(doc(db, "channels", id, "messages", msgId), {
      poll: {
        ...poll,
        options: updatedOptions,
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

    // 5. Logique d'affichage de l'Avatar
    const userPreset =
      item.user.avatarPreset !== undefined
        ? PRESET_AVATARS[item.user.avatarPreset]
        : null;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => handleLongPress(item)}
        style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}
      >
        {!isMe && (
          <View
            style={[
              styles.avatar,
              userPreset
                ? { backgroundColor: userPreset.bg }
                : { backgroundColor: colors.primary },
            ]}
          >
            {item.user.avatar ? (
              <Image
                source={{ uri: item.user.avatar }}
                style={styles.avatarImage}
              />
            ) : userPreset ? (
              <Icon name={userPreset.icon as any} size={20} color="#FFFFFF" />
            ) : (
              <Text style={styles.avatarText}>
                {(item.user.name || "?")[0].toUpperCase()}
              </Text>
            )}
          </View>
        )}

        <View
          style={[
            styles.msgWrap,
            item.poll && { width: "85%", maxWidth: "100%" },
          ]}
        >
          {!isMe && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 3,
              }}
            >
              <Text style={[styles.senderName, { color: colors.primary }]}>
                {item.user.name}
              </Text>
              {/* 6. Affichage du Rôle */}
              {item.user.role && (
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.textTertiary,
                    marginLeft: 6,
                  }}
                >
                  • {item.user.role}
                </Text>
              )}
            </View>
          )}

          <View
            style={[
              styles.bubble,
              isMe
                ? [styles.bubbleRight, { backgroundColor: colors.primary }]
                : [
                    styles.bubbleLeft,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ],
              item.poll && { width: "100%" },
            ]}
          >
            {item.image && (
              // 7. Rendre l'image cliquable pour l'agrandir
              <TouchableOpacity
                onPress={() => setSelectedImage(item.image!)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: item.image }}
                  style={styles.msgImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
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
                  <View style={{ width: "100%", gap: 8 }}>
                    {/* On boucle sur la liste d'options dynamiques */}
                    {item.poll.options?.map((opt: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.pollBtn,
                          {
                            backgroundColor: isMe
                              ? "rgba(255,255,255,0.2)"
                              : colors.primaryTint,
                          },
                        ]}
                        onPress={() => handleVote(item._id, item.poll!, index)}
                      >
                        <Text
                          style={[
                            styles.pollBtnText,
                            { color: isMe ? "#FFFFFF" : colors.primary },
                          ]}
                        >
                          {opt.text} ({opt.voters?.length || 0})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text
                    style={{
                      color: isMe
                        ? "rgba(255,255,255,0.7)"
                        : colors.textTertiary,
                      fontSize: tokens.font.xs,
                      marginTop: 4,
                    }}
                  >
                    Sondage terminé
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
        onSubmitEditing={() => sendMessage()}
        blurOnSubmit={false}
        returnKeyType="send"
        enablesReturnKeyAutomatically
      />
      <TouchableOpacity
        style={[
          styles.sendBtn,
          {
            backgroundColor: inputText.trim() ? colors.primary : colors.border,
          },
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
    <SafeAreaView
      style={[styles.flex1, { backgroundColor: colors.surfaceDim }]}
    >
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

      {/* 8. MODAL VISUALISATION IMAGE */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* MODAL SONDAGE AVEC OPTIONS */}
      <Modal
        visible={pollModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPollModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.pollModalOverlay}
        >
          <View
            style={[
              styles.pollModalContent,
              { backgroundColor: colors.surface, maxHeight: "80%" },
            ]}
          >
            <Text
              style={[styles.pollModalTitle, { color: colors.textPrimary }]}
            >
              Créer un sondage
            </Text>

            <TextInput
              style={[
                styles.pollModalInput,
                {
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  fontWeight: "bold",
                },
              ]}
              placeholder="Votre question ?"
              placeholderTextColor={colors.textTertiary}
              value={pollQuestion}
              onChangeText={setPollQuestion}
            />

            {/* Liste des options */}
            <FlatList
              data={pollOptions}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item, index }) => (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <TextInput
                    style={[
                      styles.pollModalInput,
                      {
                        flex: 1,
                        marginBottom: 0,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={colors.textTertiary}
                    value={item}
                    onChangeText={(text) => {
                      const newOpts = [...pollOptions];
                      newOpts[index] = text;
                      setPollOptions(newOpts);
                    }}
                  />
                  {/* Bouton supprimer (uniquement s'il y a plus de 2 options) */}
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      onPress={() =>
                        setPollOptions(
                          pollOptions.filter((_, i) => i !== index),
                        )
                      }
                      style={{ padding: 10 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={colors.error || "red"}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />

            {/* Bouton Ajouter une option (limité à 6 options max par exemple) */}
            {pollOptions.length < 6 && (
              <TouchableOpacity
                onPress={() => setPollOptions([...pollOptions, ""])}
                style={{
                  marginVertical: 15,
                  paddingVertical: 10,
                  alignItems: "center",
                  backgroundColor: colors.surfaceDim,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                  + Ajouter une option
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.pollModalButtons}>
              <TouchableOpacity
                style={styles.pollModalCancel}
                onPress={() => setPollModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pollModalSubmit,
                  { backgroundColor: colors.primary },
                ]}
                onPress={submitPoll}
              >
                <Text style={{ color: "#FFF", fontWeight: "bold" }}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    flex1: { flex: 1 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    msgList: {
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.lg,
    },
    msgRow: {
      flexDirection: "row",
      marginBottom: tokens.space.md,
      alignItems: "flex-end",
    },
    msgRowRight: { justifyContent: "flex-end" },
    msgRowLeft: { justifyContent: "flex-start" },

    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      marginRight: tokens.space.sm,
      overflow: "hidden", // Important pour l'image
    },
    avatarImage: { width: "100%", height: "100%" },
    avatarText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: tokens.font.sm,
    },

    msgWrap: { flexShrink: 1, maxWidth: "78%" },
    senderName: { marginLeft: 4, fontWeight: "600", fontSize: tokens.font.xs },

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
    msgText: { lineHeight: 22, fontSize: tokens.font.md },
    msgTime: { marginTop: 4, fontSize: tokens.font.xs },
    msgImage: { width: 220, height: 160, borderRadius: 10, marginBottom: 4 },

    pollContainer: { width: "100%", paddingBottom: 4, alignItems: "center" },
    pollQuestion: {
      fontWeight: "700",
      marginBottom: 15,
      fontSize: tokens.font.md,
      textAlign: "center",
    },
    pollButtons: {
      flexDirection: "row",
      gap: tokens.space.md,
      width: "100%",
      justifyContent: "center",
    },
    pollBtn: {
      flex: 1,
      paddingVertical: tokens.space.md,
      borderRadius: 10,
      alignItems: "center",
    },
    pollBtnText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: tokens.font.sm,
    },

    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: tokens.space.md,
      paddingVertical: 10,
      borderTopWidth: 1,
      paddingBottom: Platform.OS === "android" ? 14 : 20,
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

    // Styles Modals Image & Android Poll
    imageModalContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.9)",
      justifyContent: "center",
      alignItems: "center",
    },
    imageModalClose: {
      position: "absolute",
      top: 50,
      right: 20,
      zIndex: 1,
      padding: 10,
    },
    fullScreenImage: { width: "100%", height: "80%" },

    pollModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: 20,
    },
    pollModalContent: {
      borderRadius: 16,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    pollModalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
    pollModalInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 20,
    },
    pollModalButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
    },
    pollModalCancel: { padding: 10 },
    pollModalSubmit: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
  });
