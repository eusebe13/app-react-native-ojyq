/**
 * ChannelScreen - Écran de conversation
 * 
 * Fonctionnalités:
 * - Messagerie instantanée avec GiftedChat
 * - Sondages interactifs (Pour/Contre)
 * - UI préparée pour appels Audio/Vidéo (WebRTC)
 * - Envoi de photos
 * - Suppression de messages
 * 
 * @module Chat
 * @author OJYQ Dev Team
 */

import React, { useState, useEffect, useCallback, ReactElement } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { GiftedChat, Bubble, InputToolbar, Actions, Send, IMessage } from 'react-native-gifted-chat';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../../firebaseConfig';
import { useTheme } from '../../hooks/useTheme';
import { Message, Poll, messageFromFirestore } from '../../types/models';
import { PollBubble } from '../../components/chat/PollBubble';
import { CallControls } from '../../components/chat/CallControls';
import { Colors } from '../../theme/colors';

/**
 * Type étendu pour les messages avec sondage
 */
interface ExtendedMessage extends IMessage {
  poll?: Poll;
}

/**
 * Écran de conversation d'un canal
 */
export default function ChannelScreen(): ReactElement {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTATS
  // ═══════════════════════════════════════════════════════════════════════════

  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  /**
   * Utilisateur actuel (à remplacer par Auth réel)
   * TODO: Intégrer avec Firebase Auth
   */
  const currentUser = {
    _id: 'user_1',
    name: 'Moi',
    avatar: undefined,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    navigation.setOptions({
      title: name || 'Discussion',
      headerStyle: {
        backgroundColor: colors.surface,
      },
      headerTintColor: colors.textPrimary,
      headerRight: () => (
        <CallControls
          channelId={id || ''}
          channelName={name || 'Discussion'}
        />
      ),
    });
  }, [navigation, name, id, colors]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHARGEMENT DES MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!id) return;

    const messagesRef = collection(db, 'channels', id, 'messages');
    const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const fetchedMessages: ExtendedMessage[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            _id: doc.id,
            text: data.text || '',
            createdAt: data.createdAt?.toDate() || new Date(),
            user: data.user || { _id: 'unknown', name: 'Inconnu' },
            image: data.image,
            poll: data.poll,
          };
        });
        setMessages(fetchedMessages);
      },
      (error) => {
        console.error('[Channel] Erreur chargement messages:', error);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - ENVOI DE MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Envoie un ou plusieurs messages
   */
  const onSend = useCallback(
    async (newMessages: IMessage[] = []): Promise<void> => {
      if (!id || newMessages.length === 0) return;

      const message = newMessages[0];

      try {
        // Sauvegarder dans Firestore
        await addDoc(collection(db, 'channels', id, 'messages'), {
          _id: message._id,
          text: message.text,
          createdAt: Timestamp.now(),
          user: message.user,
          image: message.image || null,
        });

        // Mettre à jour le dernier message du canal
        await updateDoc(doc(db, 'channels', id), {
          lastMessage: message.text || '📷 Photo',
          lastMessageAt: Timestamp.now(),
        });
      } catch (error) {
        console.error('[Channel] Erreur envoi message:', error);
        Alert.alert('Erreur', "Impossible d'envoyer le message");
      }
    },
    [id]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - PHOTOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Sélectionne et envoie une photo
   */
  const handlePickImage = useCallback(async (): Promise<void> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const imageMessage: IMessage = {
          _id: Math.random().toString(36).substr(2, 9),
          text: '',
          createdAt: new Date(),
          user: currentUser,
          image: `data:image/jpeg;base64,${result.assets[0].base64}`,
        };

        onSend([imageMessage]);
      }
    } catch (error) {
      console.error('[Channel] Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'image');
    }
  }, [currentUser, onSend]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - SONDAGES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Crée un nouveau sondage
   */
  const handleCreatePoll = useCallback((): void => {
    Alert.prompt(
      'Créer un sondage',
      'Quelle est votre question ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Créer',
          onPress: async (question?: string) => {
            if (!question?.trim() || !id) return;

            try {
              await addDoc(collection(db, 'channels', id, 'messages'), {
                _id: Math.random().toString(36).substr(2, 9),
                text: `📊 SONDAGE : ${question}`,
                createdAt: Timestamp.now(),
                user: currentUser,
                poll: {
                  question: question,
                  yes: 0,
                  no: 0,
                  voters: [],
                  createdAt: new Date(),
                  isActive: true,
                },
              });

              await updateDoc(doc(db, 'channels', id), {
                lastMessage: `📊 Sondage : ${question}`,
                lastMessageAt: Timestamp.now(),
              });
            } catch (error) {
              console.error('[Channel] Erreur création sondage:', error);
              Alert.alert('Erreur', 'Impossible de créer le sondage');
            }
          },
        },
      ],
      'plain-text',
      "Êtes-vous d'accord ?"
    );
  }, [id, currentUser]);

  /**
   * Gère un vote sur un sondage
   */
  const handleVote = useCallback(
    async (messageId: string, poll: Poll, voteType: 'yes' | 'no'): Promise<void> => {
      if (!id) return;

      // Vérifier si l'utilisateur a déjà voté
      if (poll.voters?.includes(currentUser._id)) {
        Alert.alert('Déjà voté', 'Vous avez déjà participé à ce sondage');
        return;
      }

      const updatedPoll: Poll = {
        ...poll,
        yes: voteType === 'yes' ? poll.yes + 1 : poll.yes,
        no: voteType === 'no' ? poll.no + 1 : poll.no,
        voters: [...(poll.voters || []), currentUser._id],
      };

      try {
        await updateDoc(doc(db, 'channels', id, 'messages', messageId), {
          poll: updatedPoll,
        });
      } catch (error) {
        console.error('[Channel] Erreur vote:', error);
        Alert.alert('Erreur', 'Impossible d\'enregistrer votre vote');
      }
    },
    [id, currentUser._id]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - SUPPRESSION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Gère l'appui long sur un message (suppression)
   */
  const handleLongPress = useCallback(
    (context: any, message: IMessage): void => {
      if (message.user._id !== currentUser._id) return;

      Alert.alert(
        'Options du message',
        'Que voulez-vous faire ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              if (!id) return;
              try {
                await deleteDoc(doc(db, 'channels', id, 'messages', message._id.toString()));
              } catch (error) {
                Alert.alert('Erreur', 'Impossible de supprimer le message');
              }
            },
          },
        ]
      );
    },
    [id, currentUser._id]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDUS PERSONNALISÉS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Rendu des bulles de message avec support des sondages
   */
  const renderBubble = (props: any): ReactElement => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          left: {
            backgroundColor: colors.messageBubble,
          },
          right: {
            backgroundColor: colors.messageBubbleOwn,
          },
        }}
        textStyle={{
          left: {
            color: colors.messageText,
          },
          right: {
            color: colors.messageTextOwn,
          },
        }}
      />
    );
  };

  /**
   * Rendu personnalisé pour les sondages
   */
  const renderCustomView = (props: any): ReactElement | null => {
    const { currentMessage } = props;

    if (currentMessage.poll) {
      return (
        <PollBubble
          poll={currentMessage.poll}
          messageId={currentMessage._id.toString()}
          currentUserId={currentUser._id}
          onVote={handleVote}
        />
      );
    }

    return null;
  };

  /**
   * Rendu des actions (bouton +)
   */
  const renderActions = (props: any): ReactElement => (
    <Actions
      {...props}
      options={{
        'Envoyer une Photo': handlePickImage,
        'Créer un Sondage': handleCreatePoll,
        Annuler: () => {},
      }}
      icon={() => (
        <View style={[styles.actionsButton, { backgroundColor: colors.primaryTint }]}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </View>
      )}
      onSend={() => {}}
    />
  );

  /**
   * Rendu du bouton d'envoi
   */
  const renderSend = (props: any): ReactElement => (
    <Send {...props} containerStyle={styles.sendContainer}>
      <View style={[styles.sendButton, { backgroundColor: colors.primary }]}>
        <Ionicons name="send" size={18} color="#fff" />
      </View>
    </Send>
  );

  /**
   * Rendu de la barre d'input
   */
  const renderInputToolbar = (props: any): ReactElement => (
    <InputToolbar
      {...props}
      containerStyle={[
        styles.inputToolbar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
      primaryStyle={styles.inputPrimary}
    />
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={currentUser}
        renderBubble={renderBubble}
        renderCustomView={renderCustomView}
        renderActions={renderActions}
        renderSend={renderSend}
        renderInputToolbar={renderInputToolbar}
        onLongPress={(context: any, message: IMessage) => handleLongPress(context, message)}
        renderUsernameOnMessage
        placeholder="Écrivez un message..."
        alwaysShowSend
        scrollToBottom
        scrollToBottomComponent={() => (
          <Ionicons name="chevron-down" size={24} color={colors.primary} />
        )}}
        timeTextStyle={{
          left: { color: colors.textTertiary },
          right: { color: 'rgba(255,255,255,0.7)' },
        }}
        textInputStyle={{
          color: colors.textPrimary,
          backgroundColor: colors.backgroundSecondary,
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingTop: Platform.OS === 'ios' ? 10 : 8,
          marginRight: 8,
        }}
        textInputProps={{
          placeholderTextColor: colors.textTertiary,
        }}
      />

      {/* Info WebRTC */}
      {Platform.OS === 'ios' && (
        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={90} />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 5,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 5,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputToolbar: {
    borderTopWidth: 1,
    paddingVertical: 6,
  },
  inputPrimary: {
    alignItems: 'center',
  },
});
