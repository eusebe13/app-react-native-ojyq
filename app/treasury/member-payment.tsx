/**
 * Treasury: Member Payment Management
 *
 * Features:
 *  • Liste complète des membres avec leurs statuts de paiement
 *  • Ajouter des paiements par montant + date
 *  • Suivi des dettes et montants payés
 *  • Accès réservé aux Admin/Trésorier
 *  • Synchronisation Firestore en temps réel
 */

import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/ThemeContext";
import { db } from "@/firebaseConfig";

type Member = {
  uid: string;
  firstName: string;
  lastName: string;
  role: string;
};

type MemberPaymentData = {
  uid: string;
  firstName: string;
  lastName: string;
  role: string;
  paidThisYear: number;
  debt: number;
  lastPaymentDate?: string;
};

export default function MemberPaymentPage() {
  const { colors, tokens } = useAppTheme();
  const auth = getAuth();
  const user = auth.currentUser;

  const [members, setMembers] = useState<MemberPaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [selectedMember, setSelectedMember] =
    useState<MemberPaymentData | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");

  const annualAmount = 120;

  // Vérifier le rôle de l'utilisateur
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserRole(docSnap.data().role || "");
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Charger tous les membres et leurs données de paiement
  useEffect(() => {
    if (!user) return;

    const loadMembers = async () => {
      try {
        setLoading(true);

        // Récupérer tous les utilisateurs
        const usersSnapshot = await getDocs(collection(db, "users"));
        const membersList: MemberPaymentData[] = [];

        // Pour chaque utilisateur, récupérer ses données de paiement
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();

          // Charger les données de paiement
          const paymentDocRef = doc(
            db,
            "users",
            userDoc.id,
            "financial",
            "payment",
          );
          const unsubscribe = onSnapshot(paymentDocRef, (paymentDoc) => {
            const paymentData = paymentDoc.exists() ? paymentDoc.data() : {};

            const memberData: MemberPaymentData = {
              uid: userDoc.id,
              firstName: userData.firstName || "",
              lastName: userData.lastName || "",
              role: userData.role || "Membre",
              paidThisYear: paymentData.paidThisYear || 0,
              debt: paymentData.debt || 0,
              lastPaymentDate: paymentData.lastPaymentDate,
            };

            setMembers((prev) => {
              const filtered = prev.filter((m) => m.uid !== userDoc.id);
              return [...filtered, memberData].sort((a, b) =>
                `${a.firstName} ${a.lastName}`.localeCompare(
                  `${b.firstName} ${b.lastName}`,
                ),
              );
            });
          });

          return unsubscribe;
        }

        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des membres:", error);
        setLoading(false);
      }
    };

    loadMembers();
  }, [user]);

  const isAdmin = userRole === "Administrateur" || userRole === "Trésorier";

  // Filtrer les membres selon la recherche
  const filteredMembers = members.filter(
    (member) =>
      `${member.firstName} ${member.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Ajouter un paiement pour un membre
  const handleAddPayment = async () => {
    if (!selectedMember || !paymentAmount || !paymentDate) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Erreur", "Le montant doit être un nombre positif");
      return;
    }

    setSaving(true);

    try {
      const paymentDocRef = doc(
        db,
        "users",
        selectedMember.uid,
        "financial",
        "payment",
      );

      const newPaidThisYear = selectedMember.paidThisYear + amount;
      const remainingThisYear = Math.max(annualAmount - newPaidThisYear, 0);
      const newDebt = selectedMember.debt + remainingThisYear;

      await updateDoc(paymentDocRef, {
        paidThisYear: newPaidThisYear,
        debt: newDebt,
        lastPaymentDate: paymentDate,
        lastModified: new Date().toISOString(),
      });

      Alert.alert(
        "Succès",
        `Paiement de $${amount} enregistré pour ${selectedMember.firstName} ${selectedMember.lastName}`,
      );

      // Réinitialiser le formulaire
      setPaymentAmount("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setShowPaymentModal(false);
      setSelectedMember(null);
      setModalMode("add");
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du paiement:", error);
      Alert.alert("Erreur", "Impossible d'enregistrer le paiement");
    } finally {
      setSaving(false);
    }
  };

  // Modifier le solde d'un membre (remplacer la valeur au lieu d'ajouter)
  const handleEditBalance = async () => {
    if (!selectedMember || !paymentAmount) {
      Alert.alert("Erreur", "Veuillez entrer un montant");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert("Erreur", "Le montant doit être un nombre positif");
      return;
    }

    setSaving(true);

    try {
      const paymentDocRef = doc(
        db,
        "users",
        selectedMember.uid,
        "financial",
        "payment",
      );

      const remainingThisYear = Math.max(annualAmount - amount, 0);
      const newDebt =
        selectedMember.debt + (selectedMember.paidThisYear - amount); // Ajuste la dette selon la différence

      await updateDoc(paymentDocRef, {
        paidThisYear: amount,
        debt: Math.max(newDebt, 0), // La dette ne peut pas être négative
        lastModified: new Date().toISOString(),
      });

      Alert.alert(
        "Succès",
        `Solde de ${selectedMember.firstName} ${selectedMember.lastName} modifié à $${amount}`,
      );

      // Réinitialiser le formulaire
      setPaymentAmount("");
      setShowPaymentModal(false);
      setSelectedMember(null);
      setModalMode("add");
    } catch (error) {
      console.error("Erreur lors de la modification du solde:", error);
      Alert.alert("Erreur", "Impossible de modifier le solde");
    } finally {
      setSaving(false);
    }
  };

  const styles = getStyles(colors, tokens);

  if (!isAdmin) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.surfaceDim }]}
      >
        <View style={styles.centerContent}>
          <Ionicons
            name="lock-closed-outline"
            size={48}
            color={colors.accent6}
          />
          <Text style={[styles.errorTitle, { color: colors.accent6 }]}>
            Accès refusé
          </Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Seuls les administrateurs et les trésoriers peuvent accéder à cette
            page.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.surfaceDim }]}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
            Chargement des membres...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surfaceDim }]}
      edges={["left", "right", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Gestion des Paiements</Text>
            <Text style={styles.headerSubtitle}>
              {members.length} membre{members.length > 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.editBalanceButton,
              { backgroundColor: colors.accent3 },
            ]}
            onPress={() => {
              setModalMode("edit");
              setShowMemberSelector(true);
              setSearchQuery("");
            }}
          >
            <Ionicons
              name="pencil-outline"
              size={16}
              color="#FFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.editBalanceButtonText}>Modifier solde</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Chercher un membre..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-outline"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* MEMBERS LIST */}
        {filteredMembers.length > 0 ? (
          <FlatList
            scrollEnabled={false}
            data={filteredMembers}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => {
              const remainingThisYear = Math.max(
                annualAmount - item.paidThisYear,
                0,
              );
              const totalDebt = item.debt + remainingThisYear;
              const progressPercent = Math.min(
                (item.paidThisYear / annualAmount) * 100,
                100,
              );

              return (
                <View
                  style={[
                    styles.memberCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  {/* HEADER CARD */}
                  <View style={styles.memberHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={styles.memberRole}>{item.role}</Text>
                    </View>
                    <View style={styles.memberStatus}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              totalDebt === 0 ? colors.accent5 : colors.accent6,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              totalDebt === 0 ? colors.accent5 : colors.accent6,
                          },
                        ]}
                      >
                        {totalDebt === 0 ? "À jour" : "En retard"}
                      </Text>
                    </View>
                  </View>

                  {/* PAYMENT INFO */}
                  <View style={styles.memberPaymentInfo}>
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentLabel}>Payé cette année</Text>
                      <Text style={styles.paymentValue}>
                        ${item.paidThisYear} / ${annualAmount}
                      </Text>
                    </View>

                    {/* PROGRESS BAR */}
                    <View
                      style={[
                        styles.progressBar,
                        { backgroundColor: colors.surfaceDim },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: colors.accent5,
                            width: `${progressPercent}%`,
                          },
                        ]}
                      />
                    </View>

                    {/* ADDITIONAL INFO */}
                    <View style={styles.additionalInfo}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Reste</Text>
                        <Text style={styles.infoValue}>
                          ${remainingThisYear}
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>En dette</Text>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              color:
                                item.debt > 0 ? colors.accent6 : colors.accent5,
                            },
                          ]}
                        >
                          ${item.debt}
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Total dû</Text>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              color:
                                totalDebt > 0 ? colors.accent6 : colors.accent5,
                            },
                          ]}
                        >
                          ${totalDebt}
                        </Text>
                      </View>
                    </View>

                    {/* LAST PAYMENT */}
                    {item.lastPaymentDate && (
                      <Text style={styles.lastPaymentText}>
                        Dernier paiement: {item.lastPaymentDate}
                      </Text>
                    )}
                  </View>

                  {/* ACTION BUTTON */}
                  <TouchableOpacity
                    style={[
                      styles.addPaymentButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => {
                      setSelectedMember(item);
                      setShowPaymentModal(true);
                      setPaymentAmount("");
                      setPaymentDate(new Date().toISOString().split("T")[0]);
                    }}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color="#FFF"
                    />
                    <Text style={styles.addPaymentButtonText}>
                      Ajouter un paiement
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="people-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Text
              style={[styles.emptyStateText, { color: colors.textSecondary }]}
            >
              {searchQuery.length > 0
                ? "Aucun membre trouvé"
                : "Aucun membre disponible"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* PAYMENT MODAL */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === "add"
                  ? "Ajouter un paiement"
                  : "Modifier le solde"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedMember(null);
                  setPaymentAmount("");
                  setPaymentDate(new Date().toISOString().split("T")[0]);
                }}
                disabled={saving}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedMember && (
              <>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberInfoName}>
                    {selectedMember.firstName} {selectedMember.lastName}
                  </Text>
                  <Text style={styles.memberInfoRole}>
                    {selectedMember.role}
                  </Text>
                </View>

                {modalMode === "edit" && (
                  <View style={styles.editModeInfo}>
                    <Text style={styles.editModeLabel}>Solde actuel:</Text>
                    <Text style={styles.editModeValue}>
                      ${selectedMember.paidThisYear}
                    </Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {modalMode === "add"
                      ? "Montant du paiement ($)"
                      : "Nouveau solde ($)"}
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      { borderColor: colors.border, color: colors.textPrimary },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    keyboardType="decimal-pad"
                    editable={!saving}
                  />
                </View>

                {modalMode === "add" && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Date du virement</Text>
                    <TextInput
                      style={[
                        styles.formInput,
                        {
                          borderColor: colors.border,
                          color: colors.textPrimary,
                        },
                      ]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textTertiary}
                      value={paymentDate}
                      onChangeText={setPaymentDate}
                      editable={!saving}
                    />
                  </View>
                )}

                <View style={styles.formGroup}>
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={
                      modalMode === "add" ? handleAddPayment : handleEditBalance
                    }
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFF"
                        style={{ marginRight: 8 }}
                      />
                    ) : (
                      <Ionicons
                        name={modalMode === "add" ? "add" : "pencil"}
                        size={18}
                        color="#FFF"
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <Text style={styles.submitButtonText}>
                      {saving
                        ? "Enregistrement..."
                        : modalMode === "add"
                          ? "Enregistrer le paiement"
                          : "Modifier le solde"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MEMBER SELECTOR MODAL (for editing balance) */}
      <Modal
        visible={showMemberSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMemberSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.selectorModalContent,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un membre</Text>
              <TouchableOpacity onPress={() => setShowMemberSelector(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* SEARCH IN SELECTOR */}
            <View
              style={[styles.searchBar, { backgroundColor: colors.surfaceDim }]}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={colors.textSecondary}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Chercher un membre..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons
                    name="close-outline"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* MEMBER LIST FOR SELECTION */}
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.memberSelectorItem,
                    { borderBottomColor: colors.borderLight },
                  ]}
                  onPress={() => {
                    setSelectedMember(item);
                    setShowMemberSelector(false);
                    setPaymentAmount(item.paidThisYear.toString());
                    setShowPaymentModal(true);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectorItemName}>
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text
                      style={[
                        styles.selectorItemRole,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.role} • Solde: ${item.paidThisYear}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons
                    name="people-outline"
                    size={48}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.emptyStateText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {searchQuery.length > 0
                      ? "Aucun membre trouvé"
                      : "Aucun membre disponible"}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
      padding: tokens.space.lg,
      paddingBottom: tokens.space.xxxl,
    },
    centerContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: tokens.space.lg,
    },

    // HEADER
    header: {
      marginBottom: tokens.space.xl,
      paddingBottom: tokens.space.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: tokens.font.lg,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.xs,
      letterSpacing: 0.3,
    },
    headerSubtitle: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      fontWeight: "500",
    },

    // SEARCH BAR
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: tokens.radius.lg,
      paddingHorizontal: tokens.space.md,
      marginBottom: tokens.space.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      height: 44,
      gap: tokens.space.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: tokens.font.base,
    },

    // MEMBER CARD
    memberCard: {
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      marginBottom: tokens.space.md,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    memberHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: tokens.space.md,
      paddingBottom: tokens.space.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    memberName: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.xs,
    },
    memberRole: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    memberStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    statusText: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
    },

    // PAYMENT INFO
    memberPaymentInfo: {
      marginBottom: tokens.space.md,
    },
    paymentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: tokens.space.md,
    },
    paymentLabel: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    paymentValue: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    progressBar: {
      height: 8,
      borderRadius: tokens.radius.sm,
      overflow: "hidden",
      marginBottom: tokens.space.md,
    },
    progressFill: {
      height: "100%",
      borderRadius: tokens.radius.sm,
    },
    additionalInfo: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: tokens.space.md,
      paddingVertical: tokens.space.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoItem: {
      alignItems: "center",
    },
    infoLabel: {
      fontSize: tokens.font.xs,
      color: colors.textSecondary,
      fontWeight: "600",
      marginBottom: tokens.space.xs,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    lastPaymentText: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
      fontWeight: "500",
      marginTop: tokens.space.sm,
    },

    // BUTTON
    addPaymentButton: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: tokens.space.md,
      borderRadius: tokens.radius.md,
      gap: tokens.space.sm,
      marginTop: tokens.space.md,
    },
    addPaymentButtonText: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: "#FFF",
      letterSpacing: 0.2,
    },

    // EMPTY STATE
    emptyState: {
      paddingVertical: tokens.space.xxxl,
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: tokens.font.base,
      marginTop: tokens.space.lg,
      fontWeight: "500",
    },

    // ERROR STATE
    errorTitle: {
      fontSize: tokens.font.lg,
      fontWeight: "700",
      marginTop: tokens.space.lg,
      marginBottom: tokens.space.sm,
    },
    errorText: {
      fontSize: tokens.font.base,
      lineHeight: 22,
      textAlign: "center",
    },

    // MODAL
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      borderTopLeftRadius: tokens.radius.xl,
      borderTopRightRadius: tokens.radius.xl,
      padding: tokens.space.lg,
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: tokens.space.lg,
      paddingBottom: tokens.space.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    memberInfo: {
      backgroundColor: colors.surfaceDim,
      borderRadius: tokens.radius.md,
      padding: tokens.space.lg,
      marginBottom: tokens.space.lg,
    },
    memberInfoName: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.xs,
    },
    memberInfoRole: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      fontWeight: "500",
    },

    // FORM
    formGroup: {
      marginBottom: tokens.space.lg,
    },
    formLabel: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.sm,
      letterSpacing: 0.2,
    },
    formInput: {
      borderWidth: 1.5,
      borderRadius: tokens.radius.md,
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.md,
      fontSize: tokens.font.base,
      backgroundColor: colors.surface,
    },
    dateHint: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
      marginTop: tokens.space.xs,
      fontWeight: "500",
    },

    // SUMMARY
    summaryBox: {
      backgroundColor: colors.surfaceDim,
      borderRadius: tokens.radius.md,
      padding: tokens.space.lg,
      marginBottom: tokens.space.lg,
    },
    summaryTitle: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.md,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: tokens.space.sm,
    },
    summaryLabel: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    summaryValue: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: colors.textPrimary,
    },

    // BUTTONS
    buttonGroup: {
      flexDirection: "row",
      gap: tokens.space.md,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: tokens.space.md,
      borderRadius: tokens.radius.md,
      borderWidth: 1.5,
      alignItems: "center",
    },
    cancelButtonText: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    submitButton: {
      flex: 1,
      paddingVertical: tokens.space.md,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: tokens.space.sm,
    },
    submitButtonText: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: "#FFF",
      letterSpacing: 0.2,
    },

    // EDIT BALANCE BUTTON
    editBalanceButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.sm,
      borderRadius: tokens.radius.md,
      height: 40,
    },
    editBalanceButtonText: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: "#FFF",
      letterSpacing: 0.2,
    },

    // EDIT MODE INFO
    editModeInfo: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      borderRadius: tokens.radius.md,
      padding: tokens.space.lg,
      marginBottom: tokens.space.lg,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    editModeLabel: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      marginBottom: tokens.space.xs,
    },
    editModeValue: {
      fontSize: tokens.font.xl,
      fontWeight: "700",
      color: colors.primary,
    },

    // MEMBER SELECTOR
    selectorModalContent: {
      flex: 1,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      marginTop: tokens.space.xl,
    },
    memberSelectorItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: tokens.space.lg,
      paddingVertical: tokens.space.md,
      borderBottomWidth: 1,
    },
    selectorItemName: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.xs,
    },
    selectorItemRole: {
      fontSize: tokens.font.sm,
      fontWeight: "500",
    },
  });
