/**
 * Page de détail d'un projet
 * Accessible depuis : l'onglet Projets du calendrier OU le lien dans le canal de clavardage
 */

import { showToast } from "@/components/Toast";
import { showConfirm } from "@/components/ui/ConfirmModal";
import { EventFormData, EventFormModal } from "@/components/calendar";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useProfile } from "@/hooks/use-profile";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../firebaseConfig";

const VOTE_LOCK_MS = 24 * 60 * 60 * 1000; // 24 heures

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const auth = getAuth();
  const user = auth.currentUser;
  const { profile } = useProfile();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState<any[]>([]);
  const [linkedEvents, setLinkedEvents] = useState<any[]>([]);
  const [savedLocations, setSavedLocations] = useState<any[]>([]);
  const [eventModalVisible, setEventModalVisible] = useState(false);

  // Charger le projet
  useEffect(() => {
    if (!id) return;
    return onSnapshot(doc(db, "projects", id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProject({
          id: snap.id,
          ...data,
          dateObj: data.date?.toDate?.() ?? null,
        });
      }
      setLoading(false);
    });
  }, [id]);

  // Charger les votes
  useEffect(() => {
    if (!id) return;
    return onSnapshot(collection(db, "projects", id, "votes"), (snap) => {
      setVotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [id]);

  // Charger les événements liés
  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, "events"),
      where("projectId", "==", id),
      orderBy("date", "asc"),
    );
    return onSnapshot(q, (snap) => {
      setLinkedEvents(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            dateObj: data.date?.toDate?.() ?? new Date(),
          };
        }),
      );
    });
  }, [id]);

  // Charger les lieux sauvegardés
  useEffect(() => {
    return onSnapshot(collection(db, "savedLocations"), (snap) => {
      setSavedLocations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // ── Vote ──────────────────────────────────────────────────────────────────
  const myVote = user ? votes.find((v) => v.id === user.uid) : null;
  const myVoteLockedAt = myVote?.votedAt?.toDate?.() ?? null;
  const isVoteLocked = myVoteLockedAt
    ? Date.now() - myVoteLockedAt.getTime() >= VOTE_LOCK_MS
    : false;

  const handleVote = async (value: "pour" | "contre") => {
    if (!user || !id) return;
    if (isVoteLocked) {
      showToast("Votre vote est verrouillé (plus de 24h).", "error");
      return;
    }
    const displayName =
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "Membre";
    try {
      await setDoc(doc(db, "projects", id, "votes", user.uid), {
        userId: user.uid,
        userName: displayName,
        vote: value,
        votedAt: Timestamp.now(),
      });
      showToast(
        value === "pour" ? "Vote Pour enregistré ✓" : "Vote Contre enregistré ✓",
        "success",
      );
    } catch {
      showToast("Impossible d'enregistrer le vote.", "error");
    }
  };

  // ── Créer un événement lié ────────────────────────────────────────────────
  const handleSaveLinkedEvent = async (data: EventFormData) => {
    if (!id) return;
    try {
      await addDoc(collection(db, "events"), {
        title: data.title.trim(),
        description: data.description.trim(),
        type: "General",
        date: Timestamp.fromDate(data.date),
        location: data.locationLabel.trim(),
        locationLabel: data.locationLabel.trim(),
        locationAddress: data.locationAddress.trim(),
        projectId: id,
        createdBy: user?.uid ?? "system",
      });

      if (data.saveAddress && data.locationLabel.trim()) {
        await addDoc(collection(db, "savedLocations"), {
          label: data.locationLabel.trim(),
          address: data.locationAddress.trim(),
          createdAt: Timestamp.now(),
        });
      }

      setEventModalVisible(false);
      showToast("Événement créé et lié au projet ✓", "success");
    } catch {
      showToast("Impossible de créer l'événement.", "error");
    }
  };

  // ── Navigue vers le canal ─────────────────────────────────────────────────
  const handleOpenChannel = () => {
    if (project?.channelId) {
      router.push(
        `/channel/${project.channelId}?name=${encodeURIComponent(project.name)}` as any,
      );
    }
  };

  // ── UI helpers ────────────────────────────────────────────────────────────
  const pourVotes = votes.filter((v) => v.vote === "pour");
  const contreVotes = votes.filter((v) => v.vote === "contre");

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" }}
        edges={["top"]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" }}
        edges={["top"]}
      >
        <Text style={{ color: colors.textSecondary }}>Projet introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary }}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary }}
            numberOfLines={1}
          >
            {project.name}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
            Projet
          </Text>
        </View>
        {project.channelId && (
          <TouchableOpacity
            onPress={handleOpenChannel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* ── Infos générales ── */}
        {!!project.description && (
          <View
            style={{
              backgroundColor: colors.surfaceDim,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 6 }}>
              DESCRIPTION
            </Text>
            <Text style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 20 }}>
              {project.description}
            </Text>
          </View>
        )}

        {(project.dateObj || project.location) && (
          <View
            style={{
              backgroundColor: colors.surfaceDim,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 8,
            }}
          >
            {project.dateObj && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 14, color: colors.textPrimary }}>
                  {project.dateObj.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  à{" "}
                  {project.dateObj.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            )}
            {project.location && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="location-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 14, color: colors.textPrimary }}>
                  {project.location}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Section Vote ── */}
        <View
          style={{
            backgroundColor: colors.surfaceDim,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 10 }}>
            Vote
          </Text>

          {/* Avertissement permanent */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 8,
              backgroundColor: "#F59E0B18",
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#F59E0B40",
            }}
          >
            <Ionicons name="warning-outline" size={16} color="#F59E0B" style={{ marginTop: 1 }} />
            <Text style={{ fontSize: 12, color: "#B45309", flex: 1, lineHeight: 18 }}>
              Un vote ne peut plus être modifié 24 heures après sa soumission.
            </Text>
          </View>

          {/* Statut du vote de l'utilisateur */}
          {myVote && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
              }}
            >
              {isVoteLocked ? (
                <>
                  <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Votre vote (
                    <Text style={{ fontWeight: "700" }}>
                      {myVote.vote === "pour" ? "Pour" : "Contre"}
                    </Text>
                    ) est verrouillé.
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Vous avez voté{" "}
                    <Text style={{ fontWeight: "700" }}>
                      {myVote.vote === "pour" ? "Pour" : "Contre"}
                    </Text>
                    {" "}— modifiable pendant encore{" "}
                    {Math.max(
                      0,
                      Math.floor(
                        (VOTE_LOCK_MS - (Date.now() - (myVote.votedAt?.toDate?.()?.getTime() ?? 0))) /
                          3600000,
                      ),
                    )}h.
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Boutons de vote */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => handleVote("pour")}
              disabled={isVoteLocked}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor:
                  myVote?.vote === "pour" ? "#10B981" : colors.surface,
                borderWidth: 1.5,
                borderColor: myVote?.vote === "pour" ? "#10B981" : colors.border,
                opacity: isVoteLocked && myVote?.vote !== "pour" ? 0.4 : 1,
              }}
            >
              <Ionicons
                name="thumbs-up"
                size={16}
                color={myVote?.vote === "pour" ? "#fff" : "#10B981"}
              />
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 14,
                  color: myVote?.vote === "pour" ? "#fff" : "#10B981",
                }}
              >
                Pour ({pourVotes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleVote("contre")}
              disabled={isVoteLocked}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor:
                  myVote?.vote === "contre" ? "#EF4444" : colors.surface,
                borderWidth: 1.5,
                borderColor: myVote?.vote === "contre" ? "#EF4444" : colors.border,
                opacity: isVoteLocked && myVote?.vote !== "contre" ? 0.4 : 1,
              }}
            >
              <Ionicons
                name="thumbs-down"
                size={16}
                color={myVote?.vote === "contre" ? "#fff" : "#EF4444"}
              />
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 14,
                  color: myVote?.vote === "contre" ? "#fff" : "#EF4444",
                }}
              >
                Contre ({contreVotes.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Listes des votants */}
          {(pourVotes.length > 0 || contreVotes.length > 0) && (
            <View style={{ marginTop: 14, gap: 10 }}>
              {pourVotes.length > 0 && (
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#10B981",
                      marginBottom: 4,
                    }}
                  >
                    Pour ({pourVotes.length})
                  </Text>
                  {pourVotes.map((v) => (
                    <View
                      key={v.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingVertical: 3,
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: "#10B98122",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: "700", color: "#10B981" }}>
                          {(v.userName?.[0] ?? "?").toUpperCase()}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, color: colors.textPrimary }}>
                        {v.userName}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {contreVotes.length > 0 && (
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#EF4444",
                      marginBottom: 4,
                    }}
                  >
                    Contre ({contreVotes.length})
                  </Text>
                  {contreVotes.map((v) => (
                    <View
                      key={v.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingVertical: 3,
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: "#EF444422",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: "700", color: "#EF4444" }}>
                          {(v.userName?.[0] ?? "?").toUpperCase()}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, color: colors.textPrimary }}>
                        {v.userName}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Événements liés ── */}
        <View
          style={{
            backgroundColor: colors.surfaceDim,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}>
              Événements liés ({linkedEvents.length})
            </Text>
            <TouchableOpacity
              onPress={() => setEventModalVisible(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: colors.primary + "18",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
              }}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
                Ajouter
              </Text>
            </TouchableOpacity>
          </View>

          {linkedEvents.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textTertiary, fontStyle: "italic" }}>
              Aucun événement lié. Appuyez sur Ajouter pour en créer un.
            </Text>
          ) : (
            linkedEvents.map((ev) => (
              <View
                key={ev.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 36,
                    alignItems: "center",
                    borderRightWidth: 1,
                    borderRightColor: colors.border,
                    paddingRight: 10,
                    marginRight: 4,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary }}>
                    {ev.dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {ev.dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary }}
                    numberOfLines={1}
                  >
                    {ev.title}
                  </Text>
                  {ev.location && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
                      📍 {ev.location}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <EventFormModal
        visible={eventModalVisible}
        onDismiss={() => setEventModalVisible(false)}
        editingId={null}
        savedLocations={savedLocations}
        onSave={handleSaveLinkedEvent}
      />
    </SafeAreaView>
  );
}
