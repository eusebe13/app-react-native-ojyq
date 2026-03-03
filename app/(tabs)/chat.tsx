/**
 * ChatListScreen - Liste des canaux de discussion
 * Réécriture : suppression de useTheme et ChannelItem (tout intégré inline)
 */

import React, { useState, useEffect, useCallback, ReactElement } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, StyleSheet,
  Platform, KeyboardAvoidingView, useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, updateDoc, query, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Channel, channelFromFirestore } from '../../types/models';

// ─── Palette (identique à ChannelScreen) ─────────────────────────────────────
const C = {
  blue:      '#2563EB',
  blueLight: '#DBEAFE',
  red:       '#EF4444',
  white:     '#FFFFFF',
  gray50:    '#F9FAFB',
  gray100:   '#F3F4F6',
  gray200:   '#E5E7EB',
  gray300:   '#D1D5DB',
  gray400:   '#9CA3AF',
  gray500:   '#6B7280',
  gray700:   '#374151',
  gray800:   '#1F2937',
  gray900:   '#111827',
  overlay:   'rgba(0,0,0,0.5)',
};

// ─── Taille responsive (identique à ChannelScreen) ───────────────────────────
const isWeb = Platform.OS === 'web';
const FS = {
  xs:   isWeb ? 13 : 11,
  sm:   isWeb ? 15 : 13,
  base: isWeb ? 17 : 15,
  lg:   isWeb ? 19 : 17,
  xl:   isWeb ? 22 : 19,
};

// ─── Helper : initiales du canal ─────────────────────────────────────────────
function channelInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Helper : formatage du temps relatif ─────────────────────────────────────
function relativeTime(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff  = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)   return 'À l\'instant';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400)return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ChatListScreen(): ReactElement {
  const router = useRouter();
  const scheme = useColorScheme();
  const dark   = scheme === 'dark';

  // ── Couleurs dynamiques ───────────────────────────────────────────────────
  const bg       = dark ? C.gray900 : C.gray50;
  const surface  = dark ? C.gray800 : C.white;
  const border   = dark ? C.gray700 : C.gray200;
  const textPrim = dark ? C.white   : C.gray900;
  const textSec  = dark ? C.gray400 : C.gray500;
  const inputBg  = dark ? C.gray700 : C.gray100;

  // ── États ─────────────────────────────────────────────────────────────────
  const [channels,            setChannels]            = useState<Channel[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [modalVisible,        setModalVisible]        = useState(false);
  const [channelName,         setChannelName]         = useState('');
  const [channelDescription,  setChannelDescription]  = useState('');
  const [editingId,           setEditingId]           = useState<string | null>(null);
  const [searchQuery,         setSearchQuery]         = useState('');

  // ── Firestore listener ────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'channels'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q,
      (snap) => { setChannels(snap.docs.map(channelFromFirestore)); setLoading(false); },
      (err)  => { console.error('[Chat]', err); setLoading(false); Alert.alert('Erreur', 'Impossible de charger les discussions'); }
    );
    return unsub;
  }, []);

  // ── Sauvegarde canal ──────────────────────────────────────────────────────
  const handleSaveChannel = useCallback(async () => {
    const trimmed = channelName.trim();
    if (!trimmed) { Alert.alert('Erreur', 'Le nom du canal est obligatoire'); return; }
    try {
      if (editingId) {
        await updateDoc(doc(db, 'channels', editingId), {
          name: trimmed,
          description: channelDescription.trim() || null,
          updatedAt: Timestamp.now(),
        });
      } else {
        await addDoc(collection(db, 'channels'), {
          name: trimmed,
          description: channelDescription.trim() || null,
          type: 'public',
          createdAt: Timestamp.now(),
          lastMessage: 'Canal créé',
          lastMessageAt: Timestamp.now(),
        });
      }
      closeModal();
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder le canal');
    }
  }, [channelName, channelDescription, editingId]);

  // ── Long press ────────────────────────────────────────────────────────────
  const handleLongPress = useCallback((channel: Channel) => {
    Alert.alert('Gérer le canal', `Que voulez-vous faire avec "${channel.name}" ?`, [
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
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try { await deleteDoc(doc(db, 'channels', channel.id)); }
          catch { Alert.alert('Erreur', 'Impossible de supprimer le canal'); }
        },
      },
    ]);
  }, []);

  const navigateToChannel = useCallback((channel: Channel) => {
    router.push(`/channel/${channel.id}?name=${encodeURIComponent(channel.name)}`);
  }, [router]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setChannelName('');
    setChannelDescription('');
    setEditingId(null);
  }, []);

  const filteredChannels = channels.filter(ch =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Rendu d'un canal (inline, remplace ChannelItem) ───────────────────────
  const renderChannel = useCallback(({ item }: { item: Channel }) => {
    const initials   = channelInitials(item.name);
    const time       = relativeTime(item.lastMessageAt);
    const hasUnread  = (item.unreadCount ?? 0) > 0;

    return (
      <TouchableOpacity
        style={[s.channelRow, { backgroundColor: surface, borderBottomColor: border }]}
        onPress={() => navigateToChannel(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar avec initiales */}
        <View style={[s.avatar, { backgroundColor: item.isPinned ? C.blue : C.blueLight }]}>
          <Text style={[s.avatarText, { color: item.isPinned ? C.white : C.blue, fontSize: FS.sm }]}>
            {initials}
          </Text>
        </View>

        {/* Contenu */}
        <View style={s.channelBody}>
          <View style={s.channelTop}>
            {/* Nom + épinglé */}
            <View style={s.channelNameRow}>
              {item.isPinned && (
                <Ionicons name="pin" size={13} color={C.blue} style={{ marginRight: 4 }} />
              )}
              <Text style={[s.channelName, { color: textPrim, fontSize: FS.base, fontWeight: hasUnread ? '700' : '600' }]}
                numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            {/* Heure */}
            <Text style={[s.channelTime, { color: textSec, fontSize: FS.xs }]}>{time}</Text>
          </View>

          <View style={s.channelBottom}>
            {/* Dernier message */}
            <Text style={[s.lastMessage, { color: textSec, fontSize: FS.sm, fontWeight: hasUnread ? '600' : '400' }]}
              numberOfLines={1}>
              {item.lastMessage || 'Aucun message'}
            </Text>
            {/* Badge non lu */}
            {hasUnread && (
              <View style={s.badge}>
                <Text style={[s.badgeText, { fontSize: FS.xs }]}>
                  {item.unreadCount! > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>

          {/* Description si présente */}
          {!!item.description && (
            <Text style={[s.description, { color: textSec, fontSize: FS.xs }]} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [dark, surface, border, textPrim, textSec]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={[s.flex1, { backgroundColor: bg }]}>

      {/* En-tête */}
      <View style={[s.header, { backgroundColor: surface, borderBottomColor: border }]}>
        <Text style={[s.title, { color: textPrim, fontSize: FS.xl }]}>Discussions</Text>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: C.blueLight }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={C.blue} />
        </TouchableOpacity>
      </View>

      {/* Recherche */}
      <View style={[s.searchWrap, { backgroundColor: surface }]}>
        <View style={[s.searchBar, { backgroundColor: inputBg }]}>
          <Ionicons name="search" size={17} color={textSec} style={{ marginRight: 8 }} />
          <TextInput
            style={[s.searchInput, { color: textPrim, fontSize: FS.base }]}
            placeholder="Rechercher un canal..."
            placeholderTextColor={textSec}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color={textSec} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Contenu */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.blue} />
          <Text style={[s.loadingText, { color: textSec, marginTop: 12, fontSize: FS.sm }]}>
            Chargement...
          </Text>
        </View>
      ) : filteredChannels.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="chatbubbles-outline" size={48} color={C.gray400} />
          <Text style={[s.emptyTitle, { color: textSec, marginTop: 16, fontSize: FS.base }]}>
            {searchQuery ? 'Aucun résultat' : 'Aucune discussion'}
          </Text>
          <Text style={[s.emptySubtitle, { color: C.gray400, marginTop: 4, fontSize: FS.sm }]}>
            {searchQuery ? 'Essayez une autre recherche' : 'Créez un nouveau canal pour commencer'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredChannels}
          keyExtractor={item => item.id}
          renderItem={renderChannel}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal création / édition */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={[s.modalSheet, { backgroundColor: surface }]}>
            <Text style={[s.modalTitle, { color: textPrim, fontSize: FS.lg }]}>
              {editingId ? 'Modifier le canal' : 'Nouveau Canal'}
            </Text>

            <Text style={[s.label, { color: textSec, fontSize: FS.xs }]}>Nom du canal *</Text>
            <TextInput
              style={[s.input, { backgroundColor: inputBg, borderColor: border, color: textPrim, fontSize: FS.base }]}
              placeholder="Ex: Général, Finances..."
              placeholderTextColor={C.gray400}
              value={channelName}
              onChangeText={setChannelName}
              autoFocus
              onSubmitEditing={handleSaveChannel}
              returnKeyType="done"
            />

            <Text style={[s.label, { color: textSec, fontSize: FS.xs }]}>Description (optionnel)</Text>
            <TextInput
              style={[s.input, s.textArea, { backgroundColor: inputBg, borderColor: border, color: textPrim, fontSize: FS.base }]}
              placeholder="Décrivez le but de ce canal..."
              placeholderTextColor={C.gray400}
              value={channelDescription}
              onChangeText={setChannelDescription}
              multiline
              numberOfLines={3}
            />

            <View style={s.modalButtons}>
              <TouchableOpacity
                style={[s.cancelBtn, { borderColor: C.red }]}
                onPress={closeModal}
              >
                <Text style={[s.cancelBtnText, { fontSize: FS.base }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: C.blue }]}
                onPress={handleSaveChannel}
              >
                <Text style={[s.saveBtnText, { fontSize: FS.base }]}>
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

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  flex1:   { flex: 1 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title:  { fontWeight: '800' },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // Recherche
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: { flex: 1 },

  // États
  loadingText:  {},
  emptyTitle:   { fontWeight: '600' },
  emptySubtitle:{ textAlign: 'center' },

  // Liste
  listContent: { paddingBottom: 24 },

  // Canal row (remplace ChannelItem)
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { fontWeight: '800' },
  channelBody: { flex: 1, minWidth: 0 },
  channelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  channelNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  channelName: {},
  channelTime: {},
  channelBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: C.blue,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: C.white, fontWeight: '700' },
  description: { marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', padding: 20 },
  modalSheet:   { borderRadius: 24, padding: 24 },
  modalTitle:   { fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  label: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1, borderRadius: 12,
    padding: 14, marginBottom: 16,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center',
    marginRight: 12,
  },
  cancelBtnText: { color: C.red, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: C.white, fontWeight: '700' },
});