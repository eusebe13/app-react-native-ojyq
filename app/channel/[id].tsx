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
import { GiftedChat, Actions } from "react-native-gifted-chat";
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

      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData({ _id: currentUser.uid, ...userDoc.data() } as any);
        } else {
          const initialData = {
            name: currentUser.displayName || 'Eusebe Hangi Kisoni',
            role: 'Vice-Président', 
            avatar: `https://ui-avatars.com/api/?name=${currentUser.displayName || 'Eusebe+Kisoni'}&background=007AFF&color=fff`,
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
        }))
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
        user: userData, // On utilise userData ici
        image: image || null,
        poll: newMessages[0].poll || null,
      });

      updateDoc(doc(db, "channels", id as string), {
        lastMessage: text || (image ? "📷 Photo" : "📄 Fichier"),
      });
    },
    [id, userData]
  );

  // --- ACTIONS ---
  const handlePickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!res.canceled) {
      onSend([{
        _id: Math.random().toString(),
        text: `📄 Fichier : ${res.assets[0].name}`,
        user: userData, // Correction ici
        createdAt: new Date(),
      } as any]);
    }
  };

  const handleCreatePoll = () => {
    Alert.prompt("Nouveau Sondage", "Quelle est votre question ?", (question) => {
      if (question) {
        onSend([{
          _id: Math.random().toString(),
          text: `📊 SONDAGE : ${question}`,
          user: userData, // Correction ici
          createdAt: new Date(),
          poll: { yes: 0, no: 0, question },
        } as any]);
      }
    });
  };

  // --- RENDU ---
  const renderMessageHeader = (props: any) => (
    <View style={styles.headerMessage}>
      <Text style={styles.nameText}>{props.currentMessage.user.name}</Text>
      <Text style={styles.roleText}>{props.currentMessage.user.role}</Text>
    </View>
  );

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

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={userData} // Correction ici (était user)
        renderMessageHeader={renderMessageHeader}
        renderActions={renderActions}
        alwaysShowSend
        scrollToBottom
        bottomOffset={Platform.OS === "ios" ? 0 : 0}
      />
      {Platform.OS === "ios" && (
        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={80} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerMessage: { flexDirection: "row", alignItems: "center", marginLeft: 10, marginBottom: 2 },
  nameText: { fontSize: 12, fontWeight: "bold", color: "#333" },
  roleText: { fontSize: 10, color: "#007AFF", marginLeft: 5, backgroundColor: "#E1F0FF", paddingHorizontal: 4, borderRadius: 4 },
});