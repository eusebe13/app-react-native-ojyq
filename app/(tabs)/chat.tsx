/**
 * ChatListScreen - Liste des canaux de discussion
 */

import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { showActionSheet } from "@/components/ActionSheet";
import { showToast } from "@/components/Toast";
import { showConfirm } from "@/components/ui/ConfirmModal";
import { Icon } from "@/components/ui/Icon";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import React, { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../contexts/ThemeContext";
import { computeIsUnread, useUnread } from "../../contexts/UnreadContext";
import { db } from "../../firebaseConfig";
import { Channel, channelFromFirestore } from "../../types/models";

// ─── Helper : initiales du canal ─────────────────────────────────────────────
function channelInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function relativeTime(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

// Liste des rôles possibles (basée sur ton models.ts)
const OJYQ_ROLES_GROUPS = [
  {
    id: "admin",
    label: "Administrateur / Admin",
    roles: ["Administrateur", "Admin"],
  },
  {
    id: "presidence",
    label: "Présidence (Président & Vice)",
    roles: ["Président", "Vice-Président"],
  },
  {
    id: "secretariat",
    label: "Secrétariat (Secrétaire & Vice)",
    roles: ["Secrétaire", "Vice-Secrétaire"],
  },
  {
    id: "tresorerie",
    label: "Trésorerie (Trésorier & Vice)",
    roles: ["Trésorier", "Vice-Trésorier"],
  },
  {
    id: "communication",
    label: "Communication (Resp & Vice)",
    roles: ["Responsable Communication", "Vice-Responsable Communication"],
  },
  { id: "loisir", label: "Resp. Loisir", roles: ["Responsable Loisir"] },
  {
    id: "discipline",
    label: "Resp. Discipline",
    roles: ["Responsable Discipline"],
  },
  { id: "conseiller", label: "Conseiller", roles: ["Conseiller"] },
  {
    id: "membre",
    label: "Membre régulier",
    roles: ["Membre", "Membre régulier"],
  },
];

export default function ChatListScreen(): ReactElement {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const currentUser = getAuth().currentUser;
  const [userProfile, setUserProfile] = useState<any>(null);

  // ── États ─────────────────────────────────────────────────────────────────
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [audienceType, setAudienceType] = useState<
    "public" | "roles" | "private"
  >("public");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [channelImage, setChannelImage] = useState<string | null>(null);
  const [dmModalVisible, setDmModalVisible] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState("");
  const [originalEditMembers, setOriginalEditMembers] = useState<string[]>([]);

  // ── Récupération Initiale ──────────────────────────────────────────────────
  useEffect(() => {
    // 1. Récupérer les canaux
    const qChannels = query(
      collection(db, "channels"),
      orderBy("createdAt", "desc"),
    );
    const unsubChannels = onSnapshot(
      qChannels,
      (snap) => {
        setChannels(snap.docs.map(channelFromFirestore));
        setLoading(false);
      },
      (err) => {
        console.error("[Chat]", err);
        setLoading(false);
      },
    );

    // 2. Récupérer le profil de l'utilisateur connecté (pour avoir son rôle)
    let unsubUser = () => {};
    if (currentUser?.uid) {
      unsubUser = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
        if (docSnap.exists()) setUserProfile(docSnap.data());
      });
    }

    // 3. Récupérer la liste de TOUS les utilisateurs (pour le Modal de création)
    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Erreur chargement utilisateurs:", error);
      }
    };
    fetchUsers();

    return () => {
      unsubChannels();
      unsubUser();
    };
  }, [currentUser]);

  // ── Gestion de la sélection (Toggle) ──────────────────────────────────────
  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  // ── Choix d'image ─────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    };
    const result = await ImagePicker.launchImageLibraryAsync(
      Platform.OS === "web" ? { ...options, allowsEditing: false } : options,
    );
    if (!result.canceled && result.assets[0].base64) {
      setChannelImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  // ── Sauvegarde canal ──────────────────────────────────────────────────────
  const handleSaveChannel = useCallback(async () => {
    const trimmed = channelName.trim();
    if (!trimmed) {
      showToast("Le nom du canal est obligatoire", "error");
      return;
    }

    if (audienceType === "roles" && selectedRoles.length === 0) {
      showToast("Veuillez sélectionner au moins un rôle.", "error");
      return;
    }
    if (audienceType === "private" && selectedUsers.length === 0) {
      showToast("Veuillez sélectionner au moins un membre.", "error");
      return;
    }

    try {
      const finalAllowedRoles =
        audienceType === "roles"
          ? selectedRoles.flatMap(
              (groupId) =>
                OJYQ_ROLES_GROUPS.find((g) => g.id === groupId)?.roles || [],
            )
          : [];

      // On inclut l'image dans les données
      const channelData: any = {
        name: trimmed,
        description: channelDescription.trim() || null,
        image: channelImage || null,
        type: audienceType === "public" ? "public" : "private",
        audienceType: audienceType,
        allowedRoles: finalAllowedRoles,
        members:
          audienceType === "private"
            ? Array.from(new Set([...selectedUsers, currentUser?.uid])) // Évite les doublons
            : [],
        updatedAt: Timestamp.now(),
      };

      if (editingId) {
        await updateDoc(doc(db, "channels", editingId), channelData);

        // Private DM preservation: when a 2-person private channel is expanded
        // to 3+ members, auto-create a new direct channel for the original pair.
        const newMemberCount = channelData.members?.length ?? 0;
        const isExpansion =
          audienceType === "private" &&
          originalEditMembers.length === 2 &&
          newMemberCount > 2;

        if (isExpansion) {
          const [uidA, uidB] = originalEditMembers;

          const dmExists = channels.some(
            (c) =>
              (c.type === "direct" || c.audienceType === "direct") &&
              c.members?.includes(uidA) &&
              c.members?.includes(uidB),
          );

          if (!dmExists) {
            const userA = users.find((u) => u.id === uidA);
            const userB = users.find((u) => u.id === uidB);
            const nameA =
              [userA?.firstName, userA?.lastName].filter(Boolean).join(" ") ||
              userA?.email ||
              uidA;
            const nameB =
              [userB?.firstName, userB?.lastName].filter(Boolean).join(" ") ||
              userB?.email ||
              uidB;

            await addDoc(collection(db, "channels"), {
              name: `${nameA} & ${nameB}`,
              description: null,
              image: null,
              type: "direct",
              audienceType: "direct",
              allowedRoles: [],
              members: [uidA, uidB],
              dmParticipants: {
                [uidA]: { name: nameA, avatar: null },
                [uidB]: { name: nameB, avatar: null },
              },
              createdAt: Timestamp.now(),
              createdBy: currentUser?.uid || uidA,
              lastMessage: "Canal privé créé automatiquement",
              lastMessageAt: Timestamp.now(),
            });

            showToast(
              `Canal privé recréé pour ${nameA} & ${nameB}`,
              "success",
            );
          }
        }
      } else {
        await addDoc(collection(db, "channels"), {
          ...channelData,
          createdAt: Timestamp.now(),
          createdBy: currentUser?.uid || "admin",
          lastMessage: "Canal créé",
          lastMessageAt: Timestamp.now(),
        });
      }
      closeModal();
    } catch {
      showToast("Impossible de sauvegarder le canal", "error");
    }
  }, [
    channelName,
    channelDescription,
    channelImage,
    editingId,
    audienceType,
    selectedRoles,
    selectedUsers,
    currentUser,
    originalEditMembers,
    channels,
    users,
  ]);

  // ── Long Press (Modifier/Supprimer) ───────────────────────────────────────
  const handleLongPress = useCallback(
    (channel: any) => {
      const isCreator = channel.createdBy === currentUser?.uid;
      const userRole = userProfile?.role;
      const isAdmin = userRole === "Administrateur" || userRole === "Admin";

      if (!isCreator && !isAdmin) {
        showToast(
          "Vous ne pouvez modifier que les canaux que vous avez créés.",
          "error",
        );
        return;
      }

      showActionSheet({
        title: "Gérer le canal",
        message: `"${channel.name}"`,
        actions: [
          {
            label: "Modifier",
            icon: "create-outline",
            style: "default",
            onPress: () => {
              setChannelName(channel.name);
              setChannelDescription(channel.description || "");
              setChannelImage(channel.image || null);
              setEditingId(channel.id);
              setAudienceType(channel.audienceType || "public");

              if (channel.audienceType === "roles") {
                const mappedRoles = OJYQ_ROLES_GROUPS.filter((g) =>
                  g.roles.some((r) => channel.allowedRoles?.includes(r)),
                ).map((g) => g.id);
                setSelectedRoles(mappedRoles);
              } else if (channel.audienceType === "private") {
                const mems = channel.members || [];
                setSelectedUsers(mems);
                setOriginalEditMembers(mems);
              }

              setModalVisible(true);
            },
          },
          {
            label: "Supprimer",
            icon: "trash-outline",
            style: "destructive",
            onPress: () => {
              showConfirm({
                title: "Supprimer le canal",
                message: `Voulez-vous vraiment supprimer "${channel.name}" ?`,
                confirmLabel: "Supprimer",
                destructive: true,
                onConfirm: async () => {
                  try {
                    await deleteDoc(doc(db, "channels", channel.id));
                  } catch {
                    showToast("Impossible de supprimer", "error");
                  }
                },
              });
            },
          },
          { label: "Annuler", style: "cancel", onPress: () => {} },
        ],
      });
    },
    [currentUser, userProfile],
  );

  const navigateToChannel = useCallback(
    (channel: Channel) => {
      if ((channel as any).audienceType === "direct") {
        const otherUid = (channel.members ?? []).find(
          (uid: string) => uid !== currentUser?.uid,
        );
        const participants = (channel as any).dmParticipants ?? {};
        const otherInfo = participants[otherUid ?? ""] ?? {};
        router.push(
          `/channel/${channel.id}?name=${encodeURIComponent(otherInfo.name || "Message Privé")}&isDM=1`,
        );
      } else {
        router.push(
          `/channel/${channel.id}?name=${encodeURIComponent(channel.name)}`,
        );
      }
    },
    [router, currentUser],
  );

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setChannelImage(null);
    setChannelName("");
    setChannelDescription("");
    setEditingId(null);
    setAudienceType("public");
    setSelectedRoles([]);
    setSelectedUsers([]);
    setOriginalEditMembers([]);
  }, []);

  const closeDmModal = useCallback(() => {
    setDmModalVisible(false);
    setDmSearchQuery("");
  }, []);

  const handleCreateOrOpenDM = useCallback(
    async (otherUser: any) => {
      if (!currentUser?.uid) return;
      const myUid = currentUser.uid;
      const otherUid = otherUser.id;
      const dmId = "dm_" + [myUid, otherUid].sort().join("_");

      const existing = channels.find((ch) => ch.id === dmId);
      if (existing) {
        closeDmModal();
        navigateToChannel(existing);
        return;
      }

      const myName = userProfile
        ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() || "Moi"
        : "Moi";
      const otherName =
        `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
        otherUser.email ||
        "Utilisateur";

      try {
        await setDoc(doc(db, "channels", dmId), {
          name: "dm",
          type: "private",
          audienceType: "direct",
          members: [myUid, otherUid],
          dmParticipants: {
            [myUid]: { name: myName, avatar: userProfile?.avatarPreset ?? null },
            [otherUid]: { name: otherName, avatar: otherUser.avatarPreset ?? null },
          },
          createdAt: Timestamp.now(),
          createdBy: myUid,
          lastMessage: "",
          lastMessageAt: Timestamp.now(),
        });
        closeDmModal();
        router.push(
          `/channel/${dmId}?name=${encodeURIComponent(otherName)}&isDM=1`,
        );
      } catch {
        showToast("Impossible de créer la conversation", "error");
      }
    },
    [currentUser, userProfile, channels, navigateToChannel, closeDmModal, router],
  );

  // ── Filtrage de visibilité (Sécurité) ──────────────────────────────────────

  // On récupère le rôle exact avec les majuscules (ex: "Vice-Président")
  const userRole = userProfile?.role || "Membre";
  const isAdmin = userRole === "Administrateur" || userRole === "Admin";

  // 1. On filtre d'abord selon les droits d'accès
  const visibleChannels = channels.filter((ch: any) => {
    // Créateur voit toujours son canal
    if (ch.createdBy === currentUser?.uid) return true;

    const effectiveAudience =
      ch.audienceType ?? (ch.type === "public" ? "public" : "private");

    if (effectiveAudience === "public") return true;

    if (effectiveAudience === "private" || effectiveAudience === "direct") {
      return !!(ch.members && ch.members.includes(currentUser?.uid));
    }

    if (effectiveAudience === "roles") {
      return !!(ch.allowedRoles && ch.allowedRoles.includes(userRole));
    }

    return false;
  });

  // 2. On applique ensuite la barre de recherche sur les canaux visibles
  const filteredChannels = visibleChannels.filter((ch: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (ch.audienceType === "direct") {
      const otherUid = (ch.members || []).find((uid: string) => uid !== currentUser?.uid);
      const participants = ch.dmParticipants || {};
      const otherName = (participants[otherUid || ""]?.name || "").toLowerCase();
      return otherName.includes(q);
    }
    return ch.name.toLowerCase().includes(q);
  });

  const { readsMap } = useUnread();

  const styles = getStyles(colors, tokens);

  // ── Swipe-down to dismiss modal ───────────────────────────────────────────
  const dragY = useRef(0);
  const modalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => { dragY.current = g.dy; },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80) closeModal();
        dragY.current = 0;
      },
    })
  ).current;

  // ── Rendu d'un canal ──────────────────────────────────────────────────────
  const renderChannel = useCallback(
    ({ item }: { item: any }) => {
      // For DM channels derive display info from the other participant
      const isDirect = item.audienceType === "direct";
      let displayName = item.name;
      if (isDirect) {
        const otherUid = (item.members || []).find(
          (uid: string) => uid !== currentUser?.uid,
        );
        const participants = item.dmParticipants || {};
        const otherInfo = participants[otherUid || ""] || {};
        displayName = otherInfo.name || "Message Privé";
      }

      const initials = channelInitials(displayName);
      const time = relativeTime(item.lastMessageAt);
      const lastActivity = item.lastMessageAt?.toDate?.() ?? null;
      const lastRead = readsMap[item.id]?.lastReadAt ?? null;
      const hasUnread = computeIsUnread(lastActivity, lastRead);

      let AudienceIcon = null;
      if (isDirect)
        AudienceIcon = (
          <Ionicons
            name="person"
            size={12}
            color={colors.textTertiary}
            style={{ marginLeft: 6 }}
          />
        );
      if (item.audienceType === "private")
        AudienceIcon = (
          <Ionicons
            name="lock-closed"
            size={12}
            color={colors.textTertiary}
            style={{ marginLeft: 6 }}
          />
        );
      if (item.audienceType === "roles")
        AudienceIcon = (
          <Ionicons
            name="people"
            size={12}
            color={colors.textTertiary}
            style={{ marginLeft: 6 }}
          />
        );

      // Derive a consistent color from the display name
      const palette = [
        colors.primary,
        colors.accent1,
        colors.accent2,
        colors.accent3,
        colors.accent4,
      ];
      let h = 0;
      for (const c of displayName)
        h = (h * 31 + c.charCodeAt(0)) % palette.length;
      const chColor = item.isPinned ? colors.primary : palette[Math.abs(h)];

      return (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.channelRow, { flex: 1 }]}
            onPress={() => navigateToChannel(item)}
            onLongPress={() => handleLongPress(item)}
            activeOpacity={0.82}
          >
            {/* Avatar with unread ring (Instagram Stories style) */}
            <View style={[
              styles.avatarRingWrap,
              hasUnread && { borderColor: chColor, borderWidth: 2.5 },
              !hasUnread && { borderColor: "transparent", borderWidth: 2.5 },
            ]}>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={styles.channelAvatarImg}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: chColor + "22" }]}>
                  <Text style={[styles.avatarText, { color: chColor }]}>
                    {initials}
                  </Text>
                </View>
              )}
            </View>

            {/* Content */}
            <View style={styles.channelBody}>
              <View style={styles.channelTop}>
                <View style={styles.channelNameRow}>
                  {item.isPinned && (
                    <Ionicons
                      name="pin"
                      size={11}
                      color={colors.primary}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.channelName,
                      {
                        fontWeight: hasUnread ? "700" : "500",
                        color: hasUnread
                          ? colors.textPrimary
                          : colors.textSecondary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                  {AudienceIcon}
                </View>
                <Text style={[styles.channelTime, hasUnread && { color: chColor, fontWeight: "600" }]}>{time}</Text>
              </View>

              <Text
                style={[
                  styles.lastMessage,
                  {
                    fontWeight: hasUnread ? "500" : "400",
                    color: hasUnread ? colors.textPrimary : colors.textTertiary,
                  },
                ]}
                numberOfLines={1}
              >
                {item.lastMessage || "Aucun message"}
              </Text>
            </View>

            {/* Right: unread dot badge or nothing */}
            {hasUnread ? (
              <View style={[styles.badge, { backgroundColor: chColor, minWidth: 10, height: 10, borderRadius: 5 }]} />
            ) : (
              !Platform.OS.startsWith("web") && (
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={colors.borderLight}
                />
              )
            )}
          </TouchableOpacity>

          {/* Web: ⋮ button as sibling */}
          {Platform.OS === "web" && (
            <TouchableOpacity
              onPress={() => handleLongPress(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ padding: 8 }}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [colors, tokens, navigateToChannel, handleLongPress, currentUser, readsMap],
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>

      <Header
        title="Discussions"
        titleIcon="message-text-outline"
        chip={{
          icon: "chat-outline",
          label: `${filteredChannels.length} ${filteredChannels.length > 1 ? "Canaux" : "Canal"}`,
        }}
      />

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={17}
            color={colors.textSecondary}
            style={{ marginRight: tokens.space.sm }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un canal..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {!!searchQuery && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close-circle"
                size={17}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section header */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Canaux</Text>
            <Text style={styles.sectionCount}>{filteredChannels.length}</Text>
          </View>

          {/* Channel list */}
          {filteredChannels.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Icon
                  name="chat-remove-outline"
                  size={32}
                  color={colors.textTertiary}
                />
              </View>
              <Text style={styles.emptyTitle}>Aucun canal trouvé</Text>
              <Text style={styles.emptySub}>
                Créez un canal avec le bouton +
              </Text>
            </View>
          ) : (
            <Card variant="elevated" style={styles.listCard}>
              {filteredChannels.map((item, i) => (
                <View key={item.id}>
                  {renderChannel({ item } as any)}
                  {i < filteredChannels.length - 1 && (
                    <View
                      style={[
                        styles.rowDivider,
                        { marginLeft: tokens.space.lg + 58 + tokens.space.md },
                      ]}
                    />
                  )}
                </View>
              ))}
            </Card>
          )}
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary, shadowColor: colors.primary },
        ]}
        onPress={() =>
          showActionSheet({
            title: "Nouvelle conversation",
            actions: [
              {
                label: "Nouveau canal",
                icon: "megaphone-outline",
                style: "default",
                onPress: () => setModalVisible(true),
              },
              {
                label: "Message direct",
                icon: "person-outline",
                style: "default",
                onPress: () => setDmModalVisible(true),
              },
              { label: "Annuler", style: "cancel", onPress: () => {} },
            ],
          })
        }
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* MODAL DE CRÉATION AVANCÉ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : Platform.OS === "android"
                ? "height"
                : undefined
          }
          enabled={Platform.OS !== "web"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            {/* Drag handle — swipe down to dismiss */}
            <View style={styles.modalHandleArea} {...modalPanResponder.panHandlers}>
              <View style={styles.modalHandle} />
            </View>
            <Text style={styles.modalTitle}>
              {editingId ? "Modifier le canal" : "Nouveau Canal"}
            </Text>

            {/* Sélecteur d'image */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <TouchableOpacity
                onPress={handlePickImage}
                style={styles.imagePickerBtn}
              >
                {channelImage ? (
                  <Image
                    source={{ uri: channelImage }}
                    style={styles.channelPreviewImg}
                  />
                ) : (
                  <Ionicons
                    name="camera"
                    size={30}
                    color={colors.textTertiary}
                  />
                )}
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textTertiary,
                  marginTop: 5,
                }}
              >
                Changer l'image
              </Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nom du canal *"
              placeholderTextColor={colors.textTertiary}
              value={channelName}
              onChangeText={setChannelName}
            />

            <TextInput
              style={[
                styles.input,
                { minHeight: 60, textAlignVertical: "top" },
              ]}
              placeholder="Description (optionnel)"
              placeholderTextColor={colors.textTertiary}
              value={channelDescription}
              onChangeText={setChannelDescription}
              multiline
            />

            {/* Sélecteur d'audience */}
            <Text style={styles.label}>Qui peut participer ?</Text>
            <View style={styles.audienceTabs}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  audienceType === "public" && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setAudienceType("public")}
              >
                <Text
                  style={[
                    styles.tabText,
                    audienceType === "public" && { color: "#FFF" },
                  ]}
                >
                  Tous
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  audienceType === "roles" && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setAudienceType("roles")}
              >
                <Text
                  style={[
                    styles.tabText,
                    audienceType === "roles" && { color: "#FFF" },
                  ]}
                >
                  Rôles
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  audienceType === "private" && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setAudienceType("private")}
              >
                <Text
                  style={[
                    styles.tabText,
                    audienceType === "private" && { color: "#FFF" },
                  ]}
                >
                  Membres
                </Text>
              </TouchableOpacity>
            </View>

            {/* Zone dynamique selon l'audience choisie */}
            <View style={styles.audienceContent}>
              {audienceType === "public" && (
                <Text
                  style={{
                    color: colors.textSecondary,
                    textAlign: "center",
                    marginVertical: 10,
                  }}
                >
                  Tous les membres de l'association pourront voir et participer
                  à ce canal.
                </Text>
              )}

              {audienceType === "roles" && (
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {/* On utilise la nouvelle liste de groupes */}
                  {OJYQ_ROLES_GROUPS.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      style={[
                        styles.checkRow,
                        selectedRoles.includes(group.id) && {
                          backgroundColor: colors.primaryTint,
                        },
                      ]}
                      onPress={() => toggleRole(group.id)} // La fonction toggleRole reste inchangée !
                    >
                      <Text style={{ color: colors.textPrimary }}>
                        {group.label}
                      </Text>
                      {selectedRoles.includes(group.id) && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {audienceType === "private" && (
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {users.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[
                        styles.checkRow,
                        selectedUsers.includes(u.id) && {
                          backgroundColor: colors.primaryTint,
                        },
                      ]}
                      onPress={() => toggleUser(u.id)}
                    >
                      <Text style={{ color: colors.textPrimary }}>
                        {u.firstName || u.email || "Inconnu"}
                      </Text>
                      {selectedUsers.includes(u.id) && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Boutons d'actions */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveChannel}
              >
                <Text style={styles.saveBtnText}>
                  {editingId ? "Mettre à jour" : "Créer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* MODAL MESSAGE DIRECT (DM) */}
      <Modal
        visible={dmModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeDmModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          enabled={Platform.OS !== "web"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandleArea}>
              <View style={styles.modalHandle} />
            </View>
            <Text style={styles.modalTitle}>Message Direct</Text>

            <TextInput
              style={styles.input}
              placeholder="Rechercher un membre..."
              placeholderTextColor={colors.textTertiary}
              value={dmSearchQuery}
              onChangeText={setDmSearchQuery}
              autoCapitalize="none"
            />

            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {users
                .filter((u) => {
                  if (u.id === currentUser?.uid) return false;
                  if (!dmSearchQuery.trim()) return true;
                  const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
                  return (
                    fullName.includes(dmSearchQuery.toLowerCase()) ||
                    (u.email || "").toLowerCase().includes(dmSearchQuery.toLowerCase())
                  );
                })
                .map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.checkRow}
                    onPress={() => handleCreateOrOpenDM(u)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: "500" }}>
                      {`${u.firstName || ""} ${u.lastName || ""}`.trim() ||
                        u.email ||
                        "Inconnu"}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={[styles.modalButtons, { marginTop: 12 }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeDmModal}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surfaceDim },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },

    // ── FAB ───────────────────────────────────────────────────────────────────
    fab: {
      position: "absolute",
      bottom: 28,
      right: 24,
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: "center",
      justifyContent: "center",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 10,
    },

    // ── Search ────────────────────────────────────────────────────────────────
    searchWrap: {
      paddingHorizontal: tokens.space.xl,
      paddingTop: tokens.space.lg,
      paddingBottom: tokens.space.sm,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: tokens.radius.pill,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderLight,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: tokens.font.base,
      color: colors.textPrimary,
    },

    // ── Scroll / list ─────────────────────────────────────────────────────────
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: tokens.space.xl,
      paddingTop: tokens.space.sm,
      paddingBottom: 100,
    },

    // ── Section header ────────────────────────────────────────────────────────
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
      marginBottom: tokens.space.sm,
      marginTop: tokens.space.xs,
      paddingHorizontal: 2,
    },
    sectionIconWrap: {
      width: 28,
      height: 28,
      borderRadius: tokens.radius.sm,
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      flex: 1,
      fontSize: tokens.font.base,
      fontWeight: "600",
      color: colors.textSecondary,
      letterSpacing: 0.1,
    },
    sectionCount: {
      fontSize: tokens.font.xs,
      fontWeight: "700",
      color: colors.primary,
      backgroundColor: colors.primaryTint,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: tokens.radius.pill,
    },

    // ── Channel list card ─────────────────────────────────────────────────────
    listCard: { overflow: "hidden" },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
    },

    // ── Channel row (inside Card, no individual card styling) ─────────────────
    channelRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: tokens.space.lg,
      paddingVertical: 12,
      gap: tokens.space.md,
      minHeight: 72,
    },
    // Instagram-style story ring wrapper
    avatarRingWrap: {
      width: 58,
      height: 58,
      borderRadius: 29,
      padding: 2,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontWeight: "700", fontSize: tokens.font.md },
    channelBody: { flex: 1, minWidth: 0 },
    channelTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 3,
    },
    channelNameRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: tokens.space.sm,
    },
    channelName: { fontSize: tokens.font.md },
    channelTime: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
      flexShrink: 0,
    },
    lastMessage: { fontSize: tokens.font.sm },
    badge: {
      borderRadius: 12,
      minWidth: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      flexShrink: 0,
    },
    badgeText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 11,
      letterSpacing: -0.2,
    },

    // ── Empty state ───────────────────────────────────────────────────────────
    emptyState: {
      alignItems: "center",
      paddingVertical: 48,
      gap: tokens.space.sm,
    },
    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: tokens.space.sm,
    },
    emptyTitle: {
      fontSize: tokens.font.lg,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    emptySub: {
      fontSize: tokens.font.sm,
      color: colors.textTertiary,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      paddingHorizontal: 24,
      paddingBottom: 32,
      backgroundColor: colors.surface,
      maxHeight: "90%",
    },
    modalHandleArea: {
      width: "100%",
      alignItems: "center",
      paddingVertical: 10,
      marginBottom: 8,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    modalTitle: {
      fontWeight: "800",
      textAlign: "center",
      marginBottom: 20,
      fontSize: tokens.font.xl,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    label: {
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
      fontSize: tokens.font.xs,
      color: colors.textSecondary,
    },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: tokens.radius.lg,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 12,
      fontSize: tokens.font.md,
      backgroundColor: colors.surfaceDim,
      borderColor: colors.border,
      color: colors.textPrimary,
    },

    audienceTabs: {
      flexDirection: "row",
      backgroundColor: colors.surfaceDim,
      borderRadius: tokens.radius.lg,
      padding: 3,
      marginBottom: 12,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 9,
      alignItems: "center",
      borderRadius: tokens.radius.md,
    },
    tabText: { fontWeight: "600", fontSize: tokens.font.sm, color: colors.textSecondary },
    audienceContent: { minHeight: 60, marginBottom: 15 },
    checkRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    modalButtons: { flexDirection: "row", marginTop: 16, gap: 10 },
    cancelBtn: {
      flex: 1,
      paddingVertical: 15,
      borderRadius: tokens.radius.lg,
      borderWidth: 1.5,
      alignItems: "center",
      borderColor: colors.border,
      backgroundColor: colors.surfaceDim,
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontWeight: "600",
      fontSize: tokens.font.md,
    },
    saveBtn: {
      flex: 1,
      paddingVertical: 15,
      borderRadius: tokens.radius.lg,
      alignItems: "center",
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    saveBtnText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: tokens.font.md,
    },
    channelAvatarImg: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    imagePickerBtn: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surfaceDim,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    channelPreviewImg: { width: "100%", height: "100%" },
  });
