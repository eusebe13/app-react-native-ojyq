import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { GiftedChat, Actions, Bubble } from "react-native-gifted-chat";
import { useLocalSearchParams } from "expo-router";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebaseConfig";

export default function ChannelScreen() {
  const { id, name } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);

  // État initial de l'utilisateur
  const [userData, setUserData] = useState({
    _id: auth.currentUser?.uid || "guest",
    name: "Utilisateur",
    role: "Membre",
    avatar: "https://ui-avatars.com/api/?name=User",
  });

  // 1. Synchronisation du profil au chargement
  useEffect(() => {
    const syncUserProfile = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userDocRef = doc(db, "users", currentUser.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData({ _id: currentUser.uid, ...userDoc.data() } as any);
        } else {
          const initialData = {
            name: currentUser.displayName,
            role: "Membre",
            avatar: `https://ui-avatars.com/api/?name=${currentUser.displayName || "https://ojyq.org/wp-content/uploads/2025/04/IMG-20250318-WA0007-150x150.jpg"}&background=007AFF&color=fff`,
            email: currentUser.email,
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, initialData);
          setUserData({ _id: currentUser.uid, ...initialData } as any);
        }
      } catch (error) {
        console.error("Erreur profil:", error);
      }
    };
    syncUserProfile();
  }, []);

  // 2. Chargement des messages
  useEffect(() => {
    const messagesRef = collection(db, "channels", id as string, "messages");
    const q = query(messagesRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({
          _id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        })),
      );
    });
    return () => unsubscribe();
  }, [id]);

  const onSend = useCallback(
    (newMessages = []) => {
      const { text, image } = newMessages[0];
      addDoc(collection(db, "channels", id as string, "messages"), {
        text: text || "",
        createdAt: new Date(),
        user: userData,
        image: image || null,
        poll: newMessages[0].poll || null,
      });

      updateDoc(doc(db, "channels", id as string), {
        lastMessage: text || (image ? "📷 Photo" : "📄 Fichier"),
      });
    },
    [id, userData],
  );

  // --- ACTIONS ---
  const handlePickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!res.canceled) {
      onSend([
        {
          _id: Math.random().toString(),
          text: `📄 Fichier : ${res.assets[0].name}`,
          user: userData,
          createdAt: new Date(),
        } as any,
      ]);
    }
  };

  const handleCreatePoll = () => {
    Alert.prompt(
      "Nouveau Sondage",
      "Quelle est votre question ?",
      (question) => {
        if (question) {
          onSend([
            {
              _id: Math.random().toString(),
              text: `📊 SONDAGE : ${question}`,
              user: userData,
              createdAt: new Date(),
              poll: { yes: 0, no: 0, question },
            } as any,
          ]);
        }
      },
    );
  };

  // --- RENDU ---
  const renderUsername = (user: any) => {
    return (
      <View style={styles.headerMessage}>
        <Text style={styles.nameText}>{user.name}</Text>
        {user.role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderBubble = (props: any) => {
    return (
      <View>
        {/* 1. Affichage du Nom et Rôle au-dessus de la bulle */}
        <View style={styles.headerMessage}>
          <Text style={styles.nameText}>{props.currentMessage.user.name}</Text>
          {props.currentMessage.user.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {props.currentMessage.user.role}
              </Text>
            </View>
          )}
          {props.currentMessage.isEdited && (
            <Text
              style={{
                fontSize: 9,
                color: "gray",
                alignSelf: "flex-end",
                marginRight: 10,
              }}
            >
              (modifié)
            </Text>
          )}
        </View>

        {/* 2. La bulle de message elle-même */}
        <Bubble
          {...props}
          wrapperStyle={{
            left: { backgroundColor: "#fff" },
            right: { backgroundColor: "#007AFF" },
          }}
        />
      </View>
    );
  };

  const renderActions = (props: any) => (
    <Actions
      {...props}
      options={{
        "📸 Envoyer une Photo": () => {},
        "📄 Envoyer un Document": handlePickDocument,
        "📊 Créer un Sondage": handleCreatePoll,
        Annuler: () => {},
      }}
      icon={() => <Ionicons name="add-circle" size={28} color="#007AFF" />}
    />
  );

  const canModifyMessage = (createdAt: Date) => {
    if (!createdAt) return false;
    const now = new Date();
    const diffInMinutes = (now.getTime() - createdAt.getTime()) / 60000;
    return diffInMinutes < 5;
  };

  const onLongPress = (context: any, message: any) => {
    // Vérifier si c'est notre propre message
    if (message.user._id !== userData._id) return;

    // Vérifier le délai de 5 minutes
    if (!canModifyMessage(message.createdAt)) {
      Alert.alert(
        "Délai dépassé",
        "Vous ne pouvez plus modifier ou supprimer ce message après 5 minutes.",
      );
      return;
    }

    const options = ["Modifier le message", "Supprimer le message", "Annuler"];
    const destructiveButtonIndex = 1;
    const cancelButtonIndex = 2;

    Alert.alert("Options du message", "Que souhaitez-vous faire ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => handleDeleteMessage(message._id),
      },
      {
        text: "Modifier",
        onPress: () => handleEditMessage(message),
      },
    ]);
  };

  // Suppression
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, "channels", id as string, "messages", messageId));
    } catch (e) {
      Alert.alert("Erreur", "Impossible de supprimer le message.");
    }
  };

  // Modification
  const handleEditMessage = (message: any) => {
    Alert.prompt(
      "Modifier le message",
      "Entrez le nouveau texte :",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Enregistrer",
          onPress: async (newText) => {
            if (newText && newText.trim() !== "") {
              await updateDoc(
                doc(db, "channels", id as string, "messages", message._id),
                {
                  text: newText,
                  isEdited: true,
                },
              );
            }
          },
        },
      ],
      "plain-text",
      message.text,
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={userData}
        renderBubble={renderBubble}
        onLongPressMessage={onLongPress}
        isUsernameVisible={false}
        renderUsername={renderUsername}
        renderActions={renderActions}
        isAvatarOnTop={true}
        alwaysShowSend
        scrollToBottom
        keyboardAvoidingViewProps={{
          keyboardVerticalOffset: Platform.OS === "ios" ? 90 : 80,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerMessage: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginLeft: 0,
    marginTop: 8,
  },
  nameText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#444",
  },
  roleBadge: {
    marginLeft: 6,
    backgroundColor: "#E1F0FF",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  roleText: {
    fontSize: 10,
    color: "#007AFF",
    fontWeight: "600",
  },
});
