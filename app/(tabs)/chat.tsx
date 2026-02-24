/**
 * ChatListScreen - Liste des canaux de discussion
 * 
 * Module Chat type Microsoft Teams avec:
 * - Groupes de discussion (Canaux)
 * - Création/modification/suppression de canaux
 * - Navigation vers les conversations
 * 
 * @module Chat
 * @author OJYQ Dev Team
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useTheme } from '../../hooks/useTheme';
import { Channel, channelFromFirestore } from '../../types/models';
import { ChannelItem } from '../../components/chat/ChannelItem';

/**
 * Écran principal de la liste des discussions
 */
export default function ChatListScreen(): JSX.Element {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTATS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [channelName, setChannelName] = useState<string>('');
  const [channelDescription, setChannelDescription] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFETS - Chargement des canaux depuis Firestore
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    /**
     * Écoute en temps réel les changements dans la collection 'channels'.
     * Les canaux sont triés par date de création (les plus récents en premier).
     */
    const channelsQuery = query(
      collection(db, 'channels'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      channelsQuery,
      (snapshot) => {
        const fetchedChannels = snapshot.docs.map(channelFromFirestore);
        setChannels(fetchedChannels);
        setLoading(false);
      },
      (error) => {
        console.error('[Chat] Erreur Firestore:', error);
        setLoading(false);
        Alert.alert('Erreur', 'Impossible de charger les discussions');
      }
    );

    return () => unsubscribe();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Sauvegarde un canal (création ou modification)
   */
  const handleSaveChannel = useCallback(async (): Promise<void> => {
    const trimmedName = channelName.trim();
    
    if (!trimmedName) {
      Alert.alert('Erreur', 'Le nom du canal est obligatoire');
      return;
    }

    try {
      if (editingId) {
        // Modification d'un canal existant
        await updateDoc(doc(db, 'channels', editingId), {
          name: trimmedName,
          description: channelDescription.trim() || null,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Création d'un nouveau canal
        await addDoc(collection(db, 'channels'), {
          name: trimmedName,
          description: channelDescription.trim() || null,
          type: 'public',
          createdAt: Timestamp.now(),
          lastMessage: 'Canal créé',
          lastMessageAt: Timestamp.now(),
        });
      }

      closeModal();
    } catch (error) {
      console.error('[Chat] Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le canal');
    }
  }, [channelName, channelDescription, editingId]);

  /**
   * Gère l'appui long sur un canal (modifier/supprimer)
   */
  const handleLongPress = useCallback((channel: Channel): void => {
    Alert.alert(
      'Gérer le canal',
      `Que voulez-vous faire avec "${channel.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Modifier',
          onPress: () => {
            setChannelName(channel.name);
            setChannelDescription(channel.description || '');
            setEditingId(channel.id);
            setModalVisible(true);
          },
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'channels', channel.id));
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le canal');
            }
          },
        },
      ]
    );
  }, []);

  /**
   * Navigue vers un canal spécifique
   */
  const navigateToChannel = useCallback((channel: Channel): void => {
    router.push(`/channel/${channel.id}?name=${encodeURIComponent(channel.name)}`);
  }, [router]);

  /**
   * Ferme le modal et réinitialise les champs
   */
  const closeModal = useCallback((): void => {
    setModalVisible(false);
    setChannelName('');
    setChannelDescription('');
    setEditingId(null);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTRAGE
  // ═══════════════════════════════════════════════════════════════════════════

  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* En-tête */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Discussions
        </Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={[styles.addButton, { backgroundColor: colors.primaryTint }]}
          data-testid="create-channel-btn"
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Rechercher un canal..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Liste des canaux */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
            Chargement...
          </Text>
        </View>
      ) : filteredChannels.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            {searchQuery ? 'Aucun résultat' : 'Aucune discussion'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            {searchQuery
              ? 'Essayez une autre recherche'
              : 'Créez un nouveau canal pour commencer'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredChannels}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChannelItem
              channel={item}
              onPress={() => navigateToChannel(item)}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal de création/édition */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.modalBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {editingId ? 'Modifier le canal' : 'Nouveau Canal'}
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Nom du canal *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Ex: Général, Organisation, Finances..."
              placeholderTextColor={colors.textTertiary}
              value={channelName}
              onChangeText={setChannelName}
              autoFocus
              data-testid="channel-name-input"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Description (optionnel)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Décrivez le but de ce canal..."
              placeholderTextColor={colors.textTertiary}
              value={channelDescription}
              onChangeText={setChannelDescription}
              multiline
              numberOfLines={3}
              data-testid="channel-description-input"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={closeModal}
                style={[styles.cancelButton, { borderColor: colors.border }]}
                data-testid="modal-cancel-btn"
              >
                <Text style={[styles.cancelButtonText, { color: colors.error }]}>
                  Annuler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveChannel}
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                data-testid="modal-save-btn"
              >
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Mettre à jour' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
