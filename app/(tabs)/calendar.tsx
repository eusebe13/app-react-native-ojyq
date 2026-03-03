/**
 * CalendarScreen - Agenda OJYQ
 * Réécrit avec StyleSheet React Native pur (sans NativeWind / className)
 * Compatible iOS, Android et Web.
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
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

// ─── Palette de couleurs ──────────────────────────────────────────────────────
const COLORS = {
  blue:        '#2563EB',
  blueLight:   '#DBEAFE',
  orange:      '#F97316',
  orangeLight: '#FFEDD5',
  red:         '#EF4444',
  white:       '#FFFFFF',
  gray50:      '#F9FAFB',
  gray100:     '#F3F4F6',
  gray200:     '#E5E7EB',
  gray300:     '#D1D5DB',
  gray400:     '#9CA3AF',
  gray500:     '#6B7280',
  gray600:     '#4B5563',
  gray700:     '#374151',
  gray800:     '#1F2937',
  gray900:     '#111827',
  // Dark
  dark800:     '#1F2937',
  dark700:     '#374151',
  dark900:     '#111827',
  black50:     'rgba(0,0,0,0.5)',
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function CalendarScreen(): ReactElement {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

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

  // ── Styles dynamiques (dark/light) ────────────────────────────────────────
  const bg        = dark ? COLORS.dark900 : COLORS.gray50;
  const surface   = dark ? COLORS.dark800 : COLORS.white;
  const border    = dark ? COLORS.dark700 : COLORS.gray200;
  const textPrim  = dark ? COLORS.white   : COLORS.gray900;
  const textSecond= dark ? COLORS.gray400 : COLORS.gray500;
  const inputBg   = dark ? COLORS.dark700 : COLORS.gray50;
  const inputBorder = dark ? COLORS.dark700 : COLORS.gray300;
  const chipBg    = dark ? COLORS.dark700 : COLORS.gray100;
  const chipText  = dark ? COLORS.gray300 : COLORS.gray600;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <View style={[s.flex1, { backgroundColor: bg }]}>

      {/* ── En-tête ── */}
      <View style={[s.header, { backgroundColor: surface, borderBottomColor: border }]}>
        <Text style={[s.headerTitle, { color: textPrim }]}>Agenda OJYQ</Text>
        <Text style={[s.headerSub, { color: textSecond }]}>
          {events.length} événement{events.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* ── Filtres ── */}
      <View style={[s.filterBar, { backgroundColor: surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'general', 'shift'] as const).map(type => {
            const active = filterType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[s.chip, { backgroundColor: active ? COLORS.blue : chipBg, marginRight: 8 }]}
                onPress={() => setFilterType(type)}
              >
                <Text style={[s.chipText, { color: active ? COLORS.white : chipText }]}>
                  {type === 'all' ? 'Tous' : type === 'general' ? 'Événements' : 'Quarts'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Liste ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.blue} />
          <Text style={[s.loadingText, { color: textSecond, marginTop: 12 }]}>Chargement...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.gray400} />
          <Text style={[s.emptyTitle, { color: textSecond, marginTop: 16 }]}>Aucun événement</Text>
          <Text style={[s.emptySubtitle, { color: COLORS.gray400, marginTop: 4 }]}>
            Appuyez sur + pour en créer un
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isShift = item.type === 'shift';
            const accentColor = isShift ? COLORS.orange : COLORS.blue;
            const timeString = item.dateObj
              ? toHHMM(item.dateObj)
              : 'Heure inconnue';

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onLongPress={() => handleLongPress(item)}
                style={[
                  s.card,
                  {
                    backgroundColor: surface,
                    borderColor: border,
                    opacity: item.pending ? 0.6 : 1,
                  },
                ]}
              >
                {/* Bande de couleur latérale */}
                <View style={[s.cardAccent, { backgroundColor: accentColor }]} />

                <View style={s.cardBody}>
                  {/* Titre + icône sync */}
                  <View style={s.cardHeader}>
                    <Text
                      style={[s.cardTitle, { color: textPrim }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.pending && (
                      <Ionicons name="cloud-upload-outline" size={16} color={COLORS.gray400} />
                    )}
                  </View>

                  {/* Heure + Lieu */}
                  <View style={[s.row, { marginTop: 8 }]}>
                    <View style={[s.row, { alignItems: 'center', marginRight: 16 }]}>
                      <Ionicons name="time-outline" size={15} color={COLORS.gray500} style={{ marginRight: 4 }} />
                      <Text style={[s.cardMeta, { color: textSecond }]}>{timeString}</Text>
                    </View>
                    <View style={[s.row, { alignItems: 'center', flex: 1 }]}>
                      <Ionicons name="location-outline" size={15} color={COLORS.gray500} style={{ marginRight: 4 }} />
                      <Text style={[s.cardMeta, { color: textSecond, flex: 1 }]} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  </View>

                  {/* Badge quart */}
                  {isShift && (
                    <View style={s.cardBadgeRow}>
                      <View style={[s.cardBadge, { backgroundColor: isShift && dark ? 'rgba(249,115,22,0.2)' : COLORS.orangeLight }]}>
                        <Ionicons name="person" size={13} color={COLORS.orange} style={{ marginRight: 5 }} />
                        <Text style={s.cardBadgeText}>
                          Assigné à : {(item as any).assigneeName || 'À assigner'}
                        </Text>
                      </View>
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
        style={s.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color={COLORS.white} />
      </TouchableOpacity>

      {/* ── Modal création / édition ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={[s.modalSheet, { backgroundColor: surface }]}>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Titre modal */}
              <Text style={[s.modalTitle, { color: textPrim }]}>
                {editingId ? "Modifier l'événement" : 'Nouvel Événement'}
              </Text>

              {/* Sélecteur de type */}
              <View style={s.row}>
                <TouchableOpacity
                  style={[
                    s.typeBtn,
                    { backgroundColor: eventType === 'general' ? COLORS.blue : chipBg, marginRight: 12 },
                  ]}
                  onPress={() => setEventType('general')}
                >
                  <Ionicons name="calendar" size={16} color={eventType === 'general' ? COLORS.white : COLORS.gray500} style={{ marginRight: 6 }} />
                  <Text style={[s.typeBtnText, { color: eventType === 'general' ? COLORS.white : chipText }]}>
                    Événement
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.typeBtn,
                    { backgroundColor: eventType === 'shift' ? COLORS.orange : chipBg },
                  ]}
                  onPress={() => setEventType('shift')}
                >
                  <Ionicons name="time" size={16} color={eventType === 'shift' ? COLORS.white : COLORS.gray500} style={{ marginRight: 6 }} />
                  <Text style={[s.typeBtnText, { color: eventType === 'shift' ? COLORS.white : chipText }]}>
                    Quart
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Titre */}
              <Text style={[s.label, { color: textSecond }]}>Titre *</Text>
              <TextInput
                style={[s.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrim }]}
                placeholder="Nom de l'activité"
                placeholderTextColor={COLORS.gray400}
                value={title}
                onChangeText={setTitle}
              />

              {/* Date + Heure */}
              <View style={s.row}>
                <View style={s.flex1}>
                  <Text style={[s.label, { color: textSecond }]}>Date (AAAA-MM-JJ)</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrim }]}
                    placeholder="2026-02-28"
                    placeholderTextColor={COLORS.gray400}
                    value={dateStr}
                    onChangeText={setDateStr}
                  />
                </View>
                <View style={[s.flex1, { marginLeft: 12 }]}>
                  <Text style={[s.label, { color: textSecond }]}>Heure (HH:MM)</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrim }]}
                    placeholder="14:00"
                    placeholderTextColor={COLORS.gray400}
                    value={timeStr}
                    onChangeText={setTimeStr}
                  />
                </View>
              </View>

              {/* Lieu */}
              <Text style={[s.label, { color: textSecond }]}>Lieu</Text>
              <TextInput
                style={[s.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrim, marginBottom: 16 }]}
                placeholder="Lieu de l'événement"
                placeholderTextColor={COLORS.gray400}
                value={location}
                onChangeText={setLocation}
              />

              {/* Assignation quart */}
              {eventType === 'shift' && (
                <>
                  <Text style={[s.label, { color: textSecond }]}>Assigner à</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {MEMBERS.map(member => {
                      const sel = assignee === member.id;
                      return (
                        <TouchableOpacity
                          key={member.id}
                          style={[s.chip, { backgroundColor: sel ? COLORS.orange : chipBg, marginRight: 8 }]}
                          onPress={() => setAssignee(member.id)}
                        >
                          <Text style={[s.chipText, { color: sel ? COLORS.white : chipText }]}>
                            {member.name.split(' ')[0]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Actions */}
              <View style={[s.row, { marginTop: 8 }]}>
                <TouchableOpacity
                  style={[s.actionBtn, s.cancelBtn, { marginRight: 12 }]}
                  onPress={closeModal}
                >
                  <Text style={s.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.actionBtn, s.saveBtn]}
                  onPress={handleSaveEvent}
                >
                  <Text style={s.saveBtnText}>
                    {editingId ? 'Mettre à jour' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex1:       { flex: 1 },
  row:         { flexDirection: 'row' },

  // En-tête
  header: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  headerSub:   { fontSize: 13, marginTop: 4 },

  // Filtres
  filterBar: { paddingHorizontal: 16, paddingVertical: 12 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  // États vide / chargement
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText:  { fontSize: 14 },
  emptyTitle:   { fontSize: 17, fontWeight: '600' },
  emptySubtitle:{ fontSize: 13, textAlign: 'center' },

  // Liste
  listContent: { padding: 16, paddingBottom: 100 },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.blue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.black50,
    justifyContent: 'center',
    padding: 20,
  },
  modalSheet: {
    borderRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Sélecteur de type
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  typeBtnText: { fontWeight: '600', fontSize: 14 },

  // Formulaire
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },

  // ── Carte événement inline ────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardAccent: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  cardMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardBadgeRow: {
    marginTop: 10,
    flexDirection: 'row',
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.orange,
  },


  // Boutons modal
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn:     { borderWidth: 1.5, borderColor: COLORS.red },
  cancelBtnText: { color: COLORS.red, fontSize: 15, fontWeight: '600' },
  saveBtn:       { backgroundColor: COLORS.blue },
  saveBtnText:   { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});