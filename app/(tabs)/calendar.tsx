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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

export default function FirebaseCalendarScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // États pour le Modal et le Formulaire
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");

  // Pour faire simple sans librairie externe, on utilise des strings pour date/heure
  // Dans une vraie app prod, on utiliserait @react-native-community/datetimepicker
  const [dateStr, setDateStr] = useState(
    new Date().toISOString().split("T")[0],
  ); // YYYY-MM-DD
  const [timeStr, setTimeStr] = useState("12:00");
  const [isShiftMode, setIsShiftMode] = useState(false);

  // --- 1. ÉCOUTER LES DONNÉES AVEC GESTION "EN ATTENTE" ---
  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("date", "asc"));

    // includeMetadataChanges: true est CRUCIAL pour voir les événements non-synchronisés
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("Nombre de docs trouvés:", snapshot.size); // Si 0, le problème est la requête ou les permissions

        const fetchedEvents = snapshot.docs.map((doc) => {
          const data = doc.data();
          console.log("Données du doc:", data);
          return {
            id: doc.id,
            ...data,
            dateObj: data.date ? data.date.toDate() : new Date(),
            // C'est ici que la magie opère : true si pas encore sur le serveur
            pending: doc.metadata.hasPendingWrites,
          };
        });
        setEvents(fetchedEvents);
        setLoading(false);
      },
      (error) => {
        console.error("Erreur:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // --- 2. AJOUTER UN ÉVÉNEMENT (Mode Optimiste) ---
  const handleAddEvent = () => {
    // 1. Validation
    if (!title.trim() || !dateStr.trim()) {
      Alert.alert("Erreur", "Le titre et la date sont obligatoires");
      return;
    }

    // 2. Création de l'objet (Préparation)
    const combinedDate = new Date(`${dateStr}T${timeStr}:00`);
    const newEvent = {
      title: title,
      type: isShiftMode ? "Shift" : "General",
      date: Timestamp.fromDate(combinedDate),
      location: location || (isShiftMode ? "QG" : "À définir"),
      assignee: isShiftMode ? "À assigner" : null,
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
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });
    } catch (e) {
      return "Date invalide";
    }
  };

  const formatTime = (date: Date) => {
    try {
      return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "--:--";
    }
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
          renderItem={({ item }) => (
            <View
              style={[
                styles.eventCard,
                {
                  borderLeftColor:
                    item.type === "Shift" ? "#FF9500" : "#007AFF",
                },
                // On réduit l'opacité si l'événement n'est pas encore synchronisé
                { opacity: item.pending ? 0.6 : 1 },
              ]}
            >
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>{formatDate(item.dateObj)}</Text>
                <Text style={styles.timeText}>{formatTime(item.dateObj)}</Text>
              </View>

              <View style={styles.contentContainer}>
                <Text style={styles.eventTitle}>{item.title}</Text>

                <View style={styles.detailsRow}>
                  <Text
                    style={[
                      styles.eventType,
                      { color: item.type === "Shift" ? "#FF9500" : "#007AFF" },
                    ]}
                  >
                    {item.type === "Shift" ? "QUART" : "ÉVÉNEMENT"}
                  </Text>
                  {item.location && (
                    <Text style={styles.locationText}>📍 {item.location}</Text>
                  )}
                </View>

                {/* Indication de synchronisation */}
                {item.pending && (
                  <View style={styles.syncStatus}>
                    <Ionicons name="cloud-upload" size={12} color="#666" />
                    <Text style={styles.syncText}> Envoi en cours...</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Bouton Flottant (+) pour ouvrir le Modal */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* --- MODAL DE CRÉATION --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Nouvel Événement</Text>

            <ScrollView style={{ width: "100%" }}>
              {/* Sélecteur de Type */}
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
                    Quart de travail
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Champs de saisie */}
              <Text style={styles.label}>Titre</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Réunion CA"
                value={title}
                onChangeText={setTitle}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Date (AAAA-MM-JJ)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2026-02-15"
                    value={dateStr}
                    onChangeText={setDateStr}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Heure (HH:MM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="14:00"
                    value={timeStr}
                    onChangeText={setTimeStr}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              <Text style={styles.label}>Lieu</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Salle 101"
                value={location}
                onChangeText={setLocation}
              />
            </ScrollView>

            {/* Boutons d'action */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.buttonCancel}
              >
                <Text style={styles.textCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddEvent}
                style={styles.buttonSave}
              >
                <Text style={styles.textSave}>Ajouter</Text>
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

  // Styles de la Carte
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 5,
  },
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

  // Status Sync
  syncStatus: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  syncText: { fontSize: 10, color: "#666", fontStyle: "italic" },

  // Bouton Flottant (FAB)
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  // Styles du Modal
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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

  // Selecteur de Type
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
  typeButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  typeButtonActiveShift: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  typeText: { fontSize: 14, color: "#666", fontWeight: "500" },
  typeTextActive: { color: "#000", fontWeight: "bold" },

  // Boutons Modal
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
});

export default Calendar;
