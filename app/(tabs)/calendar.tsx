import { Header } from "@/components/Header";
import { WeeklyCoverageChart } from "@/components/calendar/WeeklyCoverageChart";
import { DismissableModal } from "@/components/ui/DismissableModal";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useProfile } from "@/hooks/use-profile";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Calendar from "expo-calendar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "react-native-qrcode-svg";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
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
  const { profile } = useProfile();
  const canGenerateQR =
    profile.role === "Président" || profile.role === "Administrateur" || profile.role === "Vice-Président" || profile.role === "Secrétaire";

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

  // États QR et scanner
  const [allAvailabilities, setAllAvailabilities] = useState<any[]>([]);
  const [qrEvent, setQrEvent] = useState<any>(null);
  const [qrModalTab, setQrModalTab] = useState<"qr" | "attendees">("qr");
  const [eventAttendees, setEventAttendees] = useState<any[]>([]);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [pendingCheckin, setPendingCheckin] = useState<{
    eventId: string;
    title: string;
  } | null>(null);
  const [scanPermission, requestScanPermission] = useCameraPermissions();
  const isProcessing = useRef(false);

  // États vue détail événement
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [allUsersMap, setAllUsersMap] = useState<Record<string, string>>({});
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const canManageSchedule =
    profile.role === "Administrateur" || profile.role === "Président";

  // États formulaire événement (champs étendus)
  const [description, setDescription] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [savedLocations, setSavedLocations] = useState<any[]>([]);

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

    // Charger les disponibilités de TOUS les membres (couverture hebdomadaire)
    const unsubscribeAllAvailabilities = onSnapshot(
      collectionGroup(db, "availabilities"),
      (snapshot) => {
        setAllAvailabilities(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            _userId: d.ref.parent.parent?.id ?? "unknown",
          })),
        );
      },
    );

    return () => {
      unsubscribe();
      unsubscribeAvailability();
      unsubscribeAllAvailabilities();
    };
  }, [user]);

  // Écouter les participants quand la vue détail est ouverte
  useEffect(() => {
    if (!selectedEvent) {
      setParticipants([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, "events", selectedEvent.id, "participants"),
      (snap) => {
        setParticipants(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );
    return unsub;
  }, [selectedEvent?.id]);

  // Charger la carte uid→nom de tous les membres (admin/président seulement)
  useEffect(() => {
    if (!canManageSchedule) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        const name =
          [data.firstName, data.lastName].filter(Boolean).join(" ") ||
          data.email ||
          d.id;
        map[d.id] = name;
      });
      setAllUsersMap(map);
    });
    return unsub;
  }, [canManageSchedule]);

  // Charger les lieux sauvegardés (temps réel)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "savedLocations"), (snap) => {
      setSavedLocations(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      );
    });
    return unsub;
  }, []);

  // Écouter les présents d'un événement quand le modal QR est ouvert
  useEffect(() => {
    if (!qrEvent) {
      setEventAttendees([]);
      setQrModalTab("qr");
      return;
    }
    const unsub = onSnapshot(
      collection(db, "events", qrEvent.id, "attendees"),
      (snap) => {
        setEventAttendees(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );
      },
    );
    return unsub;
  }, [qrEvent?.id]);

  // --- 2. CYCLE DE VIE ---
  /**
   * Retourne la phase d'un événement :
   * - "future"  : avant l'heure de début
   * - "ongoing" : entre l'heure de début et 23h59 du même jour
   * - "past"    : après 23h59 du jour de l'événement
   */
  const getEventPhase = (
    dateObj: Date,
  ): "future" | "ongoing" | "past" => {
    const now = new Date();
    if (now < dateObj) return "future";
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 0, 0);
    return now <= endOfDay ? "ongoing" : "past";
  };

  const isEventPast = (date: Date) => getEventPhase(date) === "past";

  // --- 3. SAUVEGARDE (AJOUT OU MODIF) ---
  const handleSaveEvent = async () => {
    if (!title.trim()) {
      Alert.alert("Erreur", "Le titre est obligatoire");
      return;
    }
    if (!locationLabel.trim()) {
      Alert.alert("Erreur", "Le label du lieu est obligatoire");
      return;
    }
    if (!editingId && date < new Date()) {
      Alert.alert("Action impossible", "L'événement est dans le passé.");
      return;
    }

    // Vérification unicité du label AVANT de sauvegarder
    if (saveAddress) {
      const exists = savedLocations.some(
        (l) =>
          l.label.toLowerCase().trim() === locationLabel.toLowerCase().trim(),
      );
      if (exists) {
        Alert.alert(
          "Label de lieu existant",
          "Ce label de lieu existe déjà. Veuillez en choisir un autre ou décocher la case d'enregistrement.",
        );
        return;
      }
    }

    const eventData = {
      title: title.trim(),
      description: description.trim(),
      type: "General",
      date: Timestamp.fromDate(date),
      location: locationLabel.trim(),
      locationLabel: locationLabel.trim(),
      locationAddress: locationAddress.trim(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), eventData);
      } else {
        await addDoc(collection(db, "events"), eventData);
      }

      if (saveAddress && locationLabel.trim()) {
        await addDoc(collection(db, "savedLocations"), {
          label: locationLabel.trim(),
          address: locationAddress.trim(),
          createdAt: Timestamp.now(),
        });
      }

      closeModal();
    } catch (error) {
      Alert.alert("Erreur", "Impossible de sauvegarder.");
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setTitle("");
    setDescription("");
    setLocationLabel("");
    setLocationAddress("");
    setSaveAddress(false);
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

  // --- EXPORTER UN ÉVÉNEMENT VERS LE CALENDRIER NATIF ---
  const handleExportToCalendar = async (item: any) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Accès refusé",
          "L'application n'a pas accès à votre calendrier.",
        );
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT,
      );
      const target =
        calendars.find((c) => c.isPrimary && c.allowsModifications) ??
        calendars.find((c) => c.allowsModifications);

      if (!target) {
        Alert.alert("Erreur", "Aucun calendrier modifiable trouvé.");
        return;
      }

      const start: Date = item.dateObj;
      const end = new Date(start.getTime() + 60 * 60 * 1000); // +1h par défaut

      await Calendar.createEventAsync(target.id, {
        title: item.title,
        startDate: start,
        endDate: end,
        location: item.location ?? "",
        notes: "Événement OJYQ",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      Alert.alert("Succès", `"${item.title}" ajouté à votre calendrier.`);
    } catch (error) {
      console.error("Export calendrier:", error);
      Alert.alert("Erreur", "Impossible d'ajouter l'événement au calendrier.");
    }
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
            setDescription(item.description ?? "");
            setLocationLabel(item.locationLabel ?? item.location ?? "");
            setLocationAddress(item.locationAddress ?? "");
            setSaveAddress(false);
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

  // --- Vue détail & Participation ---
  const handleEventPress = (item: any) => setSelectedEvent(item);

  const handleParticipationChange = async (
    status: "going" | "not_going" | "online" | "absent" | "present_physical",
  ) => {
    if (!selectedEvent || !user) return;
    const displayName =
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "Membre";
    try {
      await setDoc(
        doc(db, "events", selectedEvent.id, "participants", user.uid),
        { userId: user.uid, userName: displayName, status, updatedAt: Timestamp.now() },
      );
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour ta participation.");
    }
  };

  const handleOpenMaps = (address: string) => {
    if (!address.trim()) return;
    const encoded = encodeURIComponent(address);
    const urlIOS = `maps://maps.apple.com/?q=${encoded}`;
    const urlAndroid = `geo:0,0?q=${encoded}`;
    const fallback = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

    const url = Platform.OS === "ios" ? urlIOS : urlAndroid;
    Linking.canOpenURL(url).then((ok) =>
      Linking.openURL(ok ? url : fallback),
    );
  };

  const handleSelectSavedLocation = (loc: any) => {
    setLocationLabel(loc.label);
    setLocationAddress(loc.address);
  };

  // --- QR & Scanner ---
  const handleShowEventQR = (event: any) => setQrEvent(event);

  const handleStartScan = async () => {
    if (!scanPermission?.granted) {
      const result = await requestScanPermission();
      if (!result.granted) {
        Alert.alert(
          "Accès refusé",
          "L'application a besoin d'accéder à votre caméra.",
        );
        return;
      }
    }
    isProcessing.current = false;
    setScannerVisible(true);
  };

  const handleEventQRScanned = useCallback(({ data }: { data: string }) => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    try {
      const payload = JSON.parse(data);
      if (payload.type !== "ojyq-event-checkin") throw new Error("Invalid");
      setScannerVisible(false);
      setPendingCheckin({ eventId: payload.eventId, title: payload.title });
    } catch {
      Alert.alert("QR invalide", "Ce QR n'est pas un QR d'événement OJYQ.", [
        { text: "OK", onPress: () => (isProcessing.current = false) },
      ]);
    }
  }, []);

  const handleConfirmCheckin = async () => {
    if (!pendingCheckin || !user) return;

    const event = events.find((e) => e.id === pendingCheckin.eventId);
    const phase = event ? getEventPhase(event.dateObj) : "past";

    if (phase === "future") {
      Alert.alert("Trop tôt", "L'événement n'a pas encore commencé.");
      setPendingCheckin(null);
      isProcessing.current = false;
      return;
    }
    if (phase === "past") {
      Alert.alert("Terminé", "Cet événement est terminé.");
      setPendingCheckin(null);
      isProcessing.current = false;
      return;
    }

    const displayName =
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "Membre";

    try {
      await setDoc(
        doc(db, "events", pendingCheckin.eventId, "participants", user.uid),
        {
          userId: user.uid,
          userName: displayName,
          status: "present_physical",
          updatedAt: Timestamp.now(),
        },
      );
      Alert.alert(
        "Présence physique enregistrée !",
        `Tu es marqué présent en présentiel pour "${pendingCheckin.title}"`,
      );
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer ta présence.");
    } finally {
      setPendingCheckin(null);
      isProcessing.current = false;
    }
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

      {/* Barre d'action QR (onglet Événements) */}
      {!loading && viewMode === "events" && (
        <TouchableOpacity
          onPress={handleStartScan}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 10,
            marginHorizontal: 16,
            marginTop: 10,
            backgroundColor: colors.surfaceDim,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="scan-outline" size={18} color={colors.primary} />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.primary,
            }}
          >
            Scanner le QR d'un événement
          </Text>
        </TouchableOpacity>
      )}

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
            const phase = getEventPhase(item.dateObj);
            const past = phase === "past";
            const ongoing = phase === "ongoing";
            const phaseConfig = {
              future: { color: "#007AFF", label: "À VENIR" },
              ongoing: { color: "#10B981", label: "EN COURS" },
              past: { color: "#888", label: "TERMINÉ" },
            }[phase];
            const borderColor = ongoing
              ? "#10B981"
              : past
              ? undefined
              : "#007AFF";

            return (
              <TouchableOpacity
                onPress={() => phase !== "past" && handleEventPress(item)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={500}
                style={[
                  dynamicStyles.eventCard,
                  borderColor ? { borderLeftColor: borderColor } : undefined,
                  past && dynamicStyles.pastEventCard,
                  { opacity: item.pending ? 0.6 : 1 },
                ]}
              >
                <View style={dynamicStyles.dateContainer}>
                  <Text style={[dynamicStyles.dateText, past && dynamicStyles.pastText]}>
                    {formatDate(item.dateObj)}
                  </Text>
                  <Text style={dynamicStyles.timeText}>
                    {formatTime(item.dateObj)}
                  </Text>
                </View>

                <View style={dynamicStyles.contentContainer}>
                  <Text style={[dynamicStyles.eventTitle, past && dynamicStyles.pastText]}>
                    {item.title}
                  </Text>
                  <View style={dynamicStyles.detailsRow}>
                    {/* Badge phase */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginRight: 8,
                      }}
                    >
                      {ongoing && (
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: "#10B981",
                          }}
                        />
                      )}
                      <Text
                        style={[dynamicStyles.eventType, { color: phaseConfig.color }]}
                      >
                        {phaseConfig.label}
                      </Text>
                    </View>
                    {item.location && (
                      <Text style={dynamicStyles.locationText} numberOfLines={1}>
                        📍 {item.location}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Export to device calendar */}
                {!past && (
                  <TouchableOpacity
                    onPress={() => handleExportToCalendar(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ justifyContent: "center", paddingLeft: 8 }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}

                {/* Générer QR événement (admin/président uniquement) */}
                {!past && canGenerateQR && (
                  <TouchableOpacity
                    onPress={() => handleShowEventQR(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ justifyContent: "center", paddingLeft: 8 }}
                  >
                    <Ionicons
                      name="qr-code-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />
      ) : (() => {
          // ── Données pour la vue Disponibilités ──────────────────────────────
          // Regrouper allAvailabilities par membre (pour admin/président)
          const memberGroupsMap: Record<
            string,
            { userId: string; userName: string; slots: any[] }
          > = {};
          allAvailabilities.forEach((a) => {
            const uid = a._userId ?? "unknown";
            if (!memberGroupsMap[uid]) {
              memberGroupsMap[uid] = {
                userId: uid,
                userName: allUsersMap[uid] ?? "Membre",
                slots: [],
              };
            }
            memberGroupsMap[uid].slots.push(a);
          });
          const memberGroups = Object.values(memberGroupsMap).sort((a, b) =>
            a.userName.localeCompare(b.userName),
          );

          const AvailabilitySlot = ({ item, canDelete }: { item: any; canDelete: boolean }) => (
            <TouchableOpacity
              onLongPress={() => canDelete && handleDeleteAvailability(item.id)}
              delayLongPress={500}
              style={dynamicStyles.availabilityCard}
            >
              <View style={dynamicStyles.dateContainer}>
                <Text style={dynamicStyles.dateText} numberOfLines={2}>
                  {Array.isArray(item.days) ? item.days.join(", ") : "Jours multiples"}
                </Text>
              </View>
              <View style={dynamicStyles.contentContainer}>
                <Text style={dynamicStyles.eventTitle}>
                  {String(item.startHours).padStart(2, "0")}:
                  {String(item.startMinutes).padStart(2, "0")} –{" "}
                  {String(item.endHours).padStart(2, "0")}:
                  {String(item.endMinutes).padStart(2, "0")}
                </Text>
                <Text style={dynamicStyles.locationText}>
                  {canDelete ? "Appuyez longuement pour supprimer" : "Disponible"}
                </Text>
              </View>
            </TouchableOpacity>
          );

          return (
            <FlatList
              data={canManageSchedule ? memberGroups : availabilities}
              keyExtractor={(item) => (canManageSchedule ? item.userId : item.id)}
              contentContainerStyle={dynamicStyles.listContent}
              ListHeaderComponent={
                <>
                  <WeeklyCoverageChart
                    availabilities={canManageSchedule ? allAvailabilities : availabilities}
                  />

                  {/* Bouton Générer horaire (admin/président) */}
                  {canManageSchedule && (
                    <TouchableOpacity
                      onPress={() => setScheduleModalVisible(true)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        marginHorizontal: 16,
                        marginBottom: 12,
                        paddingVertical: 12,
                        backgroundColor: colors.primary,
                        borderRadius: 10,
                      }}
                    >
                      <Ionicons name="calendar-number-outline" size={18} color="#fff" />
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                        Générer l'horaire de permanence
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              }
              ListEmptyComponent={
                <View style={dynamicStyles.emptyContainer}>
                  <Ionicons name="checkmark-circle-outline" size={48} color="#999" />
                  <Text style={dynamicStyles.emptyText}>
                    Aucune disponibilité enregistrée
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                if (canManageSchedule) {
                  // Vue admin : carte par membre avec ses créneaux
                  const group = item as { userId: string; userName: string; slots: any[] };
                  const isMe = group.userId === user?.uid;
                  return (
                    <View
                      style={{
                        backgroundColor: colors.surfaceDim,
                        borderRadius: 12,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: isMe ? colors.primary : colors.border,
                        overflow: "hidden",
                      }}
                    >
                      {/* En-tête membre */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          backgroundColor: isMe ? colors.primary + "18" : "transparent",
                          gap: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: colors.primary + "22",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
                            {(group.userName?.[0] ?? "?").toUpperCase()}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary, flex: 1 }}>
                          {group.userName}
                          {isMe && (
                            <Text style={{ fontWeight: "400", color: colors.textSecondary }}> (moi)</Text>
                          )}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                          {group.slots.length} créneau{group.slots.length > 1 ? "x" : ""}
                        </Text>
                      </View>
                      {/* Créneaux */}
                      {group.slots.map((slot) => (
                        <AvailabilitySlot
                          key={slot.id}
                          item={slot}
                          canDelete={isMe}
                        />
                      ))}
                    </View>
                  );
                }
                // Vue membre : ses propres créneaux
                return <AvailabilitySlot item={item} canDelete={true} />;
              }}
            />
          );
        })()
      }

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

      <DismissableModal
        visible={modalVisible}
        onDismiss={closeModal}
        animationType="slide"
      >
          <View style={dynamicStyles.modalView}>
            <Text style={[dynamicStyles.modalTitle]}>
              {editingId ? "Modifier l'événement" : "Nouvel Événement"}
            </Text>
            <ScrollView style={{ width: "100%" }} keyboardShouldPersistTaps="handled">
              {/* Titre */}
              <Text style={dynamicStyles.label}>Titre *</Text>
              <TextInput
                style={dynamicStyles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Nom de l'activité"
                placeholderTextColor={colors.textTertiary}
              />

              {/* Description */}
              <Text style={dynamicStyles.label}>Description</Text>
              <TextInput
                style={[dynamicStyles.input, { height: 80, textAlignVertical: "top", paddingTop: 10 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Détails de l'événement (optionnel)"
                placeholderTextColor={colors.textTertiary}
                multiline
              />

              {/* Date & Heure */}
              <View style={dynamicStyles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={dynamicStyles.label}>Date</Text>
                  <TouchableOpacity style={dynamicStyles.inputPicker} onPress={openDatePicker}>
                    <Text style={{ color: colors.textPrimary }}>{date.toLocaleDateString("fr-FR")}</Text>
                    <Ionicons name="calendar-outline" size={18} color="#666" />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={onChangeDate}
                      minimumDate={new Date()}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={dynamicStyles.label}>Heure</Text>
                  <TouchableOpacity style={dynamicStyles.inputPicker} onPress={openTimePicker}>
                    <Text style={{ color: colors.textPrimary }}>
                      {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    <Ionicons name="time-outline" size={18} color="#666" />
                  </TouchableOpacity>
                  {showTimePicker && (
                    <DateTimePicker
                      value={date}
                      mode="time"
                      is24Hour={true}
                      display="spinner"
                      onChange={onChangeTime}
                    />
                  )}
                </View>
              </View>

              {/* Suggestions de lieux sauvegardés */}
              {savedLocations.length > 0 && (
                <>
                  <Text style={dynamicStyles.label}>Lieux enregistrés</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 12 }}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {savedLocations.map((loc) => (
                      <TouchableOpacity
                        key={loc.id}
                        onPress={() => handleSelectSavedLocation(loc)}
                        style={{
                          backgroundColor:
                            locationLabel === loc.label
                              ? colors.primary
                              : colors.surface,
                          borderWidth: 1,
                          borderColor:
                            locationLabel === loc.label
                              ? colors.primary
                              : colors.border,
                          borderRadius: 20,
                          paddingVertical: 6,
                          paddingHorizontal: 14,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Ionicons
                          name="location-outline"
                          size={13}
                          color={locationLabel === loc.label ? "#fff" : colors.textSecondary}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color:
                              locationLabel === loc.label
                                ? "#fff"
                                : colors.textPrimary,
                          }}
                        >
                          {loc.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Label du lieu (obligatoire) */}
              <Text style={dynamicStyles.label}>Label du lieu *</Text>
              <TextInput
                style={dynamicStyles.input}
                value={locationLabel}
                onChangeText={setLocationLabel}
                placeholder="Ex : Gymnase Principal"
                placeholderTextColor={colors.textTertiary}
              />

              {/* Adresse du lieu */}
              <Text style={dynamicStyles.label}>Adresse du lieu</Text>
              <TextInput
                style={dynamicStyles.input}
                value={locationAddress}
                onChangeText={setLocationAddress}
                placeholder="Ex : 1100 Rue Notre-Dame O, Montréal"
                placeholderTextColor={colors.textTertiary}
              />

              {/* Case à cocher Enregistrer adresse */}
              <TouchableOpacity
                onPress={() => setSaveAddress(!saveAddress)}
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    borderWidth: 2,
                    borderColor: saveAddress ? colors.primary : colors.border,
                    backgroundColor: saveAddress ? colors.primary : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {saveAddress && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>
                  Enregistrer cette adresse pour une prochaine fois
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={dynamicStyles.modalButtons}>
              <TouchableOpacity onPress={closeModal} style={dynamicStyles.buttonCancel}>
                <Text style={dynamicStyles.textCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEvent} style={dynamicStyles.buttonSave}>
                <Text style={dynamicStyles.textSave}>
                  {editingId ? "Mettre à jour" : "Ajouter"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
      </DismissableModal>

      {/* MODAL HORAIRE DE PERMANENCE */}
      <DismissableModal
        visible={scheduleModalVisible}
        onDismiss={() => setScheduleModalVisible(false)}
        animationType="slide"
      >
            <View
              style={[dynamicStyles.modalView, { maxHeight: "90%", paddingBottom: 0 }]}
            >
              <Text style={[dynamicStyles.modalTitle, { alignSelf: "flex-start" }]}>
                Horaire de permanence
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  alignSelf: "flex-start",
                  marginBottom: 16,
                  marginTop: -12,
                }}
              >
                Basé sur les disponibilités de {Object.keys(allUsersMap).length} membres
              </Text>

              <ScrollView style={{ width: "100%" }} showsVerticalScrollIndicator={false}>
                {(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const).map(
                  (day) => {
                    // Membres disponibles ce jour-là
                    const available = allAvailabilities.filter(
                      (a) => Array.isArray(a.days) && a.days.includes(day),
                    );
                    // Calcul de la couverture unique (merge intervals)
                    const totalMinutes = available.reduce((sum, a) => {
                      const dur = a.endHours * 60 + a.endMinutes - (a.startHours * 60 + a.startMinutes);
                      return sum + Math.max(0, dur);
                    }, 0);
                    const coveredHours = Math.round(totalMinutes / 60 * 10) / 10;
                    const meetsTarget = coveredHours >= 8;

                    return (
                      <View
                        key={day}
                        style={{
                          marginBottom: 14,
                          backgroundColor: colors.surface,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: meetsTarget ? "#10B98140" : colors.border,
                          overflow: "hidden",
                        }}
                      >
                        {/* En-tête jour */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            backgroundColor: meetsTarget ? "#10B98114" : colors.surfaceDim,
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary }}>
                            {day}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: meetsTarget ? "#10B981" : colors.textSecondary,
                              }}
                            >
                              {coveredHours}h / 8h
                            </Text>
                            {meetsTarget && (
                              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            )}
                          </View>
                        </View>

                        {/* Liste des membres */}
                        {available.length === 0 ? (
                          <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                            <Text style={{ fontSize: 12, color: colors.textTertiary, fontStyle: "italic" }}>
                              Aucun membre disponible
                            </Text>
                          </View>
                        ) : (
                          available.map((a, i) => {
                            const name = allUsersMap[a._userId] ?? "Membre";
                            return (
                              <View
                                key={a.id}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  paddingHorizontal: 12,
                                  paddingVertical: 7,
                                  borderTopWidth: i > 0 ? 1 : 0,
                                  borderTopColor: colors.border,
                                  gap: 10,
                                }}
                              >
                                <View
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 13,
                                    backgroundColor: colors.primary + "22",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>
                                    {(name[0] ?? "?").toUpperCase()}
                                  </Text>
                                </View>
                                <Text
                                  style={{ fontSize: 13, color: colors.textPrimary, flex: 1 }}
                                  numberOfLines={1}
                                >
                                  {name}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                  {String(a.startHours).padStart(2, "0")}:
                                  {String(a.startMinutes).padStart(2, "0")} –{" "}
                                  {String(a.endHours).padStart(2, "0")}:
                                  {String(a.endMinutes).padStart(2, "0")}
                                </Text>
                              </View>
                            );
                          })
                        )}
                      </View>
                    );
                  },
                )}
                <View style={{ height: 16 }} />
              </ScrollView>

              <TouchableOpacity
                onPress={() => setScheduleModalVisible(false)}
                style={[dynamicStyles.buttonSave, { width: "100%", marginTop: 12, marginBottom: 16 }]}
              >
                <Text style={dynamicStyles.textSave}>Fermer</Text>
              </TouchableOpacity>
            </View>
      </DismissableModal>

      {/* MODAL CONFIRMATION DOWNGRADE (présence physique → en ligne) */}
      <DismissableModal
        visible={showDowngradeConfirm}
        onDismiss={() => setShowDowngradeConfirm(false)}
        animationType="fade"
      >
            <View style={dynamicStyles.modalView}>
            <Ionicons name="warning-outline" size={40} color="#F59E0B" style={{ marginBottom: 12 }} />
            <Text style={[dynamicStyles.modalTitle, { fontSize: 16 }]}>
              Modifier le statut ?
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
              Tu es actuellement marqué{" "}
              <Text style={{ fontWeight: "700", color: colors.textPrimary }}>présent en présentiel</Text>.
              {"\n"}Veux-tu vraiment passer en{" "}
              <Text style={{ fontWeight: "700", color: "#06B6D4" }}>En ligne</Text> ?
            </Text>
            <View style={[dynamicStyles.modalButtons, { gap: 12 }]}>
              <TouchableOpacity
                onPress={() => setShowDowngradeConfirm(false)}
                style={dynamicStyles.buttonCancel}
              >
                <Text style={dynamicStyles.textCancel}>Non, annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowDowngradeConfirm(false);
                  handleParticipationChange("online");
                }}
                style={[dynamicStyles.buttonSave, { backgroundColor: "#06B6D4" }]}
              >
                <Text style={dynamicStyles.textSave}>Oui, En ligne</Text>
              </TouchableOpacity>
            </View>
          </View>
      </DismissableModal>

      {/* MODAL VUE DÉTAIL ÉVÉNEMENT */}
      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (() => {
          const ev = selectedEvent;
          const phase = getEventPhase(ev.dateObj);
          const myParticipant = participants.find((p) => p.userId === user?.uid);
          const myStatus = myParticipant?.status as
            | "going" | "not_going"
            | "online" | "absent" | "present_physical"
            | undefined;
          const address = ev.locationAddress || ev.location || "";
          const label = ev.locationLabel || ev.location || "";

          // Participants selon la phase
          const presenceStatuses = ["online", "absent", "present_physical"];
          const presenceList = participants.filter((p) =>
            presenceStatuses.includes(p.status),
          );
          const participationList = participants.filter((p) =>
            ["going", "not_going"].includes(p.status),
          );

          const phaseHeaderConfig = {
            future: { label: "À venir", color: "#007AFF", bg: "#007AFF22" },
            ongoing: { label: "En cours", color: "#10B981", bg: "#10B98122" },
            past: { label: "Terminé", color: "#888", bg: "#88888822" },
          }[phase];

          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
              {/* ── Header ── */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => setSelectedEvent(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary }}
                    numberOfLines={1}
                  >
                    {ev.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {formatDate(ev.dateObj)} • {formatTime(ev.dateObj)}
                  </Text>
                </View>
                {/* Badge phase */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: phaseHeaderConfig.bg,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                  }}
                >
                  {phase === "ongoing" && (
                    <View
                      style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981" }}
                    />
                  )}
                  <Text
                    style={{ fontSize: 11, fontWeight: "700", color: phaseHeaderConfig.color }}
                  >
                    {phaseHeaderConfig.label.toUpperCase()}
                  </Text>
                </View>
              </View>

              <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
                {/* ── Description ── */}
                {!!ev.description && (
                  <View
                    style={{
                      backgroundColor: colors.surfaceDim,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: colors.textSecondary,
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      Description
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 20 }}>
                      {ev.description}
                    </Text>
                  </View>
                )}

                {/* ── Carte lieu ── */}
                {!!address && (
                  <TouchableOpacity
                    onPress={() => handleOpenMaps(address)}
                    activeOpacity={0.85}
                    style={{ borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}
                  >
                    <View
                      style={{
                        height: 110,
                        backgroundColor: isDark ? "#1a2a1a" : "#e8f5e9",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons name="map" size={36} color={isDark ? "#4CAF50" : "#2E7D32"} />
                      <Text style={{ fontSize: 11, color: isDark ? "#81C784" : "#388E3C", fontWeight: "600" }}>
                        Appuyer pour ouvrir dans Maps
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 12,
                        backgroundColor: colors.surfaceDim,
                        gap: 10,
                      }}
                    >
                      <Ionicons name="location" size={18} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}>
                          {label}
                        </Text>
                        {!!ev.locationAddress && (
                          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                            {ev.locationAddress}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                    </View>
                  </TouchableOpacity>
                )}

                {/* ══════════════════════════════════════════════════
                    PHASE 1 — FUTURE : vue Participation
                ══════════════════════════════════════════════════ */}
                {phase === "future" && (
                  <>
                    <View
                      style={{
                        backgroundColor: colors.surfaceDim,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: colors.textSecondary,
                          marginBottom: 12,
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                        }}
                      >
                        Ma participation
                      </Text>
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        {/* Je participe */}
                        <TouchableOpacity
                          onPress={() => handleParticipationChange("going")}
                          style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            paddingVertical: 13,
                            borderRadius: 10,
                            backgroundColor: myStatus === "going" ? "#007AFF" : colors.surface,
                            borderWidth: 1,
                            borderColor: myStatus === "going" ? "#007AFF" : colors.border,
                          }}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={myStatus === "going" ? "#fff" : colors.textSecondary}
                          />
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: myStatus === "going" ? "#fff" : colors.textSecondary,
                            }}
                          >
                            Je participe
                          </Text>
                        </TouchableOpacity>

                        {/* Pas disponible */}
                        <TouchableOpacity
                          onPress={() => handleParticipationChange("not_going")}
                          style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            paddingVertical: 13,
                            borderRadius: 10,
                            backgroundColor: myStatus === "not_going" ? "#EF4444" : colors.surface,
                            borderWidth: 1,
                            borderColor: myStatus === "not_going" ? "#EF4444" : colors.border,
                          }}
                        >
                          <Ionicons
                            name="close-circle"
                            size={18}
                            color={myStatus === "not_going" ? "#fff" : colors.textSecondary}
                          />
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: myStatus === "not_going" ? "#fff" : colors.textSecondary,
                            }}
                          >
                            Pas dispo
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Liste des intentions */}
                    <View
                      style={{
                        backgroundColor: colors.surfaceDim,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: colors.textSecondary,
                          marginBottom: 12,
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                        }}
                      >
                        Réponses ({participationList.length})
                      </Text>
                      {participationList.length === 0 ? (
                        <View style={{ alignItems: "center", paddingVertical: 16 }}>
                          <Ionicons name="people-outline" size={32} color={colors.textTertiary} />
                          <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 8 }}>
                            Aucune réponse pour l'instant.
                          </Text>
                        </View>
                      ) : (
                        participationList.map((p, idx) => {
                          const isGoing = p.status === "going";
                          const at = p.updatedAt?.toDate?.();
                          return (
                            <View
                              key={p.id}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingVertical: 10,
                                borderTopWidth: idx > 0 ? 1 : 0,
                                borderTopColor: colors.border,
                                gap: 12,
                              }}
                            >
                              <View
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 18,
                                  backgroundColor: isGoing ? "#007AFF22" : "#EF444422",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 14,
                                    fontWeight: "700",
                                    color: isGoing ? "#007AFF" : "#EF4444",
                                  }}
                                >
                                  {(p.userName?.[0] ?? "?").toUpperCase()}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary }}>
                                  {p.userName}
                                </Text>
                                {at && (
                                  <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                                    {at.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}{" "}
                                    à {at.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                  </Text>
                                )}
                              </View>
                              <Ionicons
                                name={isGoing ? "checkmark-circle" : "close-circle"}
                                size={20}
                                color={isGoing ? "#007AFF" : "#EF4444"}
                              />
                            </View>
                          );
                        })
                      )}
                    </View>
                  </>
                )}

                {/* ══════════════════════════════════════════════════
                    PHASE 2 — ONGOING : vue Présence
                ══════════════════════════════════════════════════ */}
                {phase === "ongoing" && (
                  <>
                    {/* Mon statut de présence */}
                    <View
                      style={{
                        backgroundColor: colors.surfaceDim,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: colors.textSecondary,
                          marginBottom: 12,
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                        }}
                      >
                        Ma présence
                      </Text>

                      {/* Si déjà présent en présentiel : lecture seule avec downgrade warning */}
                      {myStatus === "present_physical" ? (
                        <>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              paddingVertical: 13,
                              borderRadius: 10,
                              backgroundColor: "#007AFF",
                            }}
                          >
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                              Présent en présentiel ✓
                            </Text>
                          </View>
                          {/* Bouton downgrade */}
                          <TouchableOpacity
                            onPress={() => setShowDowngradeConfirm(true)}
                            style={{ marginTop: 10, alignItems: "center" }}
                          >
                            <Text style={{ fontSize: 12, color: "#06B6D4", fontWeight: "600" }}>
                              Passer en ligne à la place →
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View style={{ gap: 10 }}>
                          {/* Bouton En ligne */}
                          <TouchableOpacity
                            onPress={() => handleParticipationChange("online")}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              paddingVertical: 13,
                              borderRadius: 10,
                              backgroundColor: myStatus === "online" ? "#06B6D4" : colors.surface,
                              borderWidth: 1,
                              borderColor: myStatus === "online" ? "#06B6D4" : colors.border,
                            }}
                          >
                            <Ionicons
                              name="wifi"
                              size={18}
                              color={myStatus === "online" ? "#fff" : colors.textSecondary}
                            />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "700",
                                color: myStatus === "online" ? "#fff" : colors.textSecondary,
                              }}
                            >
                              {myStatus === "online" ? "En ligne ✓" : "Je suis en ligne"}
                            </Text>
                          </TouchableOpacity>

                          {/* Bouton Absent */}
                          <TouchableOpacity
                            onPress={() => handleParticipationChange("absent")}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              paddingVertical: 13,
                              borderRadius: 10,
                              backgroundColor: myStatus === "absent" ? "#F59E0B" : colors.surface,
                              borderWidth: 1,
                              borderColor: myStatus === "absent" ? "#F59E0B" : colors.border,
                            }}
                          >
                            <Ionicons
                              name="moon"
                              size={18}
                              color={myStatus === "absent" ? "#fff" : colors.textSecondary}
                            />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "700",
                                color: myStatus === "absent" ? "#fff" : colors.textSecondary,
                              }}
                            >
                              {myStatus === "absent" ? "Absent ✓" : "Je suis absent"}
                            </Text>
                          </TouchableOpacity>

                          <Text
                            style={{ fontSize: 11, color: colors.textTertiary, textAlign: "center" }}
                          >
                            Le scan QR sur place marque automatiquement ta présence physique.
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Liste des présences */}
                    <View
                      style={{
                        backgroundColor: colors.surfaceDim,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: colors.textSecondary,
                          marginBottom: 12,
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                        }}
                      >
                        Présences ({presenceList.length})
                      </Text>

                      {presenceList.length === 0 ? (
                        <View style={{ alignItems: "center", paddingVertical: 16 }}>
                          <Ionicons name="people-outline" size={32} color={colors.textTertiary} />
                          <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 8 }}>
                            Aucun pointage pour l'instant.
                          </Text>
                        </View>
                      ) : (
                        presenceList.map((p, idx) => {
                          const isOnline = p.status === "online";
                          const isPhysical = p.status === "present_physical";
                          const isAbsent = p.status === "absent";
                          const at = p.updatedAt?.toDate?.();

                          const statusConfig = isPhysical
                            ? { color: "#007AFF", bg: "#007AFF22", icon: "checkmark-circle" as const, label: "Présentiel" }
                            : isOnline
                            ? { color: "#06B6D4", bg: "#06B6D422", icon: "wifi" as const, label: "En ligne" }
                            : { color: "#F59E0B", bg: "#F59E0B22", icon: "moon" as const, label: "Absent" };

                          return (
                            <View
                              key={p.id}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingVertical: 10,
                                borderTopWidth: idx > 0 ? 1 : 0,
                                borderTopColor: colors.border,
                                gap: 12,
                              }}
                            >
                              <View
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 19,
                                  backgroundColor: statusConfig.bg,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text style={{ fontSize: 15, fontWeight: "700", color: statusConfig.color }}>
                                  {(p.userName?.[0] ?? "?").toUpperCase()}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary }}>
                                    {p.userName}
                                  </Text>
                                  {/* Badge statut public */}
                                  <View
                                    style={{
                                      backgroundColor: statusConfig.bg,
                                      borderRadius: 8,
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 3,
                                    }}
                                  >
                                    <Ionicons name={statusConfig.icon} size={9} color={statusConfig.color} />
                                    <Text style={{ fontSize: 10, fontWeight: "700", color: statusConfig.color }}>
                                      {statusConfig.label}
                                    </Text>
                                  </View>
                                </View>
                                {at && (
                                  <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                                    Pointé le {at.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}{" "}
                                    à {at.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                  </Text>
                                )}
                              </View>
                              <Ionicons name={statusConfig.icon} size={20} color={statusConfig.color} />
                            </View>
                          );
                        })
                      )}
                    </View>
                  </>
                )}

                {/* ══════════════════════════════════════════════════
                    PHASE 3 — PAST : résumé lecture seule
                ══════════════════════════════════════════════════ */}
                {phase === "past" && (
                  <View
                    style={{
                      backgroundColor: colors.surfaceDim,
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: colors.textSecondary,
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      Récapitulatif des présences ({presenceList.length})
                    </Text>
                    {presenceList.length === 0 ? (
                      <View style={{ alignItems: "center", paddingVertical: 16 }}>
                        <Ionicons name="people-outline" size={32} color={colors.textTertiary} />
                        <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 8 }}>
                          Aucune présence enregistrée.
                        </Text>
                      </View>
                    ) : (
                      presenceList.map((p, idx) => {
                        const isOnline = p.status === "online";
                        const isPhysical = p.status === "present_physical";
                        const at = p.updatedAt?.toDate?.();
                        const statusColor = isPhysical ? "#007AFF" : isOnline ? "#06B6D4" : "#F59E0B";
                        const statusLabel = isPhysical ? "Présentiel" : isOnline ? "En ligne" : "Absent";
                        const statusIcon = isPhysical ? "checkmark-circle" : isOnline ? "wifi" : "moon";

                        return (
                          <View
                            key={p.id}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingVertical: 10,
                              borderTopWidth: idx > 0 ? 1 : 0,
                              borderTopColor: colors.border,
                              gap: 12,
                            }}
                          >
                            <View
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: statusColor + "22",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text style={{ fontSize: 14, fontWeight: "700", color: statusColor }}>
                                {(p.userName?.[0] ?? "?").toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary }}>
                                {p.userName}
                              </Text>
                              {at && (
                                <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                                  {at.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}{" "}
                                  à {at.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </Text>
                              )}
                            </View>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                backgroundColor: statusColor + "22",
                                borderRadius: 8,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                              }}
                            >
                              <Ionicons name={statusIcon as any} size={12} color={statusColor} />
                              <Text style={{ fontSize: 11, fontWeight: "700", color: statusColor }}>
                                {statusLabel}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                <View style={{ height: 32 }} />
              </ScrollView>
            </SafeAreaView>
          );
        })()}
      </Modal>

      {/* MODAL QR ÉVÉNEMENT (admin/président) */}
      <DismissableModal
        visible={!!qrEvent}
        onDismiss={() => setQrEvent(null)}
        animationType="fade"
      >
          <View
            style={[
              dynamicStyles.modalView,
              { paddingVertical: 24, gap: 0, maxHeight: "85%" },
            ]}
          >
            {/* Titre */}
            <Text
              style={[dynamicStyles.modalTitle, { marginBottom: 16 }]}
              numberOfLines={1}
            >
              {qrEvent?.title}
            </Text>

            {/* Onglets QR / Présents */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 4,
                marginBottom: 20,
                width: "100%",
              }}
            >
              <TouchableOpacity
                style={[
                  { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 6 },
                  qrModalTab === "qr" && { backgroundColor: colors.surfaceDim, elevation: 1 },
                ]}
                onPress={() => setQrModalTab("qr")}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: qrModalTab === "qr" ? "700" : "500",
                    color: qrModalTab === "qr" ? colors.textPrimary : colors.textSecondary,
                  }}
                >
                  QR Code
                </Text>
              </TouchableOpacity>
            </View>

            {/* Contenu onglet QR */}
            {qrModalTab === "qr" && qrEvent && (
              <View style={{ alignItems: "center", gap: 12 }}>
                <QRCode
                  value={JSON.stringify({
                    type: "ojyq-event-checkin",
                    eventId: qrEvent.id,
                    title: qrEvent.title,
                  })}
                  size={200}
                  backgroundColor={colors.surfaceDim}
                  color={colors.textPrimary}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  Les membres scannent ce QR pour s'inscrire à cet événement.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setQrEvent(null)}
              style={[dynamicStyles.buttonSave, { width: "100%", marginTop: 20 }]}
            >
              <Text style={dynamicStyles.textSave}>Fermer</Text>
            </TouchableOpacity>
          </View>
      </DismissableModal>

      {/* MODAL SCANNER QR ÉVÉNEMENT */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleEventQRScanned}
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 240,
                height: 240,
                borderWidth: 2,
                borderColor: colors.primary,
                borderRadius: 12,
              }}
            />
            <Text
              style={{
                color: "#fff",
                marginTop: 20,
                fontSize: 14,
                fontWeight: "600",
                textShadowColor: "rgba(0,0,0,0.8)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              Alignez le QR de l'événement
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setScannerVisible(false)}
            style={{
              position: "absolute",
              bottom: 50,
              alignSelf: "center",
              backgroundColor: "rgba(0,0,0,0.6)",
              paddingVertical: 12,
              paddingHorizontal: 28,
              borderRadius: 999,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="close-circle-outline" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
              Annuler
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* CONFIRMATION CHECK-IN */}
      <DismissableModal
        visible={!!pendingCheckin}
        onDismiss={() => {
          setPendingCheckin(null);
          isProcessing.current = false;
        }}
        animationType="fade"
      >
          <View style={dynamicStyles.modalView}>
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color={colors.primary}
              style={{ marginBottom: 12 }}
            />
            <Text style={dynamicStyles.modalTitle}>Confirmer la présence</Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              Marquer ta présence pour{"\n"}
              <Text
                style={{ fontWeight: "700", color: colors.textPrimary }}
              >
                {pendingCheckin?.title}
              </Text>{" "}
              ?
            </Text>
            <View style={[dynamicStyles.modalButtons, { gap: 12 }]}>
              <TouchableOpacity
                onPress={() => {
                  setPendingCheckin(null);
                  isProcessing.current = false;
                }}
                style={dynamicStyles.buttonCancel}
              >
                <Text style={dynamicStyles.textCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmCheckin}
                style={dynamicStyles.buttonSave}
              >
                <Text style={dynamicStyles.textSave}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
      </DismissableModal>

      {/* MODAL POUR LES DISPONIBILITÉS */}
      <DismissableModal
        visible={availabilityModalVisible}
        onDismiss={closeAvailabilityModal}
        animationType="slide"
      >
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
      </DismissableModal>
    </SafeAreaView>
  );
}
