/**
 * ChatListScreen - Liste des canaux de discussion
 */

import React, { useState, useEffect, useCallback, ReactElement } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, StyleSheet,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, updateDoc, query, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Channel, channelFromFirestore } from '../../types/models';
import { useAppTheme } from '../../contexts/ThemeContext';

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
  if (diff < 60)    return 'À l\'instant';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ChatListScreen(): ReactElement {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();

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

  const styles = getStyles(colors, tokens);

  // ── Rendu d'un canal ──────────────────────────────────────────────────────
  const renderChannel = useCallback(({ item }: { item: Channel }) => {
    const initials  = channelInitials(item.name);
    const time      = relativeTime(item.lastMessageAt);
    const hasUnread = (item.unreadCount ?? 0) > 0;

    return (
      <TouchableOpacity
        style={styles.channelRow}
        onPress={() => navigateToChannel(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar avec initiales */}
        <View style={[styles.avatar, { backgroundColor: item.isPinned ? colors.primary : colors.primaryTint }]}>
          <Text style={[styles.avatarText, { color: item.isPinned ? '#FFFFFF' : colors.primary }]}>
            {initials}
          </Text>
        </View>

        {/* Contenu */}
        <View style={styles.channelBody}>
          <View style={styles.channelTop}>
            <View style={styles.channelNameRow}>
              {item.isPinned && (
                <Ionicons name="pin" size={13} color={colors.primary} style={{ marginRight: 4 }} />
              )}
              <Text
                style={[styles.channelName, { fontWeight: hasUnread ? '700' : '600' }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </View>
            <Text style={styles.channelTime}>{time}</Text>
          </View>

          <View style={styles.channelBottom}>
            <Text
              style={[styles.lastMessage, { fontWeight: hasUnread ? '600' : '400' }]}
              numberOfLines={1}
            >
              {item.lastMessage || 'Aucun message'}
            </Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unreadCount! > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>

          {!!item.description && (
            <Text style={styles.description} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [colors, tokens, navigateToChannel, handleLongPress]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>

      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Discussions</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Recherche */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={colors.textSecondary} style={{ marginRight: tokens.space.sm }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un canal..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Contenu */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { marginTop: tokens.space.md }]}>
            Chargement...
          </Text>
        </View>
      ) : filteredChannels.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { marginTop: tokens.space.lg }]}>
            {searchQuery ? 'Aucun résultat' : 'Aucune discussion'}
          </Text>
          <Text style={[styles.emptySubtitle, { marginTop: 4 }]}>
            {searchQuery ? 'Essayez une autre recherche' : 'Créez un nouveau canal pour commencer'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredChannels}
          keyExtractor={item => item.id}
          renderItem={renderChannel}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal création / édition */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Modifier le canal' : 'Nouveau Canal'}
            </Text>

            <Text style={styles.label}>Nom du canal *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Général, Finances..."
              placeholderTextColor={colors.textTertiary}
              value={channelName}
              onChangeText={setChannelName}
              autoFocus
              onSubmitEditing={handleSaveChannel}
              returnKeyType="done"
            />

            <Text style={styles.label}>Description (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez le but de ce canal..."
              placeholderTextColor={colors.textTertiary}
              value={channelDescription}
              onChangeText={setChannelDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeModal}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveChannel}
              >
                <Text style={styles.saveBtnText}>
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
const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surfaceDim },
    centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 60 : 50,
      paddingHorizontal: tokens.space.xl,
      paddingBottom: 14,
      borderBottomWidth: 1,
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
    },
    title:  { fontWeight: '800', fontSize: tokens.font.xl, color: colors.textPrimary },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryTint,
    },

    // Recherche
    searchWrap: {
      paddingHorizontal: tokens.space.lg,
      paddingVertical: tokens.space.sm,
      backgroundColor: colors.surface,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: tokens.radius.md,
      backgroundColor: colors.surfaceDim,
    },
    searchInput: { flex: 1, fontSize: tokens.font.md, color: colors.textPrimary },

    // États
    loadingText:   { fontSize: tokens.font.base, color: colors.textSecondary },
    emptyTitle:    { fontWeight: '600', fontSize: tokens.font.md, color: colors.textSecondary },
    emptySubtitle: { textAlign: 'center', fontSize: tokens.font.sm, color: colors.textTertiary },

    // Liste
    listContent: { paddingBottom: 24 },

    // Canal row
    channelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: tokens.space.lg,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 48, height: 48, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 14,
    },
    avatarText: { fontWeight: '800', fontSize: tokens.font.sm },
    channelBody:    { flex: 1, minWidth: 0 },
    channelTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
    channelNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: tokens.space.sm },
    channelName:    { fontSize: tokens.font.md, color: colors.textPrimary },
    channelTime:    { fontSize: tokens.font.xs, color: colors.textTertiary },
    channelBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lastMessage:    { flex: 1, marginRight: tokens.space.sm, fontSize: tokens.font.sm, color: colors.textSecondary },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    badgeText:   { color: '#FFFFFF', fontWeight: '700', fontSize: tokens.font.xs },
    description: { marginTop: 2, fontSize: tokens.font.xs, color: colors.textTertiary },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: tokens.space.xl },
    modalSheet:   { borderRadius: tokens.radius.xl, padding: 24, backgroundColor: colors.surface },
    modalTitle:   { fontWeight: '700', textAlign: 'center', marginBottom: tokens.space.xl, fontSize: tokens.font.lg, color: colors.textPrimary },
    label: {
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
      marginLeft: 4,
      fontSize: tokens.font.xs,
      color: colors.textSecondary,
    },
    input: {
      borderWidth: 1,
      borderRadius: tokens.radius.md,
      padding: 14,
      marginBottom: tokens.space.lg,
      fontSize: tokens.font.md,
      backgroundColor: colors.surfaceDim,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    textArea:     { minHeight: 80, textAlignVertical: 'top' },
    modalButtons: { flexDirection: 'row', marginTop: tokens.space.sm },
    cancelBtn: {
      flex: 1, padding: 14, borderRadius: tokens.radius.md,
      borderWidth: 1.5, alignItems: 'center',
      marginRight: tokens.space.md,
      borderColor: colors.accent6,
    },
    cancelBtnText: { color: colors.accent6, fontWeight: '600', fontSize: tokens.font.md },
    saveBtn:       { flex: 1, padding: 14, borderRadius: tokens.radius.md, alignItems: 'center', backgroundColor: colors.primary },
    saveBtnText:   { color: '#FFFFFF', fontWeight: '700', fontSize: tokens.font.md },
  });
