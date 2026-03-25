/**
 * ChatListScreen - Liste des canaux de discussion
 */

import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
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
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import React, { ReactElement, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
      allowsEditing: true, // Permet de recadrer l'image en carré
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0].base64) {
      setChannelImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  // ── Sauvegarde canal ──────────────────────────────────────────────────────
  const handleSaveChannel = useCallback(async () => {
    const trimmed = channelName.trim();
    if (!trimmed) {
      Alert.alert("Erreur", "Le nom du canal est obligatoire");
      return;
    }

    if (audienceType === "roles" && selectedRoles.length === 0) {
      Alert.alert("Erreur", "Veuillez sélectionner au moins un rôle.");
      return;
    }
    if (audienceType === "private" && selectedUsers.length === 0) {
      Alert.alert("Erreur", "Veuillez sélectionner au moins un membre.");
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
      Alert.alert("Erreur", "Impossible de sauvegarder le canal");
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
  ]);

  // ── Long Press (Modifier/Supprimer) ───────────────────────────────────────
  const handleLongPress = useCallback(
    (channel: any) => {
      const isCreator = channel.createdBy === currentUser?.uid;
      const userRole = userProfile?.role;
      const isAdmin = userRole === "Administrateur" || userRole === "Admin";

      if (!isCreator && !isAdmin) {
        Alert.alert(
          "Accès refusé",
          "Vous ne pouvez modifier que les canaux que vous avez créés.",
        );
        return;
      }

      Alert.alert(
        "Gérer le canal",
        `Que voulez-vous faire avec "${channel.name}" ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Modifier",
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
                setSelectedUsers(channel.members || []);
              }

              setModalVisible(true);
            },
          },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Confirmer",
                "Voulez-vous vraiment supprimer ce canal ?",
                [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await deleteDoc(doc(db, "channels", channel.id));
                      } catch {
                        Alert.alert("Erreur", "Impossible de supprimer");
                      }
                    },
                  },
                ],
              );
            },
          },
        ],
      );
    },
    [currentUser, userProfile],
  );

  const navigateToChannel = useCallback(
    (channel: Channel) => {
      router.push(
        `/channel/${channel.id}?name=${encodeURIComponent(channel.name)}`,
      );
    },
    [router],
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
  }, []);

  // ── Filtrage de visibilité (Sécurité) ──────────────────────────────────────

  // On récupère le rôle exact avec les majuscules (ex: "Vice-Président")
  const userRole = userProfile?.role || "Membre";
  const isAdmin = userRole === "Administrateur" || userRole === "Admin";

  // 1. On filtre d'abord selon les droits d'accès
  const visibleChannels = channels.filter((ch: any) => {
    // Règle 1 : Les administrateurs voient TOUS les groupes, sans exception.
    if (isAdmin) return true;

    // Règle 2 : Le créateur du groupe voit TOUJOURS son groupe !
    if (ch.createdBy === currentUser?.uid) return true;

    // Règle 3 : Tout le monde voit les canaux publics
    if (
      !ch.audienceType ||
      ch.audienceType === "public" ||
      ch.type === "public"
    )
      return true;

    // Règle 4 : Canaux par Membres (privé)
    if (ch.audienceType === "private") {
      return ch.members && ch.members.includes(currentUser?.uid);
    }

    // Règle 5 : Canaux par Rôles
    if (ch.audienceType === "roles") {
      // Vérifie si "Vice-Président" se trouve dans la liste des rôles autorisés pour ce canal
      return ch.allowedRoles && ch.allowedRoles.includes(userRole);
    }

    return false; // Si aucune condition n'est remplie, on cache le canal
  });

  // 2. On applique ensuite la barre de recherche sur les canaux visibles
  const filteredChannels = visibleChannels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const styles = getStyles(colors, tokens);

  // ── Rendu d'un canal ──────────────────────────────────────────────────────
  const renderChannel = useCallback(
    ({ item }: { item: any }) => {
      const initials = channelInitials(item.name);
      const time = relativeTime(item.lastMessageAt);
      const hasUnread = (item.unreadCount ?? 0) > 0;

      let AudienceIcon = null;
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

      // Derive a consistent color from the channel name
      const palette = [colors.primary, colors.accent1, colors.accent2, colors.accent3, colors.accent4];
      let h = 0;
      for (const c of item.name) h = (h * 31 + c.charCodeAt(0)) % palette.length;
      const chColor = item.isPinned ? colors.primary : palette[Math.abs(h)];

      return (
        <TouchableOpacity
          style={styles.channelRow}
          onPress={() => navigateToChannel(item)}
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.8}
        >
          {/* Avatar */}
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.channelAvatarImg} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: chColor + "1a" }]}>
              <Text style={[styles.avatarText, { color: chColor }]}>{initials}</Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.channelBody}>
            <View style={styles.channelTop}>
              <View style={styles.channelNameRow}>
                {item.isPinned && (
                  <Ionicons name="pin" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                )}
                <Text
                  style={[styles.channelName, { fontWeight: hasUnread ? "700" : "600", color: hasUnread ? colors.textPrimary : colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {AudienceIcon}
              </View>
              <Text style={styles.channelTime}>{time}</Text>
            </View>

            <Text
              style={[styles.lastMessage, {
                fontWeight: hasUnread ? "600" : "400",
                color: hasUnread ? colors.textPrimary : colors.textSecondary,
              }]}
              numberOfLines={1}
            >
              {item.lastMessage || "Aucun message"}
            </Text>
          </View>

          {/* Right: unread badge or chevron */}
          {hasUnread ? (
            <View style={[styles.badge, { backgroundColor: chColor }]}>
              <Text style={styles.badgeText}>{item.unreadCount! > 99 ? "99+" : item.unreadCount}</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={colors.borderLight} />
          )}
        </TouchableOpacity>
      );
    },
    [colors, tokens, navigateToChannel, handleLongPress],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header
        title="Discussions"
        titleIcon="message-text-outline"
        chip={{
          icon: "chat-outline",
          label: `${channels.length} ${channels.length > 1 ? "Canaux" : "Canal"}`,
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
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
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
            <View style={styles.sectionIconWrap}>
              <Icon name="chat-outline" size={15} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Canaux disponibles</Text>
            <Text style={styles.sectionCount}>{filteredChannels.length}</Text>
          </View>

          {/* Channel list */}
          {filteredChannels.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Icon name="chat-remove-outline" size={32} color={colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>Aucun canal trouvé</Text>
              <Text style={styles.emptySub}>Créez un canal avec le bouton +</Text>
            </View>
          ) : (
            <Card variant="elevated" style={styles.listCard}>
              {filteredChannels.map((item, i) => (
                <View key={item.id}>
                  {renderChannel({ item } as any)}
                  {i < filteredChannels.length - 1 && (
                    <View style={[styles.rowDivider, { marginLeft: tokens.space.md + 50 + tokens.space.md }]} />
                  )}
                </View>
              ))}
            </Card>
          )}
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
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
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {editingId ? "Modifier" : "Nouveau Canal"}
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
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surfaceDim },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },

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
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: tokens.radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: tokens.font.md,
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
      marginBottom: tokens.space.md,
      marginTop: tokens.space.sm,
    },
    sectionIconWrap: {
      width: 30,
      height: 30,
      borderRadius: tokens.radius.sm,
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      flex: 1,
      fontSize: tokens.font.lg,
      fontWeight: "700",
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    sectionCount: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
      color: colors.textTertiary,
      backgroundColor: colors.surfaceDim,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },

    // ── Channel list card ─────────────────────────────────────────────────────
    listCard: { overflow: "hidden" },
    rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight },

    // ── Channel row (inside Card, no individual card styling) ─────────────────
    channelRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.md,
      gap: tokens.space.md,
      minHeight: 66,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    avatarText: { fontWeight: "800", fontSize: tokens.font.base },
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
    channelTime: { fontSize: tokens.font.xs, color: colors.textTertiary, flexShrink: 0 },
    lastMessage: { fontSize: tokens.font.sm },
    badge: {
      borderRadius: 10,
      minWidth: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      flexShrink: 0,
    },
    badgeText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: tokens.font.xs,
    },

    // ── Empty state ───────────────────────────────────────────────────────────
    emptyState: {
      alignItems: "center",
      paddingVertical: tokens.space.xxxl,
      gap: tokens.space.sm,
    },
    emptyIconWrap: {
      width: 64,
      height: 64,
      borderRadius: tokens.radius.xl,
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
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      backgroundColor: colors.surface,
      maxHeight: "90%",
    },
    modalTitle: {
      fontWeight: "800",
      textAlign: "center",
      marginBottom: 20,
      fontSize: tokens.font.lg,
      color: colors.textPrimary,
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
      borderWidth: 1,
      borderRadius: tokens.radius.md,
      padding: 14,
      marginBottom: 15,
      fontSize: tokens.font.md,
      backgroundColor: colors.surfaceDim,
      borderColor: colors.border,
      color: colors.textPrimary,
    },

    audienceTabs: {
      flexDirection: "row",
      backgroundColor: colors.surfaceDim,
      borderRadius: 8,
      padding: 4,
      marginBottom: 10,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 6,
    },
    tabText: { fontWeight: "600", color: colors.textSecondary },
    audienceContent: { minHeight: 60, marginBottom: 15 },
    checkRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    modalButtons: { flexDirection: "row", marginTop: 10 },
    cancelBtn: {
      flex: 1,
      padding: 14,
      borderRadius: tokens.radius.md,
      borderWidth: 1.5,
      alignItems: "center",
      marginRight: tokens.space.md,
      borderColor: colors.accent6,
    },
    cancelBtnText: {
      color: colors.accent6,
      fontWeight: "600",
      fontSize: tokens.font.md,
    },
    saveBtn: {
      flex: 1,
      padding: 14,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      backgroundColor: colors.primary,
    },
    saveBtnText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: tokens.font.md,
    },
    channelAvatarImg: {
      width: 48,
      height: 48,
      borderRadius: 14,
      marginRight: 14,
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
