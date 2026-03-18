/**
 * CalendarScreen - Agenda OJYQ
 */

import React, { useState, useEffect, useCallback, ReactElement } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Icon } from '@/components/ui/Icon';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { CalendarItem, EventType, eventFromFirestore } from '../../types/models';
import { useAppTheme } from '../../contexts/ThemeContext';
import { Header } from '@/components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Membres ─────────────────────────────────────────────────────────────────
const MEMBERS = [
  { id: 'cyrille',    name: 'Cyrille Ndungo Kamabu' },
  { id: 'eusebe',     name: 'Eusèbe Hangi Kisoni' },
  { id: 'givia',      name: 'Givia Kavira Tumbura' },
  { id: 'christian',  name: 'Christian Kasereka Ngavo' },
  { id: 'rose',       name: 'Rose Ajabu Nzanzu' },
  { id: 'robert',     name: 'Robert Nzanzu' },
  { id: 'precieuse',  name: 'Précieuse Masika Vindu' },
  { id: 'peguy',      name: 'Péguy K. Tumbura' },
  { id: 'maggie',     name: 'Maggie Tumbura' },
  { id: 'aurelie',    name: 'Aurélie Kavira Kawaya' },
  { id: 'anitha',     name: 'Anitha Furaha Vindu' },
  { id: 'ghislaine',  name: 'Ghislaine Malyabo Vyavuwa' },
  { id: 'lumiere',    name: 'Lumière K. Vitsange' },
  { id: 'annie',      name: 'Sikiminywa Annie Kavugho' },
  { id: 'prince',     name: 'Mumbere Prince Kahanga' },
  { id: 'ushindi',    name: 'Ushindi Sahani Kambale' },
  { id: 'samuel',     name: 'Lwanzo Nzoli Samuel' },
  { id: 'jacquiline', name: 'Jacquiline Mwenge Katungu' },
  { id: 'neige',      name: 'Neige Hangi' },
  { id: 'lea',        name: 'Kavhugho Wahemukire Lea' },
  { id: 'linda',      name: 'Linda Muzibaziba' },
];

// ─── Helper HH:MM fiable ─────────────────────────────────────────────────────
function toHHMM(date: Date): string {
  return [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join(':');
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function CalendarScreen(): ReactElement {
  const { colors, tokens } = useAppTheme();

  const [events,       setEvents]       = useState<CalendarItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);

  const [title,     setTitle]     = useState('');
  const [location,  setLocation]  = useState('');
  const [eventType, setEventType] = useState<EventType>('general');
  const [dateStr,   setDateStr]   = useState(new Date().toISOString().split('T')[0]);
  const [timeStr,   setTimeStr]   = useState('12:00');
  const [assignee,  setAssignee]  = useState('');
  const [filterType, setFilterType] = useState<'all' | EventType>('all');

  // ── Firestore listener ────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        setEvents(snap.docs.map(eventFromFirestore));
        setLoading(false);
      },
      (err) => {
        console.error('[Calendar]', err);
        setLoading(false);
        Alert.alert('Erreur', 'Impossible de charger les événements');
      }
    );
    return unsub;
  }, []);

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const handleSaveEvent = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !dateStr.trim() || !timeStr.trim()) {
      Alert.alert('Erreur', "Le titre, la date et l'heure sont obligatoires");
      return;
    }
    const combinedDate = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(combinedDate.getTime())) {
      Alert.alert('Format invalide', 'Utilisez AAAA-MM-JJ et HH:MM.');
      return;
    }
    if (!editingId && combinedDate < new Date()) {
      Alert.alert('Action impossible', "L'événement ne peut pas être dans le passé.");
      return;
    }

    const data = {
      title: trimmedTitle,
      type: eventType,
      date: Timestamp.fromDate(combinedDate),
      location: location.trim() || (eventType === 'shift' ? 'QG' : 'À définir'),
      assignee:     eventType === 'shift' ? assignee || 'À assigner' : null,
      assigneeName: eventType === 'shift'
        ? MEMBERS.find(m => m.id === assignee)?.name || 'À assigner'
        : null,
      updatedAt: Timestamp.now(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'events', editingId), data);
      } else {
        await addDoc(collection(db, 'events'), { ...data, createdAt: Timestamp.now(), createdBy: 'admin' });
      }
      closeModal();
    } catch {
      Alert.alert('Erreur', "Impossible de sauvegarder l'événement");
    }
  }, [title, location, eventType, dateStr, timeStr, assignee, editingId]);

  // ── Long press ────────────────────────────────────────────────────────────
  const handleLongPress = useCallback((item: CalendarItem) => {
    Alert.alert(
      "Options de l'événement",
      `Que souhaitez-vous faire pour "${item.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Modifier',
          onPress: () => {
            setEditingId(item.id);
            setTitle(item.title);
            setLocation(item.location);
            setEventType(item.type);
            if (item.dateObj) {
              setDateStr(item.dateObj.toISOString().split('T')[0]);
              setTimeStr(toHHMM(item.dateObj));
            }
            if ('assignee' in item && typeof (item as any).assignee === 'string') {
              setAssignee((item as any).assignee);
            }
            setModalVisible(true);
          },
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try { await deleteDoc(doc(db, 'events', item.id)); }
            catch { Alert.alert('Erreur', "Impossible de supprimer l'événement"); }
          },
        },
      ]
    );
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingId(null);
    setTitle('');
    setLocation('');
    setEventType('general');
    setDateStr(new Date().toISOString().split('T')[0]);
    setTimeStr('12:00');
    setAssignee('');
  }, []);

  const filteredEvents = events.filter(e => filterType === 'all' || e.type === filterType);

  const styles = getStyles(colors, tokens);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header
        title="Agenda"
        titleIcon="calendar-month-outline"
        chip={{
          icon: "calendar-check-outline",
          label: (() => {
            const s = new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            });
            return s.charAt(0).toUpperCase() + s.slice(1);
          })(),
        }}
      />

      {/* ── Filtres ── */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'general', 'shift'] as const).map(type => {
            const active = filterType === type;
            const activeColor = type === 'shift' ? colors.accent1 : colors.primary;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  active
                    ? { backgroundColor: activeColor, borderColor: activeColor }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setFilterType(type)}
                activeOpacity={0.75}
              >
                <Icon
                  name={type === 'shift' ? 'clock-time-four-outline' : type === 'general' ? 'calendar-star' : 'view-list-outline'}
                  size={13}
                  color={active ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
                  {type === 'all' ? 'Tous' : type === 'general' ? 'Événements' : 'Quarts'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Liste ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { marginTop: tokens.space.md }]}>Chargement...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { marginTop: tokens.space.lg }]}>Aucun événement</Text>
          <Text style={[styles.emptySubtitle, { marginTop: 4 }]}>
            Appuyez sur + pour en créer un
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isShift = item.type === 'shift';
            const accentColor = isShift ? colors.accent1 : colors.primary;
            const timeString = item.dateObj
              ? toHHMM(item.dateObj)
              : 'Heure inconnue';

            const dayNum   = item.dateObj ? String(item.dateObj.getDate()).padStart(2, '0') : '--';
            const monthStr = item.dateObj
              ? item.dateObj.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase().replace('.', '')
              : '---';

            return (
              <TouchableOpacity
                activeOpacity={0.75}
                onLongPress={() => handleLongPress(item)}
                style={[styles.card, { opacity: item.pending ? 0.6 : 1 }]}
              >
                {/* Left: date column */}
                <View style={[styles.cardDateBlock, {
                  backgroundColor: accentColor + '16',
                  borderRightColor: accentColor + '28',
                }]}>
                  <Text style={[styles.cardDateNum, { color: accentColor }]}>{dayNum}</Text>
                  <Text style={[styles.cardDateMon, { color: accentColor }]}>{monthStr}</Text>
                </View>

                {/* Right: content */}
                <View style={styles.cardContent}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={[styles.cardTypePill, {
                      backgroundColor: isShift ? colors.accent1 + '18' : colors.primary + '14',
                    }]}>
                      <Text style={[styles.cardTypePillText, {
                        color: isShift ? colors.accent1 : colors.primary,
                      }]}>
                        {isShift ? 'QUART' : 'ÉVÉN.'}
                      </Text>
                    </View>
                    {item.pending && (
                      <Icon name="cloud-upload-outline" size={14} color={colors.textTertiary} />
                    )}
                  </View>

                  <View style={styles.cardMetaRow}>
                    <Icon name="clock-outline" size={13} color={colors.textTertiary} />
                    <Text style={styles.cardMetaText}>{timeString}</Text>
                    {!!item.location && item.location !== 'À définir' && (
                      <>
                        <View style={styles.metaDot} />
                        <Icon name="map-marker-outline" size={13} color={colors.textTertiary} />
                        <Text style={[styles.cardMetaText, { flex: 1 }]} numberOfLines={1}>
                          {item.location}
                        </Text>
                      </>
                    )}
                  </View>

                  {isShift && (item as any).assigneeName && (
                    <View style={styles.cardAssigneeRow}>
                      <Icon name="account-circle-outline" size={14} color={colors.accent1} />
                      <Text style={[styles.cardAssigneeText, { color: colors.accent1 }]} numberOfLines={1}>
                        {(item as any).assigneeName}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ── Modal création / édition ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Titre modal */}
              <Text style={styles.modalTitle}>
                {editingId ? "Modifier l'événement" : 'Nouvel Événement'}
              </Text>

              {/* Sélecteur de type */}
              <View style={styles.row}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { backgroundColor: eventType === 'general' ? colors.primary : colors.surfaceDim, marginRight: tokens.space.md },
                  ]}
                  onPress={() => setEventType('general')}
                >
                  <Ionicons name="calendar" size={16} color={eventType === 'general' ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={[styles.typeBtnText, { color: eventType === 'general' ? '#FFFFFF' : colors.textSecondary }]}>
                    Événement
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { backgroundColor: eventType === 'shift' ? colors.accent1 : colors.surfaceDim },
                  ]}
                  onPress={() => setEventType('shift')}
                >
                  <Ionicons name="time" size={16} color={eventType === 'shift' ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={[styles.typeBtnText, { color: eventType === 'shift' ? '#FFFFFF' : colors.textSecondary }]}>
                    Quart
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Titre */}
              <Text style={styles.label}>Titre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom de l'activité"
                placeholderTextColor={colors.textTertiary}
                value={title}
                onChangeText={setTitle}
              />

              {/* Date + Heure */}
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Date (AAAA-MM-JJ)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2026-02-28"
                    placeholderTextColor={colors.textTertiary}
                    value={dateStr}
                    onChangeText={setDateStr}
                  />
                </View>
                <View style={[styles.flex1, { marginLeft: tokens.space.md }]}>
                  <Text style={styles.label}>Heure (HH:MM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="14:00"
                    placeholderTextColor={colors.textTertiary}
                    value={timeStr}
                    onChangeText={setTimeStr}
                  />
                </View>
              </View>

              {/* Lieu */}
              <Text style={styles.label}>Lieu</Text>
              <TextInput
                style={[styles.input, { marginBottom: tokens.space.lg }]}
                placeholder="Lieu de l'événement"
                placeholderTextColor={colors.textTertiary}
                value={location}
                onChangeText={setLocation}
              />

              {/* Assignation quart */}
              {eventType === 'shift' && (
                <>
                  <Text style={styles.label}>Assigner à</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: tokens.space.lg }}>
                    {MEMBERS.map(member => {
                      const sel = assignee === member.id;
                      return (
                        <TouchableOpacity
                          key={member.id}
                          style={[styles.chip, { backgroundColor: sel ? colors.accent1 : colors.surfaceDim, marginRight: tokens.space.sm }]}
                          onPress={() => setAssignee(member.id)}
                        >
                          <Text style={[styles.chipText, { color: sel ? '#FFFFFF' : colors.textSecondary }]}>
                            {member.name.split(' ')[0]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Actions */}
              <View style={[styles.row, { marginTop: tokens.space.sm }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn, { marginRight: tokens.space.md }]}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveEvent}
                >
                  <Text style={styles.saveBtnText}>
                    {editingId ? 'Mettre à jour' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surfaceDim },
    row:       { flexDirection: 'row' },
    flex1:     { flex: 1 },

    // ── Filter bar ─────────────────────────────────────────────────────────────
    filterBar: {
      paddingVertical: tokens.space.md,
    },
    filterScroll: {
      paddingHorizontal: tokens.space.xl,
      gap: tokens.space.sm,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: tokens.space.md,
      paddingVertical: 8,
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
    },
    filterChipText: { fontSize: tokens.font.sm, fontWeight: '600' },
    // keep chip/chipText for the assignee picker inside the modal
    chip: {
      paddingHorizontal: tokens.space.lg,
      paddingVertical: tokens.space.sm,
      borderRadius: tokens.radius.pill,
    },
    chipText: { fontSize: tokens.font.sm, fontWeight: '600' },

    // ── Empty / loading ────────────────────────────────────────────────────────
    centered:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadingText:   { fontSize: tokens.font.base, color: colors.textSecondary },
    emptyTitle:    { fontSize: tokens.font.lg, fontWeight: '700', color: colors.textSecondary, marginTop: tokens.space.lg },
    emptySubtitle: { fontSize: tokens.font.sm, textAlign: 'center', color: colors.textTertiary, marginTop: 4 },

    // ── List ───────────────────────────────────────────────────────────────────
    listContent: { padding: tokens.space.lg, paddingBottom: 100 },

    // ── Event card ─────────────────────────────────────────────────────────────
    card: {
      flexDirection: 'row',
      borderRadius: tokens.radius.lg,
      marginBottom: tokens.space.md,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
    },
    cardDateBlock: {
      width: 62,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: tokens.space.lg,
      borderRightWidth: 1,
      gap: 2,
    },
    cardDateNum: {
      fontSize: 26,
      fontWeight: '800',
      lineHeight: 30,
      letterSpacing: -0.5,
    },
    cardDateMon: {
      fontSize: tokens.font.xs,
      fontWeight: '700',
      letterSpacing: 1,
    },
    cardContent: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      justifyContent: 'center',
      gap: 5,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.space.sm,
    },
    cardTitle: {
      flex: 1,
      fontSize: tokens.font.md,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    cardTypePill: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: tokens.radius.pill,
    },
    cardTypePillText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    cardMetaText: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.textTertiary,
      opacity: 0.5,
      marginHorizontal: 1,
    },
    cardAssigneeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    cardAssigneeText: {
      fontSize: tokens.font.sm,
      fontWeight: '600',
    },

    // ── FAB ───────────────────────────────────────────────────────────────────
    fab: {
      position: 'absolute',
      right: tokens.space.xl,
      bottom: 32,
      width: 58,
      height: 58,
      borderRadius: 29,
      justifyContent: 'center',
      alignItems: 'center',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 10,
    },

    // ── Modal ─────────────────────────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: tokens.space.xl,
    },
    modalSheet: {
      borderRadius: tokens.radius.xl,
      padding: 24,
      maxHeight: '85%',
      backgroundColor: colors.surface,
    },
    modalTitle: {
      fontSize: tokens.font.lg,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: tokens.space.xl,
      color: colors.textPrimary,
    },

    // Sélecteur de type
    typeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: tokens.space.md,
      borderRadius: tokens.radius.md,
      marginBottom: tokens.space.xl,
    },
    typeBtnText: { fontWeight: '600', fontSize: tokens.font.base },

    // Formulaire
    label: {
      fontSize: tokens.font.xs,
      fontWeight: '600',
      marginBottom: 4,
      marginLeft: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: colors.textSecondary,
    },
    input: {
      borderWidth: 1,
      borderRadius: tokens.radius.md,
      padding: tokens.space.md,
      fontSize: tokens.font.md,
      marginBottom: tokens.space.lg,
      backgroundColor: colors.surfaceDim,
      borderColor: colors.border,
      color: colors.textPrimary,
    },

    // Boutons modal
    actionBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: tokens.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtn:     { borderWidth: 1.5, borderColor: colors.accent6 },
    cancelBtnText: { color: colors.accent6, fontSize: tokens.font.md, fontWeight: '600' },
    saveBtnText:   { color: '#FFFFFF', fontSize: tokens.font.md, fontWeight: '700' },
  });
