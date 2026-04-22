import { showActionSheet } from "@/components/ActionSheet";
import {
  AvailabilityData,
  AvailabilityModal,
  EventFormData,
  EventFormModal,
  ProjectFormData,
  ProjectFormModal,
} from "@/components/calendar";
import { WeeklyCoverageChart } from "@/components/calendar/WeeklyCoverageChart";
import { Header } from "@/components/Header";
import { showToast } from "@/components/Toast";
import { showConfirm } from "@/components/ui/ConfirmModal";
import { DismissableModal } from "@/components/ui/DismissableModal";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useProfile } from "@/hooks/use-profile";
import { formatAttendanceText } from "@/utils/attendanceUtils";
import { Ionicons } from "@expo/vector-icons";
import * as Calendar from "expo-calendar";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../firebaseConfig";

export default function FirebaseCalendarScreen() {
  const auth = getAuth();
  const user = auth.currentUser;
  const { colors, isDark } = useAppTheme();
  const { profile } = useProfile();
  const canGenerateQR =
    profile.role === "Président" ||
    profile.role === "Administrateur" ||
    profile.role === "Vice-Président" ||
    profile.role === "Secrétaire";

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
      fontSize: 12,
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
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"events" | "projects" | "availability">("events");

  // États pour le formulaire projet
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectValues, setEditingProjectValues] = useState<Partial<ProjectFormData> | undefined>();

  const canDeleteProject =
    profile.role === "Administrateur" ||
    profile.role === "Président" ||
    profile.role === "Vice-Président";

  // États pour le Modal et le Formulaire
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingInitialValues, setEditingInitialValues] = useState<
    Partial<EventFormData> | undefined
  >();

  // États pour les disponibilités
  const [availabilityModalVisible, setAvailabilityModalVisible] =
    useState(false);

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
  const [copiedAttendance, setCopiedAttendance] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [allUsersMap, setAllUsersMap] = useState<Record<string, string>>({});
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const canManageSchedule =
    profile.role === "Administrateur" || profile.role === "Président";

  const [savedLocations, setSavedLocations] = useState<any[]>([]);

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
      setSavedLocations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Charger les projets (temps réel)
  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          dateObj: data.date?.toDate?.() ?? null,
        };
      }));
    });
    return unsub;
  }, []);

  // Créer un projet + canal automatique
  const handleSaveProject = async (data: ProjectFormData) => {
    if (!user) return;
    try {
      const projectData: any = {
        name: data.name.trim(),
        description: data.description.trim() || null,
        date: data.date ? Timestamp.fromDate(data.date) : null,
        location: data.locationLabel.trim() || null,
        locationLabel: data.locationLabel.trim() || null,
        locationAddress: data.locationAddress.trim() || null,
        createdBy: user.uid,
        updatedAt: Timestamp.now(),
      };

      if (editingProjectId) {
        await updateDoc(doc(db, "projects", editingProjectId), projectData);
      } else {
        // 1. Créer le projet
        projectData.createdAt = Timestamp.now();
        const projectRef = await addDoc(collection(db, "projects"), projectData);

        // 2. Créer le canal associé
        const channelRef = await addDoc(collection(db, "channels"), {
          name: data.name.trim(),
          description: `Canal du projet : ${data.name.trim()}`,
          type: "public",
          audienceType: "public",
          allowedRoles: [],
          members: [],
          projectId: projectRef.id,
          createdBy: user.uid,
          createdAt: Timestamp.now(),
          lastMessage: "Canal créé",
          lastMessageAt: Timestamp.now(),
        });

        // 3. Lier le canal au projet
        await updateDoc(doc(db, "projects", projectRef.id), {
          channelId: channelRef.id,
        });

        // 4. Message épinglé avec lien vers le projet
        await addDoc(collection(db, "channels", channelRef.id, "messages"), {
          text: `Canal créé pour le projet "${data.name.trim()}"`,
          createdAt: Timestamp.now(),
          user: { _id: "system", name: "OJYQ" },
          projectLink: { projectId: projectRef.id, projectName: data.name.trim() },
          image: null,
          poll: null,
          file: null,
          audio: null,
          replyTo: null,
        });

        if (data.saveAddress && data.locationLabel.trim()) {
          await addDoc(collection(db, "savedLocations"), {
            label: data.locationLabel.trim(),
            address: data.locationAddress.trim(),
            createdAt: Timestamp.now(),
          });
        }
      }

      setProjectModalVisible(false);
      setEditingProjectId(null);
      setEditingProjectValues(undefined);
      showToast(editingProjectId ? "Projet mis à jour" : "Projet créé !", "success");
    } catch {
      showToast("Impossible de sauvegarder le projet.", "error");
    }
  };

  const handleLongPressProject = (item: any) => {
    const actions: any[] = [];

    if (canDeleteProject) {
      actions.push({
        label: "Modifier",
        icon: "create-outline",
        style: "default",
        onPress: () => {
          setEditingProjectId(item.id);
          setEditingProjectValues({
            name: item.name,
            description: item.description ?? "",
            locationLabel: item.locationLabel ?? item.location ?? "",
            locationAddress: item.locationAddress ?? "",
            date: item.dateObj ?? null,
          });
          setProjectModalVisible(true);
        },
      });
      actions.push({
        label: "Supprimer",
        icon: "trash-outline",
        style: "destructive",
        onPress: () => {
          showConfirm({
            title: "Supprimer le projet",
            message: `Supprimer "${item.name}" définitivement ?`,
            confirmLabel: "Supprimer",
            destructive: true,
            onConfirm: async () => {
              try {
                // 1. Delete linked events
                const eventsSnap = await getDocs(
                  query(collection(db, "events"), where("projectId", "==", item.id))
                );
                if (eventsSnap.docs.length > 0) {
                  const evtBatch = writeBatch(db);
                  eventsSnap.docs.forEach((d) => evtBatch.delete(d.ref));
                  await evtBatch.commit();
                }

                // 2. Delete channel + its messages
                if (item.channelId) {
                  const msgsSnap = await getDocs(
                    collection(db, "channels", item.channelId, "messages")
                  );
                  const chBatch = writeBatch(db);
                  msgsSnap.docs.forEach((d) => chBatch.delete(d.ref));
                  chBatch.delete(doc(db, "channels", item.channelId));
                  await chBatch.commit();
                }

                // 3. Delete votes subcollection + project doc
                const votesSnap = await getDocs(
                  collection(db, "projects", item.id, "votes")
                );
                const projBatch = writeBatch(db);
                votesSnap.docs.forEach((d) => projBatch.delete(d.ref));
                projBatch.delete(doc(db, "projects", item.id));
                await projBatch.commit();

                showToast("Projet supprimé", "success");
              } catch {
                showToast("Impossible de supprimer", "error");
              }
            },
          });
        },
      });
    }

    actions.push({ label: "Annuler", style: "cancel", onPress: () => {} });

    if (actions.length > 1) {
      showActionSheet({
        title: "Options du projet",
        message: `"${item.name}"`,
        actions,
      });
    }
  };

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
        setEventAttendees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
  const getEventPhase = (dateObj: Date): "future" | "ongoing" | "past" => {
    const now = new Date();
    if (now < dateObj) return "future";
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 0, 0);
    return now <= endOfDay ? "ongoing" : "past";
  };

  const isEventPast = (date: Date) => getEventPhase(date) === "past";

  // --- 3. SAUVEGARDE (AJOUT OU MODIF) ---
  const handleSaveEvent = async (data: EventFormData) => {
    const eventData = {
      title: data.title.trim(),
      description: data.description.trim(),
      type: "General",
      date: Timestamp.fromDate(data.date),
      location: data.locationLabel.trim(),
      locationLabel: data.locationLabel.trim(),
      locationAddress: data.locationAddress.trim(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), eventData);
      } else {
        await addDoc(collection(db, "events"), eventData);
      }

      if (data.saveAddress && data.locationLabel.trim()) {
        await addDoc(collection(db, "savedLocations"), {
          label: data.locationLabel.trim(),
          address: data.locationAddress.trim(),
          createdAt: Timestamp.now(),
        });
      }

      closeModal();
    } catch {
      showToast("Impossible de sauvegarder.", "error");
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setEditingInitialValues(undefined);
  };

  // --- HANDLERS POUR LES DISPONIBILITÉS ---
  const handleSaveAvailability = async (data: AvailabilityData) => {
    if (!user) return;

    try {
      await addDoc(collection(db, "users", user.uid, "availabilities"), {
        days: data.selectedDayNames,
        startHours: data.startHours,
        startMinutes: data.startMinutes,
        endHours: data.endHours,
        endMinutes: data.endMinutes,
        isRecurring: true,
        createdAt: Timestamp.now(),
      });

      showToast("Disponibilité récurrente enregistrée", "success");
      setAvailabilityModalVisible(false);
    } catch {
      showToast("Impossible de sauvegarder la disponibilité", "error");
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    if (!user) return;
    showConfirm({
      title: "Supprimer la disponibilité",
      message: "Êtes-vous sûr de vouloir supprimer cette disponibilité ?",
      confirmLabel: "Supprimer",
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "users", user.uid, "availabilities", id));
          showToast("Disponibilité supprimée", "success");
        } catch (error) {
          console.error("Erreur:", error);
          showToast("Impossible de supprimer", "error");
        }
      },
    });
  };

  // --- EXPORTER UN ÉVÉNEMENT VERS LE CALENDRIER NATIF ---
  const handleExportToCalendar = async (item: any) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        showToast("L'application n'a pas accès à votre calendrier.", "error");
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT,
      );
      const target =
        calendars.find((c) => c.isPrimary && c.allowsModifications) ??
        calendars.find((c) => c.allowsModifications);

      if (!target) {
        showToast("Aucun calendrier modifiable trouvé.", "error");
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

      showToast(`"${item.title}" ajouté à votre calendrier.`, "success");
    } catch (error) {
      console.error("Export calendrier:", error);
      showToast("Impossible d'ajouter l'événement au calendrier.", "error");
    }
  };

  // --- 4. GÉRER L'APPUI LONG (MODIF / SUPPR) ---
  const handleLongPress = (item: any) => {
    showActionSheet({
      title: "Options de l'événement",
      message: `"${item.title}"`,
      actions: [
        {
          label: "Modifier",
          icon: "create-outline",
          style: "default",
          onPress: () => {
            setEditingId(item.id);
            setEditingInitialValues({
              title: item.title,
              description: item.description ?? "",
              locationLabel: item.locationLabel ?? item.location ?? "",
              locationAddress: item.locationAddress ?? "",
              date: item.dateObj,
            });
            setModalVisible(true);
          },
        },
        {
          label: "Supprimer",
          icon: "trash-outline",
          style: "destructive",
          onPress: () => {
            showConfirm({
              title: "Supprimer l'événement",
              message: `Supprimer "${item.title}" définitivement ?`,
              confirmLabel: "Supprimer",
              destructive: true,
              onConfirm: async () => {
                await deleteDoc(doc(db, "events", item.id));
              },
            });
          },
        },
        { label: "Annuler", style: "cancel", onPress: () => {} },
      ],
    });
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
        {
          userId: user.uid,
          userName: displayName,
          status,
          updatedAt: Timestamp.now(),
        },
      );
    } catch {
      showToast("Impossible de mettre à jour ta participation.", "error");
    }
  };

  const handleOpenMaps = (address: string) => {
    if (!address.trim()) return;
    const encoded = encodeURIComponent(address);
    const urlIOS = `maps://maps.apple.com/?q=${encoded}`;
    const urlAndroid = `geo:0,0?q=${encoded}`;
    const fallback = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

    const url = Platform.OS === "ios" ? urlIOS : urlAndroid;
    Linking.canOpenURL(url).then((ok) => Linking.openURL(ok ? url : fallback));
  };

  // --- QR & Scanner ---
  const handleShowEventQR = (event: any) => setQrEvent(event);

  const handleStartScan = async () => {
    if (!scanPermission?.granted) {
      const result = await requestScanPermission();
      if (!result.granted) {
        showToast("L'application a besoin d'accéder à votre caméra.", "error");
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
      showToast("Ce QR n'est pas un QR d'événement OJYQ.", "error");
      isProcessing.current = false;
    }
  }, []);

  const handleConfirmCheckin = async () => {
    if (!pendingCheckin || !user) return;

    const event = events.find((e) => e.id === pendingCheckin.eventId);
    const phase = event ? getEventPhase(event.dateObj) : "past";

    if (phase === "future") {
      showToast("L'événement n'a pas encore commencé.", "info");
      setPendingCheckin(null);
      isProcessing.current = false;
      return;
    }
    if (phase === "past") {
      showToast("Cet événement est terminé.", "info");
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
      showToast(
        `Présence enregistrée pour "${pendingCheckin.title}"`,
        "success",
      );
    } catch {
      showToast("Impossible d'enregistrer ta présence.", "error");
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
            color={viewMode === "events" ? colors.surface : colors.textSecondary}
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
            viewMode === "projects" && dynamicStyles.tabActive,
          ]}
          onPress={() => setViewMode("projects")}
        >
          <Ionicons
            name="folder-open"
            size={20}
            color={viewMode === "projects" ? colors.surface : colors.textSecondary}
          />
          <Text
            style={[
              dynamicStyles.tabText,
              viewMode === "projects" && dynamicStyles.tabTextActive,
            ]}
          >
            Projets
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
            color={viewMode === "availability" ? colors.surface : colors.textSecondary}
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
      ) : viewMode === "projects" ? (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={dynamicStyles.listContent}
          ListEmptyComponent={
            <View style={dynamicStyles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color="#999" />
              <Text style={dynamicStyles.emptyText}>
                Aucun projet.{"\n"}Appuyez sur + pour en créer un.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/project/${item.id}` as any)}
              onLongPress={() => handleLongPressProject(item)}
              delayLongPress={500}
              style={[
                dynamicStyles.eventCard,
                { borderLeftColor: colors.accent2 },
              ]}
            >
              <View style={dynamicStyles.dateContainer}>
                {item.dateObj ? (
                  <>
                    <Text style={dynamicStyles.dateText}>
                      {item.dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </Text>
                    <Text style={dynamicStyles.timeText}>
                      {item.dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </>
                ) : (
                  <Ionicons name="folder-open-outline" size={26} color={colors.accent2} />
                )}
              </View>
              <View style={dynamicStyles.contentContainer}>
                <Text style={dynamicStyles.eventTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={dynamicStyles.detailsRow}>
                  <Text style={[dynamicStyles.eventType, { color: colors.accent2 }]}>
                    PROJET
                  </Text>
                  {item.location && (
                    <Text style={dynamicStyles.locationText} numberOfLines={1}>
                      📍 {item.location}
                    </Text>
                  )}
                </View>
                {item.description ? (
                  <Text
                    style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        />
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
                onPress={() => handleEventPress(item)}
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
                        style={[
                          dynamicStyles.eventType,
                          { color: phaseConfig.color },
                        ]}
                      >
                        {phaseConfig.label}
                      </Text>
                    </View>
                    {item.location && (
                      <Text
                        style={dynamicStyles.locationText}
                        numberOfLines={1}
                      >
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
      ) : (
        (() => {
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

          const AvailabilitySlot = ({
            item,
            canDelete,
          }: {
            item: any;
            canDelete: boolean;
          }) => (
            <TouchableOpacity
              onLongPress={() => canDelete && handleDeleteAvailability(item.id)}
              delayLongPress={500}
              style={dynamicStyles.availabilityCard}
            >
              <View style={dynamicStyles.dateContainer}>
                <Text style={dynamicStyles.dateText} numberOfLines={2}>
                  {Array.isArray(item.days)
                    ? item.days.join(", ")
                    : "Jours multiples"}
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
                  {canDelete
                    ? "Appuyez longuement pour supprimer"
                    : "Disponible"}
                </Text>
              </View>
            </TouchableOpacity>
          );

          return (
            <FlatList
              data={canManageSchedule ? memberGroups : availabilities}
              // memberGroups items have userId; availabilities items have id
              keyExtractor={(item) => item.userId ?? item.id}
              contentContainerStyle={dynamicStyles.listContent}
              ListHeaderComponent={
                <>
                  <WeeklyCoverageChart availabilities={allAvailabilities} />

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
                      <Ionicons
                        name="calendar-number-outline"
                        size={18}
                        color="#fff"
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: "#fff",
                        }}
                      >
                        Générer l'horaire de permanence
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              }
              ListEmptyComponent={
                canManageSchedule ? (
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
                ) : (
                  <View style={dynamicStyles.emptyContainer}>
                    <Ionicons name="time-outline" size={48} color="#999" />
                    <Text style={dynamicStyles.emptyText}>
                      Aucun créneau enregistré.{"\n"}Appuyez sur + pour en
                      ajouter un.
                    </Text>
                  </View>
                )
              }
              renderItem={({ item }) => {
                if (canManageSchedule) {
                  // Vue admin : carte par membre avec ses créneaux
                  const group = item as {
                    userId: string;
                    userName: string;
                    slots: any[];
                  };
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
                          backgroundColor: isMe
                            ? colors.primary + "18"
                            : "transparent",
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
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: colors.primary,
                            }}
                          >
                            {(group.userName?.[0] ?? "?").toUpperCase()}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: colors.textPrimary,
                            flex: 1,
                          }}
                        >
                          {group.userName}
                          {isMe && (
                            <Text
                              style={{
                                fontWeight: "400",
                                color: colors.textSecondary,
                              }}
                            >
                              {" "}
                              (moi)
                            </Text>
                          )}
                        </Text>
                        <Text
                          style={{ fontSize: 12, color: colors.textSecondary }}
                        >
                          {group.slots.length} créneau
                          {group.slots.length > 1 ? "x" : ""}
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
      )}

      <TouchableOpacity
        style={[dynamicStyles.fab]}
        onPress={() => {
          if (viewMode === "events") setModalVisible(true);
          else if (viewMode === "projects") setProjectModalVisible(true);
          else setAvailabilityModalVisible(true);
        }}
      >
        <Ionicons name="add" size={30} color={colors.surface} />
      </TouchableOpacity>

      <EventFormModal
        visible={modalVisible}
        onDismiss={closeModal}
        editingId={editingId}
        initialValues={editingInitialValues}
        savedLocations={savedLocations}
        onSave={handleSaveEvent}
      />

      <ProjectFormModal
        visible={projectModalVisible}
        onDismiss={() => {
          setProjectModalVisible(false);
          setEditingProjectId(null);
          setEditingProjectValues(undefined);
        }}
        editingId={editingProjectId}
        initialValues={editingProjectValues}
        savedLocations={savedLocations}
        onSave={handleSaveProject}
      />

      {/* MODAL HORAIRE DE PERMANENCE */}
      <DismissableModal
        visible={scheduleModalVisible}
        onDismiss={() => setScheduleModalVisible(false)}
        animationType="slide"
      >
        <View
          style={[
            dynamicStyles.modalView,
            {
              height: "90%",
              paddingBottom: 0,
              ...(Platform.OS === "web" && {
                top: "20%",
                maxHeight: "60%",
              }),
            },
          ]}
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
            Basé sur les disponibilités de {Object.keys(allUsersMap).length}{" "}
            membres
          </Text>
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
            nestedScrollEnabled
          >
            {(
              [
                "Lundi",
                "Mardi",
                "Mercredi",
                "Jeudi",
                "Vendredi",
                "Samedi",
                "Dimanche",
              ] as const
            ).map((day) => {
              // Membres disponibles ce jour-là
              const available = allAvailabilities.filter(
                (a) => Array.isArray(a.days) && a.days.includes(day),
              );
              // Calcul de la couverture unique (merge intervals)
              const totalMinutes = available.reduce((sum, a) => {
                const dur =
                  a.endHours * 60 +
                  a.endMinutes -
                  (a.startHours * 60 + a.startMinutes);
                return sum + Math.max(0, dur);
              }, 0);
              const coveredHours = Math.round((totalMinutes / 60) * 10) / 10;
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
                      backgroundColor: meetsTarget
                        ? "#10B98114"
                        : colors.surfaceDim,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: colors.textPrimary,
                      }}
                    >
                      {day}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
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
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color="#10B981"
                        />
                      )}
                    </View>
                  </View>

                  {/* Liste des membres */}
                  {available.length === 0 ? (
                    <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textTertiary,
                          fontStyle: "italic",
                        }}
                      >
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
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: colors.primary,
                              }}
                            >
                              {(name[0] ?? "?").toUpperCase()}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: 13,
                              color: colors.textPrimary,
                              flex: 1,
                            }}
                            numberOfLines={1}
                          >
                            {name}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.textSecondary,
                            }}
                          >
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
            })}
            <View style={{ height: 16 }} />
          </ScrollView>

          <TouchableOpacity
            onPress={() => setScheduleModalVisible(false)}
            style={[
              dynamicStyles.buttonSave,
              {
                ...(Platform.OS === "web" ? { flex: -1 } : { flex: 0 }),
                height: 45,
                alignSelf: "stretch",
                marginTop: 12,
                marginBottom: 16,
                paddingVertical: 14,
              },
            ]}
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
          <Ionicons
            name="warning-outline"
            size={40}
            color="#F59E0B"
            style={{ marginBottom: 12 }}
          />
          <Text style={[dynamicStyles.modalTitle, { fontSize: 16 }]}>
            Modifier le statut ?
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 20,
            }}
          >
            Tu es actuellement marqué{" "}
            <Text style={{ fontWeight: "700", color: colors.textPrimary }}>
              présent en présentiel
            </Text>
            .{"\n"}Veux-tu vraiment passer en{" "}
            <Text style={{ fontWeight: "700", color: "#06B6D4" }}>
              En ligne
            </Text>{" "}
            ?
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
        {selectedEvent &&
          (() => {
            const ev = selectedEvent;
            const phase = getEventPhase(ev.dateObj);
            const myParticipant = participants.find(
              (p) => p.userId === user?.uid,
            );
            const myStatus = myParticipant?.status as
              | "going"
              | "not_going"
              | "online"
              | "absent"
              | "present_physical"
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
              <SafeAreaView
                style={{ flex: 1, backgroundColor: colors.surface }}
                edges={["top"]}
              >
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
                    <Ionicons
                      name="arrow-back"
                      size={24}
                      color={colors.textPrimary}
                    />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: colors.textPrimary,
                      }}
                      numberOfLines={1}
                    >
                      {ev.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
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
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: "#10B981",
                        }}
                      />
                    )}
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: phaseHeaderConfig.color,
                      }}
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
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.textPrimary,
                          lineHeight: 20,
                        }}
                      >
                        {ev.description}
                      </Text>
                    </View>
                  )}

                  {/* ── Carte lieu ── */}
                  {!!address && (
                    <TouchableOpacity
                      onPress={() => handleOpenMaps(address)}
                      activeOpacity={0.85}
                      style={{
                        borderRadius: 14,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
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
                        <Ionicons
                          name="map"
                          size={36}
                          color={isDark ? "#4CAF50" : "#2E7D32"}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            color: isDark ? "#81C784" : "#388E3C",
                            fontWeight: "600",
                          }}
                        >
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
                        <Ionicons
                          name="location"
                          size={18}
                          color={colors.primary}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "700",
                              color: colors.textPrimary,
                            }}
                          >
                            {label}
                          </Text>
                          {!!ev.locationAddress && (
                            <Text
                              style={{
                                fontSize: 12,
                                color: colors.textSecondary,
                                marginTop: 2,
                              }}
                            >
                              {ev.locationAddress}
                            </Text>
                          )}
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={colors.textTertiary}
                        />
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
                              backgroundColor:
                                myStatus === "going"
                                  ? "#007AFF"
                                  : colors.surface,
                              borderWidth: 1,
                              borderColor:
                                myStatus === "going"
                                  ? "#007AFF"
                                  : colors.border,
                            }}
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color={
                                myStatus === "going"
                                  ? "#fff"
                                  : colors.textSecondary
                              }
                            />
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: "700",
                                color:
                                  myStatus === "going"
                                    ? "#fff"
                                    : colors.textSecondary,
                              }}
                            >
                              Je participe
                            </Text>
                          </TouchableOpacity>

                          {/* Pas disponible */}
                          <TouchableOpacity
                            onPress={() =>
                              handleParticipationChange("not_going")
                            }
                            style={{
                              flex: 1,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              paddingVertical: 13,
                              borderRadius: 10,
                              backgroundColor:
                                myStatus === "not_going"
                                  ? "#EF4444"
                                  : colors.surface,
                              borderWidth: 1,
                              borderColor:
                                myStatus === "not_going"
                                  ? "#EF4444"
                                  : colors.border,
                            }}
                          >
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color={
                                myStatus === "not_going"
                                  ? "#fff"
                                  : colors.textSecondary
                              }
                            />
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: "700",
                                color:
                                  myStatus === "not_going"
                                    ? "#fff"
                                    : colors.textSecondary,
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
                          <View
                            style={{
                              alignItems: "center",
                              paddingVertical: 16,
                            }}
                          >
                            <Ionicons
                              name="people-outline"
                              size={32}
                              color={colors.textTertiary}
                            />
                            <Text
                              style={{
                                fontSize: 13,
                                color: colors.textTertiary,
                                marginTop: 8,
                              }}
                            >
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
                                    backgroundColor: isGoing
                                      ? "#007AFF22"
                                      : "#EF444422",
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
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      fontWeight: "600",
                                      color: colors.textPrimary,
                                    }}
                                  >
                                    {p.userName}
                                  </Text>
                                  {at && (
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        color: colors.textTertiary,
                                        marginTop: 2,
                                      }}
                                    >
                                      {at.toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "short",
                                      })}{" "}
                                      à{" "}
                                      {at.toLocaleTimeString("fr-FR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </Text>
                                  )}
                                </View>
                                <Ionicons
                                  name={
                                    isGoing
                                      ? "checkmark-circle"
                                      : "close-circle"
                                  }
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
                              <Ionicons
                                name="checkmark-circle"
                                size={18}
                                color="#fff"
                              />
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "700",
                                  color: "#fff",
                                }}
                              >
                                Présent en présentiel ✓
                              </Text>
                            </View>
                            {/* Bouton downgrade */}
                            <TouchableOpacity
                              onPress={() => setShowDowngradeConfirm(true)}
                              style={{ marginTop: 10, alignItems: "center" }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: "#06B6D4",
                                  fontWeight: "600",
                                }}
                              >
                                Passer en ligne à la place →
                              </Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <View style={{ gap: 10 }}>
                            {/* Bouton En ligne */}
                            <TouchableOpacity
                              onPress={() =>
                                handleParticipationChange("online")
                              }
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                paddingVertical: 13,
                                borderRadius: 10,
                                backgroundColor:
                                  myStatus === "online"
                                    ? "#06B6D4"
                                    : colors.surface,
                                borderWidth: 1,
                                borderColor:
                                  myStatus === "online"
                                    ? "#06B6D4"
                                    : colors.border,
                              }}
                            >
                              <Ionicons
                                name="wifi"
                                size={18}
                                color={
                                  myStatus === "online"
                                    ? "#fff"
                                    : colors.textSecondary
                                }
                              />
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "700",
                                  color:
                                    myStatus === "online"
                                      ? "#fff"
                                      : colors.textSecondary,
                                }}
                              >
                                {myStatus === "online"
                                  ? "En ligne ✓"
                                  : "Je suis en ligne"}
                              </Text>
                            </TouchableOpacity>

                            {/* Bouton Absent */}
                            <TouchableOpacity
                              onPress={() =>
                                handleParticipationChange("absent")
                              }
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                paddingVertical: 13,
                                borderRadius: 10,
                                backgroundColor:
                                  myStatus === "absent"
                                    ? "#F59E0B"
                                    : colors.surface,
                                borderWidth: 1,
                                borderColor:
                                  myStatus === "absent"
                                    ? "#F59E0B"
                                    : colors.border,
                              }}
                            >
                              <Ionicons
                                name="moon"
                                size={18}
                                color={
                                  myStatus === "absent"
                                    ? "#fff"
                                    : colors.textSecondary
                                }
                              />
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "700",
                                  color:
                                    myStatus === "absent"
                                      ? "#fff"
                                      : colors.textSecondary,
                                }}
                              >
                                {myStatus === "absent"
                                  ? "Absent ✓"
                                  : "Je suis absent"}
                              </Text>
                            </TouchableOpacity>

                            <Text
                              style={{
                                fontSize: 11,
                                color: colors.textTertiary,
                                textAlign: "center",
                              }}
                            >
                              Le scan QR sur place marque automatiquement ta
                              présence physique.
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
                          <View
                            style={{
                              alignItems: "center",
                              paddingVertical: 16,
                            }}
                          >
                            <Ionicons
                              name="people-outline"
                              size={32}
                              color={colors.textTertiary}
                            />
                            <Text
                              style={{
                                fontSize: 13,
                                color: colors.textTertiary,
                                marginTop: 8,
                              }}
                            >
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
                              ? {
                                  color: "#007AFF",
                                  bg: "#007AFF22",
                                  icon: "checkmark-circle" as const,
                                  label: "Présentiel",
                                }
                              : isOnline
                                ? {
                                    color: "#06B6D4",
                                    bg: "#06B6D422",
                                    icon: "wifi" as const,
                                    label: "En ligne",
                                  }
                                : {
                                    color: "#F59E0B",
                                    bg: "#F59E0B22",
                                    icon: "moon" as const,
                                    label: "Absent",
                                  };

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
                                  <Text
                                    style={{
                                      fontSize: 15,
                                      fontWeight: "700",
                                      color: statusConfig.color,
                                    }}
                                  >
                                    {(p.userName?.[0] ?? "?").toUpperCase()}
                                  </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 14,
                                        fontWeight: "600",
                                        color: colors.textPrimary,
                                      }}
                                    >
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
                                      <Ionicons
                                        name={statusConfig.icon}
                                        size={9}
                                        color={statusConfig.color}
                                      />
                                      <Text
                                        style={{
                                          fontSize: 10,
                                          fontWeight: "700",
                                          color: statusConfig.color,
                                        }}
                                      >
                                        {statusConfig.label}
                                      </Text>
                                    </View>
                                  </View>
                                  {at && (
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        color: colors.textTertiary,
                                        marginTop: 2,
                                      }}
                                    >
                                      Pointé le{" "}
                                      {at.toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "short",
                                      })}{" "}
                                      à{" "}
                                      {at.toLocaleTimeString("fr-FR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </Text>
                                  )}
                                </View>
                                <Ionicons
                                  name={statusConfig.icon}
                                  size={20}
                                  color={statusConfig.color}
                                />
                              </View>
                            );
                          })
                        )}
                      </View>
                    </>
                  )}

                  {/* ══════════════════════════════════════════════════
                    PHASE 3 — PAST : liste de présence (lecture seule)
                ══════════════════════════════════════════════════ */}
                  {phase === "past" &&
                    (() => {
                      const attendanceList = participants
                        .filter(
                          (p) =>
                            p.status === "online" ||
                            p.status === "present_physical",
                        )
                        .sort((a, b) => {
                          if (a.status === b.status)
                            return (a.userName ?? "").localeCompare(
                              b.userName ?? "",
                            );
                          return a.status === "present_physical" ? -1 : 1;
                        });

                      const physicalNames = attendanceList
                        .filter((p) => p.status === "present_physical")
                        .map((p) => p.userName ?? "?");
                      const onlineNames = attendanceList
                        .filter((p) => p.status === "online")
                        .map((p) => p.userName ?? "?");

                      const handleCopy = async () => {
                        const text = formatAttendanceText(
                          ev.title,
                          ev.dateObj,
                          onlineNames,
                          physicalNames,
                        );
                        await Clipboard.setStringAsync(text);
                        setCopiedAttendance(true);
                        setTimeout(() => setCopiedAttendance(false), 2000);
                      };

                      return (
                        <View
                          style={{
                            backgroundColor: colors.surfaceDim,
                            borderRadius: 14,
                            padding: 14,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          {/* Header */}
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 12,
                            }}
                          >
                            <View>
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "700",
                                  color: colors.textSecondary,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.8,
                                }}
                              >
                                Liste de présence
                              </Text>
                              {attendanceList.length > 0 && (
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: colors.textTertiary,
                                    marginTop: 2,
                                  }}
                                >
                                  {physicalNames.length > 0 &&
                                    `${physicalNames.length} présentiel`}
                                  {physicalNames.length > 0 &&
                                    onlineNames.length > 0 &&
                                    " · "}
                                  {onlineNames.length > 0 &&
                                    `${onlineNames.length} en ligne`}
                                </Text>
                              )}
                            </View>
                            {attendanceList.length > 0 && (
                              <TouchableOpacity
                                onPress={handleCopy}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 5,
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  backgroundColor: copiedAttendance
                                    ? "#10B98120"
                                    : colors.surface,
                                  borderWidth: 1,
                                  borderColor: copiedAttendance
                                    ? "#10B981"
                                    : colors.border,
                                }}
                              >
                                <Ionicons
                                  name={
                                    copiedAttendance
                                      ? "checkmark"
                                      : "copy-outline"
                                  }
                                  size={14}
                                  color={
                                    copiedAttendance
                                      ? "#10B981"
                                      : colors.textSecondary
                                  }
                                />
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: "600",
                                    color: copiedAttendance
                                      ? "#10B981"
                                      : colors.textSecondary,
                                  }}
                                >
                                  {copiedAttendance ? "Copié !" : "Copier"}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* List */}
                          {attendanceList.length === 0 ? (
                            <View
                              style={{
                                alignItems: "center",
                                paddingVertical: 16,
                              }}
                            >
                              <Ionicons
                                name="people-outline"
                                size={32}
                                color={colors.textTertiary}
                              />
                              <Text
                                style={{
                                  fontSize: 13,
                                  color: colors.textTertiary,
                                  marginTop: 8,
                                }}
                              >
                                Aucune présence enregistrée.
                              </Text>
                            </View>
                          ) : (
                            attendanceList.map((p, idx) => {
                              const isPhysical =
                                p.status === "present_physical";
                              const statusColor = isPhysical
                                ? "#007AFF"
                                : "#06B6D4";
                              const statusLabel = isPhysical
                                ? "Présentiel"
                                : "En ligne";
                              const statusIcon = isPhysical
                                ? "checkmark-circle"
                                : "wifi";
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
                                      backgroundColor: statusColor + "22",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 14,
                                        fontWeight: "700",
                                        color: statusColor,
                                      }}
                                    >
                                      {(p.userName?.[0] ?? "?").toUpperCase()}
                                    </Text>
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={{
                                        fontSize: 14,
                                        fontWeight: "600",
                                        color: colors.textPrimary,
                                      }}
                                    >
                                      {p.userName}
                                    </Text>
                                    {at && (
                                      <Text
                                        style={{
                                          fontSize: 11,
                                          color: colors.textTertiary,
                                          marginTop: 2,
                                        }}
                                      >
                                        {at.toLocaleDateString("fr-FR", {
                                          day: "numeric",
                                          month: "short",
                                        })}{" "}
                                        à{" "}
                                        {at.toLocaleTimeString("fr-FR", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
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
                                    <Ionicons
                                      name={statusIcon as any}
                                      size={12}
                                      color={statusColor}
                                    />
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        fontWeight: "700",
                                        color: statusColor,
                                      }}
                                    >
                                      {statusLabel}
                                    </Text>
                                  </View>
                                </View>
                              );
                            })
                          )}
                        </View>
                      );
                    })()}

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
                {
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: "center",
                  borderRadius: 6,
                },
                qrModalTab === "qr" && {
                  backgroundColor: colors.surfaceDim,
                  elevation: 1,
                },
              ]}
              onPress={() => setQrModalTab("qr")}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: qrModalTab === "qr" ? "700" : "500",
                  color:
                    qrModalTab === "qr"
                      ? colors.textPrimary
                      : colors.textSecondary,
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

          <View
            style={{
              flexDirection: "row",
              borderRadius: 8,
              padding: 4,
              marginBottom: 10,
              width: "100%",
            }}
          >
            <TouchableOpacity
              onPress={() => setQrEvent(null)}
              style={[
                dynamicStyles.buttonSave,
                { width: "100%", marginTop: 20 },
              ]}
            >
              <Text style={dynamicStyles.textSave}>Fermer</Text>
            </TouchableOpacity>
          </View>
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
            <Text style={{ fontWeight: "700", color: colors.textPrimary }}>
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

      <AvailabilityModal
        visible={availabilityModalVisible}
        onDismiss={() => setAvailabilityModalVisible(false)}
        onSave={handleSaveAvailability}
      />
    </SafeAreaView>
  );
}
