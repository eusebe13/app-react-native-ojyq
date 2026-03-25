import { Header } from "@/components/Header";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../firebaseConfig";

export default function FirebaseCalendarScreen() {
  const auth = getAuth();
  const user = auth.currentUser;
  const { colors, isDark } = useAppTheme();

  // Fusionner tous les styles (dynamiques + statiques) basés sur le thème
  const getAllStyles = (): any => ({
    // Container & Layout
    container: { flex: 1, backgroundColor: colors.surface },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    listContent: { padding: 16, paddingBottom: 100 },

    // Header
    header: {
      paddingTop: 60,
      paddingBottom: 20,
      paddingHorizontal: 20,
      backgroundColor: colors.surfaceDim,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.textPrimary,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalView: {
      width: "90%",
      backgroundColor: colors.surfaceDim,
      borderRadius: 20,
      padding: 25,
      alignItems: "center",
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 20,
      color: colors.textPrimary,
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginTop: 10,
    },

    // Form Elements
    label: {
      alignSelf: "flex-start",
      color: colors.textSecondary,
      marginBottom: 5,
      fontSize: 12,
      fontWeight: "600",
    },
    input: {
      width: "100%",
      height: 45,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      marginBottom: 15,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
    },
    inputPicker: {
      width: "100%",
      height: 45,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      marginBottom: 15,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    datePickerText: {
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
    },
    row: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-between",
    },

    // Tabs
    tabsContainer: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surfaceDim,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginHorizontal: 4,
      backgroundColor: colors.surface,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 6,
      fontWeight: "500",
    },
    tabTextActive: {
      color: colors.surface,
      fontWeight: "bold",
    },

    // Event Cards
    eventCard: {
      flexDirection: "row",
      backgroundColor: colors.surfaceDim,
      padding: 15,
      borderRadius: 12,
      marginBottom: 12,
      elevation: 2,
      borderLeftWidth: 5,
    },
    pastEventCard: {
      backgroundColor: colors.surface,
      borderLeftColor: colors.border,
    },
    pastText: { color: colors.textSecondary, textDecorationLine: "none" },
    dateContainer: {
      marginRight: 15,
      alignItems: "center",
      justifyContent: "center",
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingRight: 15,
      minWidth: 60,
    },
    dateText: { fontSize: 15, fontWeight: "bold", color: colors.textPrimary },
    timeText: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    contentContainer: { flex: 1, justifyContent: "center" },
    eventTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    detailsRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    eventType: {
      fontSize: 10,
      fontWeight: "bold",
      textTransform: "uppercase",
      marginRight: 10,
    },
    locationText: { fontSize: 12, color: colors.textSecondary },

    // Availability Cards
    availabilityCard: {
      flexDirection: "row",
      backgroundColor: colors.surfaceDim,
      padding: 15,
      borderRadius: 12,
      marginBottom: 12,
      elevation: 2,
      borderLeftWidth: 5,
      borderLeftColor: colors.accent5,
      alignItems: "center",
    },
    availabilityTimeText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    availabilityDateText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    emptyContainer: {
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textTertiary,
      textAlign: "center",
    },

    // Days Selection
    daysContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    dayButton: {
      width: "13%",
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
      alignItems: "center",
      marginBottom: 8,
    },
    dayButtonActive: {
      backgroundColor: colors.primary,
    },
    dayText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: "600",
    },
    dayTextActive: {
      color: colors.surface,
    },

    // Buttons
    fab: {
      position: "absolute",
      right: 20,
      bottom: 30,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      elevation: 8,
    },
    buttonCancel: {
      flex: 1,
      padding: 12,
      marginRight: 10,
      alignItems: "center",
    },
    buttonSave: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
    },
    textCancel: { color: colors.accent6, fontWeight: "600" },
    textSave: { color: colors.surface, fontWeight: "bold" },

    // Type Selector (legacy)
    typeSelector: {
      flexDirection: "row",
      width: "100%",
      marginBottom: 20,
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 4,
    },
    typeButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 6,
    },
    typeButtonActive: { backgroundColor: colors.surfaceDim, elevation: 1 },
    typeButtonActiveShift: { backgroundColor: colors.surfaceDim, elevation: 1 },
    typeText: { fontSize: 14, color: colors.textSecondary },
    typeTextActive: { color: colors.textPrimary, fontWeight: "bold" },
  });

  const dynamicStyles = getAllStyles();

  const [events, setEvents] = useState<any[]>([]);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"events" | "availability">("events");

  // États pour le Modal et le Formulaire
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // États pour les disponibilités
  const [availabilityModalVisible, setAvailabilityModalVisible] =
    useState(false);
  const [availabilityStartTime, setAvailabilityStartTime] = useState(
    new Date(),
  );
  const [availabilityEndTime, setAvailabilityEndTime] = useState(new Date());
  const [showAvailabilityStartTimePicker, setShowAvailabilityStartTimePicker] =
    useState(false);
  const [showAvailabilityEndTimePicker, setShowAvailabilityEndTimePicker] =
    useState(false);
  const [selectedDays, setSelectedDays] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ]); // lundi à dimanche

  const onChangeDate = (event: any, selectedDate: any) => {
    if (Platform.OS === "android") setShowDatePicker(false);

    if (selectedDate) {
      const currentDate = new Date(date);
      currentDate.setFullYear(selectedDate.getFullYear());
      currentDate.setMonth(selectedDate.getMonth());
      currentDate.setDate(selectedDate.getDate());
      setDate(currentDate);
    }
  };

  const onChangeTime = (event: any, selectedTime: any) => {
    if (Platform.OS === "android") setShowTimePicker(false);

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
    if (!user) return;

    // Charger les événements
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

    // Charger les disponibilités de l'utilisateur actuel
    const availabilityQuery = query(
      collection(db, "users", user.uid, "availabilities"),
    );
    const unsubscribeAvailability = onSnapshot(
      availabilityQuery,
      (snapshot) => {
        const fetchedAvailabilities = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          };
        });
        setAvailabilities(fetchedAvailabilities);
      },
    );

    return () => {
      unsubscribe();
      unsubscribeAvailability();
    };
  }, [user]);

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
      type: "General",
      date: Timestamp.fromDate(date),
      location: location || "À définir",
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
    setDate(new Date());
  };

  // --- HANDLERS POUR LES DISPONIBILITÉS ---
  const handleSaveAvailability = async () => {
    if (!user) return;

    if (availabilityStartTime >= availabilityEndTime) {
      Alert.alert("Erreur", "L'heure de fin doit être après l'heure de début");
      return;
    }

    if (!selectedDays.some(Boolean)) {
      Alert.alert("Erreur", "Sélectionnez au moins un jour");
      return;
    }

    try {
      const days = [
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
        "Dimanche",
      ];
      const selectedDayNames = days.filter((_, i) => selectedDays[i]);

      const startHours = availabilityStartTime.getHours();
      const startMinutes = availabilityStartTime.getMinutes();
      const endHours = availabilityEndTime.getHours();
      const endMinutes = availabilityEndTime.getMinutes();

      await addDoc(collection(db, "users", user.uid, "availabilities"), {
        days: selectedDayNames,
        startHours,
        startMinutes,
        endHours,
        endMinutes,
        isRecurring: true,
        createdAt: Timestamp.now(),
      });

      Alert.alert("Succès", "Disponibilité récurrente enregistrée");
      closeAvailabilityModal();
    } catch (error) {
      console.error("Erreur:", error);
      Alert.alert("Erreur", "Impossible de sauvegarder la disponibilité");
    }
  };

  const closeAvailabilityModal = () => {
    setAvailabilityModalVisible(false);
    setAvailabilityStartTime(new Date());
    setAvailabilityEndTime(new Date());
    setSelectedDays([false, false, false, false, false, false, false]);
  };

  const handleDeleteAvailability = async (id: string) => {
    if (!user) return;

    Alert.alert(
      "Confirmer la suppression",
      "Êtes-vous sûr de vouloir supprimer cette disponibilité ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "users", user.uid, "availabilities", id));
              Alert.alert("Succès", "Disponibilité supprimée");
            } catch (error) {
              console.error("Erreur:", error);
              Alert.alert("Erreur", "Impossible de supprimer");
            }
          },
        },
      ],
    );
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
      ],
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
    <SafeAreaView style={[dynamicStyles.container]} edges={["top"]}>
      <Header
        title="Agenda OJYQ"
        titleIcon="calendar-outline"
        chip={{
          icon: "calendar-outline",
          label: `${events.length} ${events.length > 1 ? "Événements" : "Événement"}`,
        }}
      />

      {/* ONGLETS */}
      <View style={[dynamicStyles.tabsContainer]}>
        <TouchableOpacity
          style={[
            dynamicStyles.tab,
            viewMode === "events" && dynamicStyles.tabActive,
          ]}
          onPress={() => setViewMode("events")}
        >
          <Ionicons
            name="calendar"
            size={20}
            color={
              viewMode === "events" ? colors.surface : colors.textSecondary
            }
          />
          <Text
            style={[
              dynamicStyles.tabText,
              viewMode === "events" && dynamicStyles.tabTextActive,
            ]}
          >
            Événements
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            dynamicStyles.tab,
            viewMode === "availability" && dynamicStyles.tabActive,
          ]}
          onPress={() => setViewMode("availability")}
        >
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={
              viewMode === "availability"
                ? colors.surface
                : colors.textSecondary
            }
          />
          <Text
            style={[
              dynamicStyles.tabText,
              viewMode === "availability" && dynamicStyles.tabTextActive,
            ]}
          >
            Disponibilités
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={dynamicStyles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : viewMode === "events" ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={dynamicStyles.listContent}
          renderItem={({ item }) => {
            const past = isEventPast(item.dateObj);
            return (
              <TouchableOpacity
                onLongPress={() => handleLongPress(item)}
                delayLongPress={500}
                style={[
                  dynamicStyles.eventCard,
                  {
                    borderLeftColor:
                      item.type === "Shift" ? "#FF9500" : "#007AFF",
                  },
                  past && dynamicStyles.pastEventCard,
                  { opacity: item.pending ? 0.6 : 1 },
                ]}
              >
                <View style={dynamicStyles.dateContainer}>
                  <Text
                    style={[
                      dynamicStyles.dateText,
                      past && dynamicStyles.pastText,
                    ]}
                  >
                    {formatDate(item.dateObj)}
                  </Text>
                  <Text style={dynamicStyles.timeText}>
                    {formatTime(item.dateObj)}
                  </Text>
                </View>

                <View style={dynamicStyles.contentContainer}>
                  <Text
                    style={[
                      dynamicStyles.eventTitle,
                      past && dynamicStyles.pastText,
                    ]}
                  >
                    {item.title} {past && "(Terminé)"}
                  </Text>
                  <View style={dynamicStyles.detailsRow}>
                    <Text
                      style={[
                        dynamicStyles.eventType,
                        {
                          color: past ? "#888" : "#007AFF",
                        },
                      ]}
                    >
                      ÉVÉNEMENT
                    </Text>
                    {item.location && (
                      <Text style={dynamicStyles.locationText}>
                        📍 {item.location}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={availabilities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={dynamicStyles.listContent}
          ListEmptyComponent={
            <View style={dynamicStyles.emptyContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={48}
                color="#999"
              />
              <Text style={dynamicStyles.emptyText}>
                Aucune disponibilité enregistrée
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onLongPress={() => handleDeleteAvailability(item.id)}
              delayLongPress={500}
              style={[dynamicStyles.availabilityCard]}
            >
              <View style={dynamicStyles.dateContainer}>
                <Text style={dynamicStyles.dateText}>
                  {Array.isArray(item.days)
                    ? item.days.join(", ")
                    : "Jours multiples"}
                </Text>
              </View>

              <View style={dynamicStyles.contentContainer}>
                <Text style={dynamicStyles.eventTitle}>
                  {String(item.startHours).padStart(2, "0")}:
                  {String(item.startMinutes).padStart(2, "0")} -{" "}
                  {String(item.endHours).padStart(2, "0")}:
                  {String(item.endMinutes).padStart(2, "0")}
                </Text>
                <Text style={dynamicStyles.locationText}>
                  Disponible • Appuyez longuement pour supprimer
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={[dynamicStyles.fab]}
        onPress={() =>
          viewMode === "events"
            ? setModalVisible(true)
            : setAvailabilityModalVisible(true)
        }
      >
        <Ionicons name="add" size={30} color={colors.surface} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalView}>
            <Text style={[dynamicStyles.modalTitle]}>
              {editingId ? "Modifier l'événement" : "Nouvel Événement"}
            </Text>
            <ScrollView style={{ width: "100%" }}>
              <Text style={dynamicStyles.label}>Titre</Text>
              <TextInput
                style={dynamicStyles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Nom de l'activité"
              />

              <View style={dynamicStyles.row}>
                {/* Sélecteur de DATE */}
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={dynamicStyles.label}>Date</Text>
                  <TouchableOpacity
                    style={dynamicStyles.inputPicker}
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
                  <Text style={dynamicStyles.label}>Heure</Text>
                  <TouchableOpacity
                    style={dynamicStyles.inputPicker}
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

              <Text style={dynamicStyles.label}>Lieu</Text>
              <TextInput
                style={dynamicStyles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Lieu"
              />
            </ScrollView>

            <View style={dynamicStyles.modalButtons}>
              <TouchableOpacity
                onPress={closeModal}
                style={dynamicStyles.buttonCancel}
              >
                <Text style={dynamicStyles.textCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEvent}
                style={dynamicStyles.buttonSave}
              >
                <Text style={dynamicStyles.textSave}>
                  {editingId ? "Mettre à jour" : "Ajouter"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL POUR LES DISPONIBILITÉS */}
      <Modal
        visible={availabilityModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalView}>
            <Text style={dynamicStyles.modalTitle}>
              Ajouter une disponibilité
            </Text>
            <ScrollView style={{ width: "100%" }}>
              {/* JOURS DE LA SEMAINE */}
              <Text style={dynamicStyles.label}>Jours de la semaine</Text>
              <View style={dynamicStyles.daysContainer}>
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(
                  (day, index) => (
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={[
                        dynamicStyles.dayButton,
                        selectedDays[index] && dynamicStyles.dayButtonActive,
                      ]}
                      onPress={() => {
                        const newDays = [...selectedDays];
                        newDays[index] = !newDays[index];
                        setSelectedDays(newDays);
                      }}
                    >
                      <Text
                        style={[
                          dynamicStyles.dayText,
                          selectedDays[index] && dynamicStyles.dayTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>

              {/* HEURE DE DÉBUT */}
              <Text style={dynamicStyles.label}>Heure de début</Text>
              <TouchableOpacity
                style={dynamicStyles.inputPicker}
                onPress={() => setShowAvailabilityStartTimePicker(true)}
              >
                <Text style={dynamicStyles.datePickerText}>
                  {availabilityStartTime.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Ionicons name="time" size={20} color="#007AFF" />
              </TouchableOpacity>
              {showAvailabilityStartTimePicker && (
                <DateTimePicker
                  value={availabilityStartTime}
                  mode="time"
                  display="spinner"
                  onChange={(event: any, selectedTime: any) => {
                    if (selectedTime) setAvailabilityStartTime(selectedTime);
                    if (Platform.OS === "android")
                      setShowAvailabilityStartTimePicker(false);
                  }}
                />
              )}

              {/* HEURE DE FIN */}
              <Text style={dynamicStyles.label}>Heure de fin</Text>
              <TouchableOpacity
                style={dynamicStyles.inputPicker}
                onPress={() => setShowAvailabilityEndTimePicker(true)}
              >
                <Text style={dynamicStyles.datePickerText}>
                  {availabilityEndTime.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Ionicons name="time" size={20} color="#007AFF" />
              </TouchableOpacity>
              {showAvailabilityEndTimePicker && (
                <DateTimePicker
                  value={availabilityEndTime}
                  mode="time"
                  display="spinner"
                  onChange={(event: any, selectedTime: any) => {
                    if (selectedTime) setAvailabilityEndTime(selectedTime);
                    if (Platform.OS === "android")
                      setShowAvailabilityEndTimePicker(false);
                  }}
                />
              )}
            </ScrollView>

            <View style={dynamicStyles.modalButtons}>
              <TouchableOpacity
                onPress={() => closeAvailabilityModal()}
                style={dynamicStyles.buttonCancel}
              >
                <Text style={dynamicStyles.textCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSaveAvailability()}
                style={dynamicStyles.buttonSave}
              >
                <Text style={dynamicStyles.textSave}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
