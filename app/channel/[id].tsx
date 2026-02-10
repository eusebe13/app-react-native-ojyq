import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, Modal, Image } from 'react-native';
import { GiftedChat, Bubble, InputToolbar, Actions } from 'react-native-gifted-chat';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';

export default function ChannelScreen() {
  const { id, name } = useLocalSearchParams(); // Récupère l'ID du canal
  const navigation = useNavigation();
  const [messages, setMessages] = useState<any[]>([]);
  
  // Simulation d'un utilisateur (Puisque Auth n'est pas encore fini)
  const user = { _id: 'user_1', name: 'Moi' };

  // Configurer le titre de la page
  useEffect(() => {
    navigation.setOptions({ 
      title: name || 'Discussion',
      headerRight: () => (
        <View style={{flexDirection: 'row', marginRight: 10}}>
           {/* Bouton Appel (Simulation) */}
           <TouchableOpacity onPress={() => Alert.alert("Appel", "Lancement de l'appel vocal...")} style={{marginRight: 15}}>
             <Ionicons name="call" size={24} color="#007AFF" />
           </TouchableOpacity>
           {/* Bouton Vidéo (Simulation) */}
           <TouchableOpacity onPress={() => Alert.alert("Vidéo", "Lancement de la visio...")}>
             <Ionicons name="videocam" size={24} color="#007AFF" />
           </TouchableOpacity>
        </View>
      )
    });
  }, [navigation, name]);

  // 1. Écouter les messages du canal
  useEffect(() => {
    const messagesRef = collection(db, 'channels', id as string, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          text: data.text,
          createdAt: data.createdAt?.toDate(),
          user: data.user,
          image: data.image,
          // Données pour les sondages
          poll: data.poll 
        };
      });
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [id]);

  // 2. Envoyer un message
  const onSend = useCallback((newMessages = []) => {
    const { _id, createdAt, text, user: msgUser, image } = newMessages[0];
    
    // Sauvegarde dans Firestore
    addDoc(collection(db, 'channels', id as string, 'messages'), {
      _id,
      text,
      createdAt: new Date(),
      user: msgUser,
      image: image || null
    });

    // Mettre à jour le dernier message du canal
    updateDoc(doc(db, 'channels', id as string), {
      lastMessage: text || '📷 Photo'
    });
  }, [id]);

  // --- FONCTIONNALITÉS AVANCÉES ---

  // A. Envoyer une Photo
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true, // Pour simplifier sans Storage bucket, on utilise base64 (Attention : lourd)
    });

    if (!result.canceled && result.assets[0].base64) {
        // Envoi du message image
        const imageMessage = {
            _id: Math.random().toString(),
            text: '',
            createdAt: new Date(),
            user: user,
            image: `data:image/jpeg;base64,${result.assets[0].base64}`
        };
        onSend([imageMessage]);
    }
  };

  // B. Créer un Sondage
  const handleCreatePoll = () => {
    Alert.alert(
        "Créer un sondage",
        "Voulez-vous lancer un vote 'Pour ou Contre' ?",
        [
            { text: "Annuler", style: "cancel" },
            { text: "Lancer", onPress: () => sendPollMessage() }
        ]
    );
  };

  const sendPollMessage = () => {
      addDoc(collection(db, 'channels', id as string, 'messages'), {
          _id: Math.random().toString(),
          text: "📊 SONDAGE : Êtes-vous d'accord ?",
          createdAt: new Date(),
          user: user,
          poll: {
              yes: 0,
              no: 0,
              voters: [] // Pour éviter le double vote
          }
      });
  };

  // C. Gestion des Votes (Interactif)
  const handleVote = async (messageId: string, pollData: any, voteType: 'yes' | 'no') => {
      // Dans une vraie app, on vérifierait si user._id est déjà dans pollData.voters
      const newPoll = { ...pollData };
      if (voteType === 'yes') newPoll.yes += 1;
      else newPoll.no += 1;
      
      await updateDoc(doc(db, 'channels', id as string, 'messages', messageId), {
          poll: newPoll
      });
  };

  // --- RENDU PERSONNALISÉ ---

  // Rendu des bulles personnalisées (Sondages)
  const renderCustomView = (props: any) => {
      const { currentMessage } = props;
      if (currentMessage.poll) {
          return (
              <View style={styles.pollContainer}>
                  <Text style={styles.pollTitle}>📊 Sondage</Text>
                  <View style={styles.pollButtons}>
                      <TouchableOpacity 
                        style={[styles.voteBtn, {backgroundColor: '#4CD964'}]}
                        onPress={() => handleVote(currentMessage._id, currentMessage.poll, 'yes')}
                      >
                          <Text style={styles.voteText}>👍 {currentMessage.poll.yes}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.voteBtn, {backgroundColor: '#FF3B30'}]}
                        onPress={() => handleVote(currentMessage._id, currentMessage.poll, 'no')}
                      >
                          <Text style={styles.voteText}>👎 {currentMessage.poll.no}</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          );
      }
      return null;
  };

  // Bouton "+" (Actions)
  const renderActions = (props: any) => (
      <Actions
        {...props}
        options={{
            'Envoyer une Photo': handlePickImage,
            'Lancer un Vote': handleCreatePoll,
            'Annuler': () => {},
        }}
        icon={() => <Ionicons name="add" size={28} color="#007AFF" />}
        onSend={() => {}} // Non utilisé car géré par options
      />
  );

  // Suppression de message (Long Press)
  const onLongPress = (context: any, message: any) => {
    if (message.user._id === user._id) { // Seulement ses propres messages
        Alert.alert(
            "Options",
            "Supprimer ce message ?",
            [
                { text: "Annuler", style: "cancel" },
                { 
                    text: "Supprimer", 
                    style: 'destructive',
                    onPress: async () => {
                        await deleteDoc(doc(db, 'channels', id as string, 'messages', message._id));
                    }
                }
            ]
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <GiftedChat
        messages={messages}
        onSend={messages => onSend(messages)}
        user={user}
        renderUsernameOnMessage={true}
        renderActions={renderActions} // Le bouton "+"
        renderCustomView={renderCustomView} // Les sondages
        onLongPress={onLongPress} // Supprimer message
        placeholder="Écrivez un message..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
    pollContainer: { padding: 10, minWidth: 200 },
    pollTitle: { fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#555' },
    pollButtons: { flexDirection: 'row', justifyContent: 'space-around' },
    voteBtn: { paddingVertical: 5, paddingHorizontal: 15, borderRadius: 15 },
    voteText: { color: 'white', fontWeight: 'bold' }
});