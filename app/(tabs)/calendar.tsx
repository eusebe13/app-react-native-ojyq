/**
 * CalendarScreen - Agenda OJYQ
 * * Vue unifiée affichant:
 * - Événements généraux
 * - Quarts de travail (Shifts)
 * * Fonctionnalités:
 * - Mode Administrateur (création/modification/suppression)
 * - Distinction visuelle événement/quart
 * - Fonctionnement optimiste (sync Firestore)
 * * @module Calendar
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
  Platform,
  ScrollView,
  KeyboardAvoidingView,
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

export default function CalendarScreen(): ReactElement {
  // ÉTATS
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Champs du formulaire (remplacement du DateTimePicker par des strings formidables)
  const [title, setTitle] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [eventType, setEventType] = useState<EventType>('general');
  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]); // AAAA-MM-JJ
  const [timeStr, setTimeStr] = useState<string>('12:00'); // HH:MM
  const [assignee, setAssignee] = useState<string>('');

  // Filtre
  const [filterType, setFilterType] = useState<'all' | EventType>('all');

  // EFFETS
  useEffect(() => {
    const eventsQuery = query(collection(db, 'events'), orderBy('date', 'asc'));

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

  // HANDLERS
  const handleSaveEvent = useCallback(async (): Promise<void> => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle || !dateStr.trim() || !timeStr.trim()) {
      Alert.alert('Erreur', 'Le titre, la date et l\'heure sont obligatoires');
      return;
    }

    // Reconstitution de la date à partir des inputs textes
    const combinedDate = new Date(`${dateStr}T${timeStr}:00`);

    if (!editingId && combinedDate < new Date()) {
      Alert.alert('Action impossible', "L'événement ne peut pas être dans le passé.");
      return;
    }

    const eventData = {
      title: trimmedTitle,
      type: eventType,
      date: Timestamp.fromDate(combinedDate),
      location: location.trim() || (eventType === 'shift' ? 'QG' : 'À définir'),
      assignee: eventType === 'shift' ? assignee || 'À assigner' : null,
      assigneeName: eventType === 'shift' 
        ? MEMBERS.find(m => m.id === assignee)?.name || 'À assigner'
        : null,
      updatedAt: Timestamp.now(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'events', editingId), eventData);
      } else {
        await addDoc(collection(db, 'events'), {
          ...eventData,
          createdAt: Timestamp.now(),
          createdBy: 'admin', 
        });
      }

      closeModal();
    } catch (error) {
      console.error('[Calendar] Erreur sauvegarde:', error);
      Alert.alert('Erreur', "Impossible de sauvegarder l'événement");
    }
  }, [title, location, eventType, dateStr, timeStr, assignee, editingId]);

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
            
            // Formatage des dates pour les inputs
            if (item.dateObj) {
               setDateStr(item.dateObj.toISOString().split('T')[0]);
               setTimeStr(item.dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
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

  const closeModal = useCallback((): void => {
    setModalVisible(false);
    setEditingId(null);
    setTitle('');
    setLocation('');
    setEventType('general');
    setDateStr(new Date().toISOString().split('T')[0]);
    setTimeStr('12:00');
    setAssignee('');
  }, []);

  const filteredEvents = events.filter((event) => {
    if (filterType === 'all') return true;
    return event.type === filterType;
  });

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      
      {/* En-tête */}
      <View className="pt-16 px-5 pb-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Agenda OJYQ
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {events.length} événement{events.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filtres */}
      <View className="px-4 py-3 bg-white dark:bg-gray-800">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'general', 'shift'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              className={`px-4 py-2 rounded-full mr-2 ${filterType === type ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-700'}`}
              onPress={() => setFilterType(type)}
            >
              <Text className={`text-sm font-semibold ${filterType === type ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                {type === 'all' ? 'Tous' : type === 'general' ? 'Événements' : 'Quarts'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des événements */}
      {loading ? (
        <View className="flex-1 justify-center items-center gap-3">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-gray-500 dark:text-gray-400">Chargement...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View className="flex-1 justify-center items-center p-10 gap-2">
          <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
          <Text className="text-lg font-semibold text-gray-500 mt-2">Aucun événement</Text>
          <Text className="text-sm text-center text-gray-400">Appuyez sur + pour en créer un</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard event={item} onLongPress={() => handleLongPress(item)} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bouton d'ajout flottant (FAB) */}
      <TouchableOpacity
        className="absolute right-5 bottom-8 w-14 h-14 rounded-full bg-blue-600 flex justify-center items-center shadow-lg shadow-blue-500/50"
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal de création/édition */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-black/50 justify-center p-5"
        >
          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <Text className="text-xl font-bold text-center text-gray-900 dark:text-white mb-5">
                {editingId ? "Modifier l'événement" : 'Nouvel Événement'}
              </Text>

              {/* Sélecteur de type */}
              <View className="flex-row gap-3 mb-5">
                <TouchableOpacity
                  className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${eventType === 'general' ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-700'}`}
                  onPress={() => setEventType('general')}
                >
                  <Ionicons name="calendar" size={16} color={eventType === 'general' ? '#fff' : '#6B7280'} />
                  <Text className={`font-semibold ${eventType === 'general' ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    Événement
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${eventType === 'shift' ? 'bg-orange-500' : 'bg-gray-100 dark:bg-gray-700'}`}
                  onPress={() => setEventType('shift')}
                >
                  <Ionicons name="time" size={16} color={eventType === 'shift' ? '#fff' : '#6B7280'} />
                  <Text className={`font-semibold ${eventType === 'shift' ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    Quart
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Formulaire */}
              <Text className="text-xs font-semibold text-gray-500 mb-1 ml-1">Titre *</Text>
              <TextInput
                className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl p-3 text-base mb-4"
                placeholder="Nom de l'activité"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
              />

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-gray-500 mb-1 ml-1">Date (AAAA-MM-JJ)</Text>
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl p-3 text-base"
                    placeholder="2026-02-28"
                    placeholderTextColor="#9CA3AF"
                    value={dateStr}
                    onChangeText={setDateStr}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-gray-500 mb-1 ml-1">Heure (HH:MM)</Text>
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl p-3 text-base"
                    placeholder="14:00"
                    placeholderTextColor="#9CA3AF"
                    value={timeStr}
                    onChangeText={setTimeStr}
                  />
                </View>
              </View>

              <Text className="text-xs font-semibold text-gray-500 mb-1 ml-1">Lieu</Text>
              <TextInput
                className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl p-3 text-base mb-4"
                placeholder="Lieu de l'événement"
                placeholderTextColor="#9CA3AF"
                value={location}
                onChangeText={setLocation}
              />

              {eventType === 'shift' && (
                <>
                  <Text className="text-xs font-semibold text-gray-500 mb-2 ml-1">Assigner à</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                    {MEMBERS.map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        className={`px-4 py-2 rounded-full mr-2 ${assignee === member.id ? 'bg-orange-500' : 'bg-gray-100 dark:bg-gray-700'}`}
                        onPress={() => setAssignee(member.id)}
                      >
                        <Text className={`text-xs font-medium ${assignee === member.id ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                          {member.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Boutons d'actions */}
              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  onPress={closeModal}
                  className="flex-1 p-3 rounded-xl border border-red-500 items-center justify-center"
                >
                  <Text className="text-red-500 text-base font-semibold">Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveEvent}
                  className="flex-1 p-3 rounded-xl bg-blue-600 items-center justify-center"
                >
                  <Text className="text-white text-base font-bold">
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