/**
 * ChatListScreen - Liste des canaux de discussion
 */

import React, { useState, useEffect, useCallback, ReactElement } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, StyleSheet,
  Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, updateDoc, query, orderBy, Timestamp, getDocs
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

function relativeTime(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff  = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)    return 'À l\'instant';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

// Liste des rôles possibles (basée sur ton models.ts)
const OJYQ_ROLES_GROUPS = [
  { id: 'admin', label: 'Administrateur / Admin', roles: ['Administrateur', 'Admin'] },
  { id: 'presidence', label: 'Présidence (Président & Vice)', roles: ['Président', 'Vice-Président'] },
  { id: 'secretariat', label: 'Secrétariat (Secrétaire & Vice)', roles: ['Secrétaire', 'Vice-Secrétaire'] },
  { id: 'tresorerie', label: 'Trésorerie (Trésorier & Vice)', roles: ['Trésorier', 'Vice-Trésorier'] },
  { id: 'communication', label: 'Communication (Resp & Vice)', roles: ['Responsable Communication', 'Vice-Responsable Communication'] },
  { id: 'loisir', label: 'Resp. Loisir', roles: ['Responsable Loisir'] },
  { id: 'discipline', label: 'Resp. Discipline', roles: ['Responsable Discipline'] },
  { id: 'conseiller', label: 'Conseiller', roles: ['Conseiller'] },
  { id: 'membre', label: 'Membre régulier', roles: ['Membre', 'Membre régulier'] },
];

export default function ChatListScreen(): ReactElement {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const currentUser = getAuth().currentUser;
  const [userProfile, setUserProfile] = useState<any>(null);

  // ── États ─────────────────────────────────────────────────────────────────
  const [channels,            setChannels]            = useState<Channel[]>([]);
  const [users,               setUsers]               = useState<any[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [modalVisible,        setModalVisible]        = useState(false);
  const [channelName,         setChannelName]         = useState('');
  const [channelDescription,  setChannelDescription]  = useState('');
  const [editingId,           setEditingId]           = useState<string | null>(null);
  const [searchQuery,         setSearchQuery]         = useState('');

  // Nouveaux états pour la gestion de l'audience
  const [audienceType, setAudienceType] = useState<'public' | 'roles' | 'private'>('public');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // ── Récupération Initiale ──────────────────────────────────────────────────
  useEffect(() => {
    // 1. Récupérer les canaux
    const qChannels = query(collection(db, 'channels'), orderBy('createdAt', 'desc'));
    const unsubChannels = onSnapshot(qChannels,
      (snap) => {
        setChannels(snap.docs.map(channelFromFirestore)); 
        setLoading(false); 
      },
      (err)  => { console.error('[Chat]', err); setLoading(false); }
    );

    // 2. Récupérer le profil de l'utilisateur connecté (pour avoir son rôle)
    let unsubUser = () => {};
    if (currentUser?.uid) {
      unsubUser = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
        if (docSnap.exists()) setUserProfile(docSnap.data());
      });
    }

    // 3. Récupérer la liste de TOUS les utilisateurs (pour le Modal de création)
    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Erreur chargement utilisateurs:", error);
      }
    };
    fetchUsers();

    return () => {
      unsubChannels();
      unsubUser();
    };
  }, [currentUser]);

  // ── Gestion de la sélection (Toggle) ──────────────────────────────────────
  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // ── Sauvegarde canal ──────────────────────────────────────────────────────
  const handleSaveChannel = useCallback(async () => {
    const trimmed = channelName.trim();
    if (!trimmed) { Alert.alert('Erreur', 'Le nom du canal est obligatoire'); return; }
    
    if (audienceType === 'roles' && selectedRoles.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un rôle.'); return;
    }
    if (audienceType === 'private' && selectedUsers.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un membre.'); return;
    }

    try {
      // On extrait tous les rôles réels à partir des groupes sélectionnés
      const finalAllowedRoles = audienceType === 'roles' 
        ? selectedRoles.flatMap(groupId => OJYQ_ROLES_GROUPS.find(g => g.id === groupId)?.roles || [])
        : [];

      // Construction des données d'audience
      const channelData: any = {
        name: trimmed,
        description: channelDescription.trim() || null,
        type: audienceType === 'public' ? 'public' : 'private',
        audienceType: audienceType,
        allowedRoles: finalAllowedRoles, // On insère les rôles combinés
        members: audienceType === 'private' ? [...selectedUsers, currentUser?.uid] : [], // On s'inclut
        updatedAt: Timestamp.now(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'channels', editingId), channelData);
      } else {
        await addDoc(collection(db, 'channels'), {
          ...channelData,
          createdAt: Timestamp.now(),
          createdBy: currentUser?.uid || 'admin',
          lastMessage: 'Canal créé',
          lastMessageAt: Timestamp.now(),
        });
      }
      closeModal();
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder le canal');
    }
  }, [channelName, channelDescription, editingId, audienceType, selectedRoles, selectedUsers, currentUser]);

  const navigateToChannel = useCallback((channel: Channel) => {
    router.push(`/channel/${channel.id}?name=${encodeURIComponent(channel.name)}`);
  }, [router]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setChannelName('');
    setChannelDescription('');
    setEditingId(null);
    setAudienceType('public');
    setSelectedRoles([]);
    setSelectedUsers([]);
  }, []);

  // ── Filtrage de visibilité (Sécurité) ──────────────────────────────────────
  
  // On récupère le rôle exact avec les majuscules (ex: "Vice-Président")
  const userRole = userProfile?.role || 'Membre'; 
  const isAdmin = userRole === 'Administrateur' || userRole === 'Admin';

  // 1. On filtre d'abord selon les droits d'accès
  const visibleChannels = channels.filter((ch: any) => {
    // Règle 1 : Les administrateurs voient TOUS les groupes, sans exception.
    if (isAdmin) return true;

    // 🟢 Règle 2 : Le créateur du groupe voit TOUJOURS son groupe !
    if (ch.createdBy === currentUser?.uid) return true;

    // Règle 3 : Tout le monde voit les canaux publics
    if (!ch.audienceType || ch.audienceType === 'public' || ch.type === 'public') return true;

    // Règle 4 : Canaux par Membres (privé)
    if (ch.audienceType === 'private') {
      return ch.members && ch.members.includes(currentUser?.uid);
    }

    // Règle 5 : Canaux par Rôles
    if (ch.audienceType === 'roles') {
      // Vérifie si "Vice-Président" se trouve dans la liste des rôles autorisés pour ce canal
      return ch.allowedRoles && ch.allowedRoles.includes(userRole);
    }

    return false; // Si aucune condition n'est remplie, on cache le canal
  });

  // 2. On applique ensuite la barre de recherche sur les canaux visibles
  const filteredChannels = visibleChannels.filter(ch =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = getStyles(colors, tokens);

  // ── Rendu d'un canal ──────────────────────────────────────────────────────
  const renderChannel = useCallback(({ item }: { item: any }) => {
    const initials  = channelInitials(item.name);
    const time      = relativeTime(item.lastMessageAt);
    const hasUnread = (item.unreadCount ?? 0) > 0;
    
    // Déterminer l'icône selon le type d'audience
    let AudienceIcon = null;
    if (item.audienceType === 'private') AudienceIcon = <Ionicons name="lock-closed" size={12} color={colors.textTertiary} style={{ marginLeft: 6 }} />;
    if (item.audienceType === 'roles') AudienceIcon = <Ionicons name="people" size={12} color={colors.textTertiary} style={{ marginLeft: 6 }} />;

    return (
      <TouchableOpacity
        style={styles.channelRow}
        onPress={() => navigateToChannel(item)}
        onLongPress={() => { /* Optionnel : Gérer l'édition */ }}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: item.isPinned ? colors.primary : colors.primaryTint }]}>
          <Text style={[styles.avatarText, { color: item.isPinned ? '#FFFFFF' : colors.primary }]}>
            {initials}
          </Text>
        </View>

        <View style={styles.channelBody}>
          <View style={styles.channelTop}>
            <View style={styles.channelNameRow}>
              {item.isPinned && <Ionicons name="pin" size={13} color={colors.primary} style={{ marginRight: 4 }} />}
              <Text style={[styles.channelName, { fontWeight: hasUnread ? '700' : '600' }]} numberOfLines={1}>
                {item.name}
              </Text>
              {AudienceIcon}
            </View>
            <Text style={styles.channelTime}>{time}</Text>
          </View>

          <View style={styles.channelBottom}>
            <Text style={[styles.lastMessage, { fontWeight: hasUnread ? '600' : '400' }]} numberOfLines={1}>
              {item.lastMessage || 'Aucun message'}
            </Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount! > 99 ? '99+' : item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, tokens, navigateToChannel]);


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discussions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

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
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filteredChannels}
          keyExtractor={item => item.id}
          renderItem={renderChannel}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* MODAL DE CRÉATION AVANCÉ */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{editingId ? 'Modifier' : 'Nouveau Canal'}</Text>

            <TextInput
              style={styles.input}
              placeholder="Nom du canal *"
              placeholderTextColor={colors.textTertiary}
              value={channelName}
              onChangeText={setChannelName}
            />

            <TextInput
              style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
              placeholder="Description (optionnel)"
              placeholderTextColor={colors.textTertiary}
              value={channelDescription}
              onChangeText={setChannelDescription}
              multiline
            />

            {/* Sélecteur d'audience */}
            <Text style={styles.label}>Qui peut participer ?</Text>
            <View style={styles.audienceTabs}>
              <TouchableOpacity 
                style={[styles.tabBtn, audienceType === 'public' && { backgroundColor: colors.primary }]}
                onPress={() => setAudienceType('public')}
              >
                <Text style={[styles.tabText, audienceType === 'public' && { color: '#FFF' }]}>Tous</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabBtn, audienceType === 'roles' && { backgroundColor: colors.primary }]}
                onPress={() => setAudienceType('roles')}
              >
                <Text style={[styles.tabText, audienceType === 'roles' && { color: '#FFF' }]}>Rôles</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabBtn, audienceType === 'private' && { backgroundColor: colors.primary }]}
                onPress={() => setAudienceType('private')}
              >
                <Text style={[styles.tabText, audienceType === 'private' && { color: '#FFF' }]}>Membres</Text>
              </TouchableOpacity>
            </View>

            {/* Zone dynamique selon l'audience choisie */}
            <View style={styles.audienceContent}>
              {audienceType === 'public' && (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 10 }}>
                  Tous les membres de l'association pourront voir et participer à ce canal.
                </Text>
              )}

              {audienceType === 'roles' && (
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {/* On utilise la nouvelle liste de groupes */}
                  {OJYQ_ROLES_GROUPS.map(group => (
                    <TouchableOpacity 
                      key={group.id} 
                      style={[styles.checkRow, selectedRoles.includes(group.id) && { backgroundColor: colors.primaryTint }]}
                      onPress={() => toggleRole(group.id)} // La fonction toggleRole reste inchangée !
                    >
                      <Text style={{ color: colors.textPrimary }}>{group.label}</Text>
                      {selectedRoles.includes(group.id) && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {audienceType === 'private' && (
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {users.map(u => (
                    <TouchableOpacity 
                      key={u.id} 
                      style={[styles.checkRow, selectedUsers.includes(u.id) && { backgroundColor: colors.primaryTint }]}
                      onPress={() => toggleUser(u.id)}
                    >
                      <Text style={{ color: colors.textPrimary }}>{u.name || u.email || 'Inconnu'}</Text>
                      {selectedUsers.includes(u.id) && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Boutons d'actions */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChannel}>
                <Text style={styles.saveBtnText}>{editingId ? 'Mettre à jour' : 'Créer'}</Text>
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

    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingHorizontal: tokens.space.xl,
      paddingBottom: 14, borderBottomWidth: 1, backgroundColor: colors.surface, borderBottomColor: colors.border,
    },
    title:  { fontWeight: '800', fontSize: tokens.font.xl, color: colors.textPrimary },
    addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },

    searchWrap: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm, backgroundColor: colors.surface },
    searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: tokens.radius.md, backgroundColor: colors.surfaceDim },
    searchInput: { flex: 1, fontSize: tokens.font.md, color: colors.textPrimary },

    listContent: { paddingBottom: 24 },
    channelRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.lg, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, backgroundColor: colors.surface, borderBottomColor: colors.border },
    avatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    avatarText: { fontWeight: '800', fontSize: tokens.font.sm },
    channelBody:    { flex: 1, minWidth: 0 },
    channelTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
    channelNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: tokens.space.sm },
    channelName:    { fontSize: tokens.font.md, color: colors.textPrimary },
    channelTime:    { fontSize: tokens.font.xs, color: colors.textTertiary },
    channelBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lastMessage:    { flex: 1, marginRight: tokens.space.sm, fontSize: tokens.font.sm, color: colors.textSecondary },
    badge: { backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    badgeText:   { color: '#FFFFFF', fontWeight: '700', fontSize: tokens.font.xs },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, backgroundColor: colors.surface, maxHeight: '90%' },
    modalTitle:   { fontWeight: '800', textAlign: 'center', marginBottom: 20, fontSize: tokens.font.lg, color: colors.textPrimary },
    label: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontSize: tokens.font.xs, color: colors.textSecondary },
    input: { borderWidth: 1, borderRadius: tokens.radius.md, padding: 14, marginBottom: 15, fontSize: tokens.font.md, backgroundColor: colors.surfaceDim, borderColor: colors.border, color: colors.textPrimary },
    
    audienceTabs: { flexDirection: 'row', backgroundColor: colors.surfaceDim, borderRadius: 8, padding: 4, marginBottom: 10 },
    tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
    tabText: { fontWeight: '600', color: colors.textSecondary },
    audienceContent: { minHeight: 60, marginBottom: 15 },
    checkRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },

    modalButtons: { flexDirection: 'row', marginTop: 10 },
    cancelBtn: { flex: 1, padding: 14, borderRadius: tokens.radius.md, borderWidth: 1.5, alignItems: 'center', marginRight: tokens.space.md, borderColor: colors.accent6 },
    cancelBtnText: { color: colors.accent6, fontWeight: '600', fontSize: tokens.font.md },
    saveBtn:       { flex: 1, padding: 14, borderRadius: tokens.radius.md, alignItems: 'center', backgroundColor: colors.primary },
    saveBtnText:   { color: '#FFFFFF', fontWeight: '700', fontSize: tokens.font.md },
  });