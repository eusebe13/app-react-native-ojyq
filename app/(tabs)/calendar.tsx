/**
 * CalendarScreen - Agenda OJYQ
 * 
 * Vue unifiée affichant:
 * - Événements généraux
 * - Quarts de travail (Shifts)
 * 
 * Fonctionnalités:
 * - Mode Administrateur (création/modification/suppression)
 * - Distinction visuelle événement/quart
 * - Fonctionnement optimiste (sync Firestore)
 * 
 * @module Calendar
 * @author OJYQ Dev Team
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
  StyleSheet,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { useTheme } from '../../hooks/useTheme';
import { CalendarEvent, EventType, eventFromFirestore } from '../../types/models';
import { EventCard } from '../../components/calendar/EventCard';

// Liste des membres pour l'assignation des quarts
const MEMBERS = [
  { id: 'cyrille', name: 'Cyrille Ndungo Kamabu' },
  { id: 'eusebe', name: 'Eusèbe Hangi Kisoni' },
  { id: 'givia', name: 'Givia Kavira Tumbura' },
  { id: 'christian', name: 'Christian Kasereka Ngavo' },
  { id: 'rose', name: 'Rose Ajabu Nzanzu' },
  { id: 'robert', name: 'Robert Nzanzu' },
  { id: 'precieuse', name: 'Précieuse Masika Vindu' },
  { id: 'peguy', name: 'Péguy K. Tumbura' },
  { id: 'maggie', name: 'Maggie Tumbura' },
  { id: 'aurelie', name: 'Aurélie Kavira Kawaya' },
  { id: 'anitha', name: 'Anitha Furaha Vindu' },
  { id: 'ghislaine', name: 'Ghislaine Malyabo Vyavuwa' },
  { id: 'lumiere', name: 'Lumière K. Vitsange' },
  { id: 'annie', name: 'Sikiminywa Annie Kavugho' },
  { id: 'prince', name: 'Mumbere Prince Kahanga' },
  { id: 'ushindi', name: 'Ushindi Sahani Kambale' },
  { id: 'samuel', name: 'Lwanzo Nzoli Samuel' },
  { id: 'jacquiline', name: 'Jacquiline Mwenge Katungu' },
  { id: 'neige', name: 'Neige Hangi' },
  { id: 'lea', name: 'Kavhugho Wahemukire Lea' },
  { id: 'linda', name: 'Linda Muzibaziba' },
];

/**
 * Écran principal du calendrier
 */
export default function CalendarScreen(): ReactElement {
  const { colors, isDark } = useTheme();

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTATS
  // ═══════════════════════════════════════════════════════════════════════════

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Champs du formulaire
  const [title, setTitle] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [eventType, setEventType] = useState<EventType>('general');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [assignee, setAssignee] = useState<string>('');

  // Pickers
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  // Filtre
  const [filterType, setFilterType] = useState<'all' | EventType>('all');

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFETS - Chargement des événements depuis Firestore
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    /**
     * Écoute en temps réel avec gestion du cache optimiste.
     * includeMetadataChanges permet de détecter les écritures en attente.
     */
    const eventsQuery = query(
      collection(db, 'events'),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(
      eventsQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const fetchedEvents = snapshot.docs.map(eventFromFirestore);
        setEvents(fetchedEvents);
        setLoading(false);
      },
      (error) => {
        console.error('[Calendar] Erreur Firestore:', error);
        setLoading(false);
        Alert.alert('Erreur', 'Impossible de charger les événements');
      }
    );

    return () => unsubscribe();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Vérifie si un événement est dans le passé
   */
  const isEventPast = (date: Date): boolean => {
    return date < new Date();
  };

  /**
   * Sauvegarde un événement (création ou modification)
   */
  const handleSaveEvent = useCallback(async (): Promise<void> => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }

    // Empêcher la création d'événements dans le passé
    if (!editingId && selectedDate < new Date()) {
      Alert.alert('Action impossible', "L'événement ne peut pas être dans le passé.");
      return;
    }

    const eventData = {
      title: trimmedTitle,
      type: eventType,
      date: Timestamp.fromDate(selectedDate),
      location: location.trim() || (eventType === 'shift' ? 'QG' : 'À définir'),
      assignee: eventType === 'shift' ? assignee || 'À assigner' : null,
      assigneeName: eventType === 'shift' 
        ? MEMBERS.find(m => m.id === assignee)?.name || 'À assigner'
        : null,
      updatedAt: Timestamp.now(),
    };

    // 3. UI INSTANTANÉE : On ferme et on vide AVANT d'envoyer
    // C'est ça le secret : on ne bloque pas l'utilisateur
    setModalVisible(false);
    setTitle("");
    setLocation("");

    // 4. Envoi à Firebase en arrière-plan
    // On n'utilise pas "await" ici pour ne pas geler l'écran si le réseau est lent
    addDoc(collection(db, "events"), newEvent)
      .then(() => {
        console.log("Événement synchronisé avec le serveur !");
      })
      .catch((error) => {
        console.error("Erreur d'envoi:", error);
        Alert.alert("Oups", "Erreur lors de la sauvegarde.");
      });

    // Grâce à votre useEffect avec { includeMetadataChanges: true },
    // l'événement apparaîtra immédiatement dans la liste (en local) !
  };

  // --- 3. FORMATAGE ---
  const formatDate = (date: Date) => {
    try {
      if (editingId) {
        await updateDoc(doc(db, 'events', editingId), eventData);
      } else {
        await addDoc(collection(db, 'events'), {
          ...eventData,
          createdAt: Timestamp.now(),
          createdBy: 'admin', // À remplacer par l'ID utilisateur réel
        });
      }

      closeModal();
    } catch (error) {
      console.error('[Calendar] Erreur sauvegarde:', error);
      Alert.alert('Erreur', "Impossible de sauvegarder l'événement");
    }
  }, [title, location, eventType, selectedDate, assignee, editingId]);

  /**
   * Gère l'appui long sur un événement
   */
  const handleLongPress = useCallback((item: CalendarEvent): void => {
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
            setSelectedDate(item.dateObj || new Date());
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
            try {
              await deleteDoc(doc(db, 'events', item.id));
            } catch (error) {
              Alert.alert('Erreur', "Impossible de supprimer l'événement");
            }
          },
        },
      ]
    );
  }, []);

  /**
   * Ferme le modal et réinitialise les champs
   */
  const closeModal = useCallback((): void => {
    setModalVisible(false);
    setEditingId(null);
    setTitle('');
    setLocation('');
    setEventType('general');
    setSelectedDate(new Date());
    setAssignee('');
    setShowDatePicker(false);
    setShowTimePicker(false);
  }, []);

  /**
   * Gère le changement de date
   */
  const handleDateChange = (_event: any, date?: Date): void => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(date.getFullYear());
      newDate.setMonth(date.getMonth());
      newDate.setDate(date.getDate());
      setSelectedDate(newDate);
    }
  };

  /**
   * Gère le changement d'heure
   */
  const handleTimeChange = (_event: any, time?: Date): void => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (time) {
      const newDate = new Date(selectedDate);
      newDate.setHours(time.getHours());
      newDate.setMinutes(time.getMinutes());
      setSelectedDate(newDate);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTRAGE
  // ═══════════════════════════════════════════════════════════════════════════

  const filteredEvents = events.filter((event) => {
    if (filterType === 'all') return true;
    return event.type === filterType;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* En-tête */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Agenda OJYQ
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
          {events.length} événement{events.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filtres */}
      <View style={[styles.filterContainer, { backgroundColor: colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'general', 'shift'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filterType === type ? colors.primary : colors.backgroundSecondary,
                },
              ]}
              onPress={() => setFilterType(type)}
              data-testid={`filter-${type}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: filterType === type ? '#fff' : colors.textSecondary,
                  },
                ]}
              >
                {type === 'all' ? 'Tous' : type === 'general' ? 'Événements' : 'Quarts'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des événements */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
            Chargement...
          </Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            Aucun événement
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Appuyez sur + pour en créer un
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB - Bouton d'ajout */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
        data-testid="add-event-fab"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

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
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {editingId ? "Modifier l'événement" : 'Nouvel Événement'}
              </Text>

              {/* Sélecteur de type */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: eventType === 'general' ? colors.primary : colors.backgroundSecondary,
                    },
                  ]}
                  onPress={() => setEventType('general')}
                  data-testid="type-general-btn"
                >
                  <Ionicons
                    name="calendar"
                    size={16}
                    color={eventType === 'general' ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      { color: eventType === 'general' ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    Événement
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: eventType === 'shift' ? colors.eventShift : colors.backgroundSecondary,
                    },
                  ]}
                  onPress={() => setEventType('shift')}
                  data-testid="type-shift-btn"
                >
                  <Ionicons
                    name="time"
                    size={16}
                    color={eventType === 'shift' ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      { color: eventType === 'shift' ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    Quart de travail
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Titre */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Titre *
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
                placeholder="Nom de l'activité"
                placeholderTextColor={colors.textTertiary}
                value={title}
                onChangeText={setTitle}
                data-testid="event-title-input"
              />

              {/* Date et Heure */}
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Date
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      setShowTimePicker(false);
                      setShowDatePicker(true);
                    }}
                    data-testid="date-picker-btn"
                  >
                    <Text style={{ color: colors.textPrimary }}>
                      {selectedDate.toLocaleDateString('fr-FR')}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Heure
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      setShowDatePicker(false);
                      setShowTimePicker(true);
                    }}
                    data-testid="time-picker-btn"
                  >
                    <Text style={{ color: colors.textPrimary }}>
                      {selectedDate.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Picker */}
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}

              {/* Time Picker */}
              {showTimePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  is24Hour
                  display="spinner"
                  onChange={handleTimeChange}
                />
              )}

              {/* Lieu */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Lieu
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
                placeholder="Lieu de l'événement"
                placeholderTextColor={colors.textTertiary}
                value={location}
                onChangeText={setLocation}
                data-testid="event-location-input"
              />

              {/* Assigné (pour les quarts) */}
              {eventType === 'shift' && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Assigner à
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.membersScroll}
                  >
                    {MEMBERS.map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.memberChip,
                          {
                            backgroundColor:
                              assignee === member.id ? colors.eventShift : colors.backgroundSecondary,
                          },
                        ]}
                        onPress={() => setAssignee(member.id)}
                      >
                        <Text
                          style={[
                            styles.memberChipText,
                            {
                              color: assignee === member.id ? '#fff' : colors.textSecondary,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {member.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Boutons */}
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
                  onPress={handleSaveEvent}
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  data-testid="modal-save-btn"
                >
                  <Text style={styles.saveButtonText}>
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

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
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
    padding: 16,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  // Styles du Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  membersScroll: {
    marginBottom: 16,
  },
  memberChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  memberChipText: {
    fontSize: 12,
    fontWeight: '500',
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
