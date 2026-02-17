import React, { useState, useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

export default function FirebaseCalendarScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // États pour le Modal et le Formulaire
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [isShiftMode, setIsShiftMode] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onChangeDate = (event, selectedDate) => {

    if (Platform.OS === 'android') setShowDatePicker(false);
    
    if (selectedDate) {
      const currentDate = new Date(date);
      currentDate.setFullYear(selectedDate.getFullYear());
      currentDate.setMonth(selectedDate.getMonth());
      currentDate.setDate(selectedDate.getDate());
      setDate(currentDate);
    }
  };

  const onChangeTime = (event, selectedTime) => {
    if (Platform.OS === 'android') setShowTimePicker(false);

    if (selectedTime) {
      const currentTime = new Date(date);
      currentTime.setHours(selectedTime.getHours());
      currentTime.setMinutes(selectedTime.getMinutes());
      setDate(currentTime);
    }
  };

  // --- OPTIMISATION DES PICKERS (iOS focus) ---
const openDatePicker = () => {
  setShowTimePicker(false);
  setShowDatePicker(true);
};

const openTimePicker = () => {
  setShowDatePicker(false);
  setShowTimePicker(true);
};

  // --- 1. ÉCOUTER LES DONNÉES ---
  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const fetchedEvents = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dateObj: data.date ? data.date.toDate() : new Date(),
            pending: doc.metadata.hasPendingWrites,
          };
        });
        setEvents(fetchedEvents);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  // --- 2. LOGIQUE DE DATE PASSÉE ---
  const isEventPast = (date: Date) => {
    const now = new Date();
    return date < now;
  };

  // --- 3. SAUVEGARDE (AJOUT OU MODIF) ---
  const handleSaveEvent = async () => {
    if (!title.trim()) {
      Alert.alert("Erreur", "Le titre est obligatoire");
      return;
    }

    // On utilise directement l'objet 'date' qui contient tout (jour + heure)
    if (!editingId && date < new Date()) {
      Alert.alert("Action impossible", "L'événement est dans le passé.");
      return;
    }

    const eventData = {
      title: title,
      type: isShiftMode ? "Shift" : "General",
      date: Timestamp.fromDate(date), // On utilise l'objet Date directement ici
      location: location || (isShiftMode ? "QG" : "À définir"),
      assignee: isShiftMode ? "À assigner" : null,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), eventData);
      } else {
        await addDoc(collection(db, "events"), eventData);
      }
      closeModal();
    } catch (error) {
      Alert.alert("Erreur", "Impossible de sauvegarder.");
    }
  };

  // N'oubliez pas de mettre à jour closeModal pour réinitialiser la date
  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setTitle("");
    setLocation("");
    setDate(new Date()); // Réinitialise à maintenant
  };

  // --- 4. GÉRER L'APPUI LONG (MODIF / SUPPR) ---
  const handleLongPress = (item: any) => {
  Alert.alert(
    "Options de l'événement",
    `Que souhaitez-vous faire pour "${item.title}" ?`,
    [
      { text: "Annuler", style: "cancel" },
      {
        text: "Modifier",
        onPress: () => {
          setEditingId(item.id);
          setTitle(item.title);
          setLocation(item.location);
          setIsShiftMode(item.type === "Shift");
          
          // On met à jour l'objet date directement
          setDate(item.dateObj); 
          
          setModalVisible(true);
        },
      },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "events", item.id));
        },
      },
    ]
  );
};

  // --- 5. FORMATAGE ---
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda OJYQ</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const past = isEventPast(item.dateObj);
            return (
              <TouchableOpacity
                onLongPress={() => handleLongPress(item)}
                delayLongPress={500}
                style={[
                  styles.eventCard,
                  {
                    borderLeftColor:
                      item.type === "Shift" ? "#FF9500" : "#007AFF",
                  },
                  past && styles.pastEventCard,
                  { opacity: item.pending ? 0.6 : 1 },
                ]}
              >
                <View style={styles.dateContainer}>
                  <Text style={[styles.dateText, past && styles.pastText]}>
                    {formatDate(item.dateObj)}
                  </Text>
                  <Text style={styles.timeText}>
                    {formatTime(item.dateObj)}
                  </Text>
                </View>

                <View style={styles.contentContainer}>
                  <Text style={[styles.eventTitle, past && styles.pastText]}>
                    {item.title} {past && "(Terminé)"}
                  </Text>
                  <View style={styles.detailsRow}>
                    <Text
                      style={[
                        styles.eventType,
                        {
                          color: past
                            ? "#888"
                            : item.type === "Shift"
                              ? "#FF9500"
                              : "#007AFF",
                        },
                      ]}
                    >
                      {item.type === "Shift" ? "QUART" : "ÉVÉNEMENT"}
                    </Text>
                    {item.location && (
                      <Text style={styles.locationText}>
                        📍 {item.location}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>
              {editingId ? "Modifier l'événement" : "Nouvel Événement"}
            </Text>
            <ScrollView style={{ width: "100%" }}>
              {/* Type Selector */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    !isShiftMode && styles.typeButtonActive,
                  ]}
                  onPress={() => setIsShiftMode(false)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      !isShiftMode && styles.typeTextActive,
                    ]}
                  >
                    Général
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    isShiftMode && styles.typeButtonActiveShift,
                  ]}
                  onPress={() => setIsShiftMode(true)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      isShiftMode && styles.typeTextActive,
                    ]}
                  >
                    Quart
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Titre</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Nom de l'activité"
              />

              <View style={styles.row}>
                {/* Sélecteur de DATE */}
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Date</Text>
                  <TouchableOpacity
                    style={styles.inputPicker}
                    onPress={openDatePicker}
                  >
                    <Text>{date.toLocaleDateString("fr-FR")}</Text>
                    <Ionicons name="calendar-outline" size={18} color="#666" />
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={onChangeDate}
                      minimumDate={new Date()} // Empêche de choisir une date passée
                    />
                  )}
                </View>

                {/* Sélecteur d'HEURE */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Heure</Text>
                  <TouchableOpacity
                    style={styles.inputPicker}
                    onPress={openTimePicker}
                  >
                    <Text>
                      {date.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Ionicons name="time-outline" size={18} color="#666" />
                  </TouchableOpacity>

                  {showTimePicker && (
                    <DateTimePicker
                      value={date}
                      mode="time"
                      is24Hour={true}
                      display="spinner" // Sélection défilante
                      onChange={onChangeTime}
                    />
                  )}
                </View>
              </View>

              <Text style={styles.label}>Lieu</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Lieu"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={closeModal}
                style={styles.buttonCancel}
              >
                <Text style={styles.textCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEvent}
                style={styles.buttonSave}
              >
                <Text style={styles.textSave}>
                  {editingId ? "Mettre à jour" : "Ajouter"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#333" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 100 },
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 5,
  },
  pastEventCard: { backgroundColor: "#f0f0f0", borderLeftColor: "#ccc" }, // Style grisé
  pastText: { color: "#888", textDecorationLine: "none" },
  dateContainer: {
    marginRight: 15,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#eee",
    paddingRight: 15,
    minWidth: 60,
  },
  dateText: { fontSize: 15, fontWeight: "bold", color: "#333" },
  timeText: { fontSize: 12, color: "#888", marginTop: 4 },
  contentContainer: { flex: 1, justifyContent: "center" },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  detailsRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  eventType: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginRight: 10,
  },
  locationText: { fontSize: 12, color: "#666" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  label: {
    alignSelf: "flex-start",
    color: "#666",
    marginBottom: 5,
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    width: "100%",
    height: 45,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  row: { flexDirection: "row", width: "100%", justifyContent: "space-between" },
  typeSelector: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  typeButtonActive: { backgroundColor: "#fff", elevation: 1 },
  typeButtonActiveShift: { backgroundColor: "#fff", elevation: 1 },
  typeText: { fontSize: 14, color: "#666" },
  typeTextActive: { color: "#000", fontWeight: "bold" },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  buttonCancel: { flex: 1, padding: 12, marginRight: 10, alignItems: "center" },
  buttonSave: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  textCancel: { color: "red", fontWeight: "600" },
  textSave: { color: "white", fontWeight: "bold" },
  inputPicker: {
    width: "100%",
    height: 45,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
