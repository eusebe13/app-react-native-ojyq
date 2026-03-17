/**
 * Payment & Contributions — Gestion des Cotisations Mensuelles/Annuelles
 *
 * Features:
 *  • Paiement mensuel: 10$/mois avec rappels
 *  • Paiement annuel: 120$/an
 *  • Suivi de la dette et de l'année courante
 *  • Admin/Trésorier: modifier les montants payés
 *  • Lien vers historique des paiements (Google Sheets)
 *  • Email pour virements: org.jeunesseyiraqc@gmail.com
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Clipboard,
  Linking,
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

type PaymentRecord = {
  paidThisYear: number;
  debt: number;
  lastPaymentDate?: string;
  paymentMethod?: "monthly" | "annual" | "manual";
};

export default function PaymentPage() {
  const { colors, tokens } = useAppTheme();
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;

  const [paymentData, setPaymentData] = useState<PaymentRecord>({
    paidThisYear: 0,
    debt: 0,
  });
  const [userRole, setUserRole] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editPaidThisYear, setEditPaidThisYear] = useState("");
  const [editDebt, setEditDebt] = useState("");
  const [loading, setLoading] = useState(true);

  // Charger les données de l'utilisateur et des paiements
  useEffect(() => {
    if (!user) return;

    // Charger le rôle utilisateur
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserRole(docSnap.data().role || "");
      }
    });

    // Charger les données de paiement
    const paymentDocRef = doc(db, "users", user.uid, "financial", "payment");
    const unsubscribePayment = onSnapshot(
      paymentDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setPaymentData(docSnap.data() as PaymentRecord);
          setEditPaidThisYear(String(docSnap.data().paidThisYear || 0));
          setEditDebt(String(docSnap.data().debt || 0));
        }
        setLoading(false);
      },
      (error) => {
        console.error("Erreur lors du chargement des paiements:", error);
        setLoading(false);
      },
    );

    return () => {
      unsubscribeUser();
      unsubscribePayment();
    };
  }, [user]);

  const isAdmin = userRole === "Administrateur" || userRole === "Trésorier";
  const annualAmount = 120;
  const monthlyAmount = 10;
  const transferEmail = "org.jeunesseyiraqc@gmail.com";
  const transferReference = "OJYQ";

  // Copier l'email dans le presse-papiers
  const handleCopyEmail = () => {
    Clipboard.setString(transferEmail);
    Alert.alert(
      "Email copié",
      `${transferEmail} a été copié dans le presse-papiers`,
    );
  };

  // Ouvrir une application bancaire (app bancaire par défaut du système)
  const handleOpenBankingApp = () => {
    Alert.alert(
      "Effectuer un virement",
      `Veuillez envoyer ${monthlyAmount}$ (ou ${annualAmount}$ pour l'année) à:\n\n${transferEmail}\n\nRéférence de virement: ${transferReference}`,
      [
        {
          text: "Copier l'email",
          onPress: handleCopyEmail,
        },
        {
          text: "Ouvrir app bancaire",
          onPress: () => {
            // Proposer les banques les plus populaires
            Alert.alert(
              "Choisir votre banque",
              "Sélectionnez votre institution bancaire pour effectuer le virement:",
              [
                {
                  text: "Desjardins",
                  onPress: () => {
                    Linking.openURL("https://www.desjardins.com/").catch(() => {
                      Alert.alert(
                        "Information",
                        "Veuillez utiliser votre application bancaire Desjardins",
                      );
                    });
                  },
                },
                {
                  text: "RBC",
                  onPress: () => {
                    Linking.openURL("https://www.rbcbanqueroyale.com/").catch(
                      () => {
                        Alert.alert(
                          "Information",
                          "Veuillez utiliser votre application bancaire RBC",
                        );
                      },
                    );
                  },
                },
                {
                  text: "Annuler",
                  style: "cancel",
                },
              ],
            );
          },
        },
        { text: "Annuler", style: "cancel" },
      ],
    );
  };

  // Ouvrir Google Sheets historique
  const handleOpenHistory = () => {
    Linking.openURL(
      "https://docs.google.com/spreadsheets/d/1X9Pw1BEyzfl63VIlqq3l9xmiOIJpk9V33iCHA1ZjwLI/edit?gid=0#gid=0",
    ).catch((err) => console.error("Erreur ouverture Google Sheets:", err));
  };

  // Sauvegarder les modifications (Admin/Trésorier uniquement)
  const handleSaveChanges = async () => {
    if (!user) return;

    const paidThisYear = parseFloat(editPaidThisYear) || 0;
    const debt = parseFloat(editDebt) || 0;

    try {
      const paymentDocRef = doc(db, "users", user.uid, "financial", "payment");
      await updateDoc(paymentDocRef, {
        paidThisYear,
        debt,
        lastModified: new Date().toISOString(),
      });

      setIsEditing(false);
      Alert.alert("Succès", "Montants mis à jour avec succès");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      Alert.alert("Erreur", "Impossible de sauvegarder les modifications");
    }
  };

  // Calculer les soldes
  const remainingThisYear = annualAmount - paymentData.paidThisYear;
  const totalDebt = paymentData.debt + Math.max(remainingThisYear, 0);

  const styles = getStyles(colors, tokens);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.surfaceDim }]}
      >
        <View style={styles.centerContent}>
          <Text style={{ color: colors.textSecondary }}>Chargement...</Text>
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
        {/* TITRE */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Gestion des Cotisations</Text>
          <Text style={styles.headerSubtitle}>
            Organisation de la Jeunesse Yira du Québec
          </Text>
        </View>

        {/* INFORMATIONS */}
        <View style={styles.section}>
          <View
            style={[styles.infoBox, { backgroundColor: colors.accent5 + "15" }]}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.accent5}
            />
            <Text
              style={[
                styles.infoText,
                { color: colors.accent5, marginLeft: 10 },
              ]}
            >
              Chaque 1er janvier, votre solde de l'année précédente (si impayé)
              est ajouté à votre dette.
            </Text>
          </View>

          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: colors.primary + "15",
                marginTop: tokens.space.md,
              },
            ]}
          >
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.primary }]}>
                Destinataire du virement:
              </Text>
              <TouchableOpacity onPress={handleCopyEmail}>
                <Text
                  style={[
                    styles.infoText,
                    { color: colors.primary, textDecorationLine: "underline" },
                  ]}
                >
                  {transferEmail}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: colors.accent5 + "15",
                marginTop: tokens.space.md,
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={colors.accent5}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.accent5 }]}>
                Référence de virement:
              </Text>
              <Text style={[styles.infoText, { color: colors.accent5 }]}>
                {transferReference}
              </Text>
            </View>
          </View>
        </View>

        {/* OPTIONS DE PAIEMENT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Options de Paiement</Text>

          {/* PAIEMENT MENSUEL */}
          <View style={[styles.paymentCard, { borderColor: colors.primary }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Paiement Mensuel</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>FLEXIBLE</Text>
              </View>
            </View>
            <Text style={styles.cardAmount}>${monthlyAmount}/mois</Text>
            <Text style={styles.cardDescription}>
              Rappel chaque dernier vendredi du mois
            </Text>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleOpenBankingApp}
            >
              <Ionicons name="swap-horizontal" size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>Envoyer le virement</Text>
            </TouchableOpacity>
          </View>

          {/* PAIEMENT ANNUEL */}
          <View style={[styles.paymentCard, { borderColor: colors.accent5 }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Paiement Annuel</Text>
              <View style={[styles.badge, { backgroundColor: colors.accent5 }]}>
                <Text style={[styles.badgeText, { color: "#FFF" }]}>
                  ÉCONOMIES
                </Text>
              </View>
            </View>
            <Text style={[styles.cardAmount, { color: colors.accent5 }]}>
              ${annualAmount}/an
            </Text>
            <Text style={styles.cardDescription}>
              Valide du 1er janvier au 31 décembre
            </Text>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.accent5 },
              ]}
              onPress={handleOpenBankingApp}
            >
              <Ionicons name="swap-horizontal" size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>Envoyer le virement</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* STATUT DE PAIEMENT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Votre Statut</Text>

          {/* ANNÉE COURANTE */}
          <View
            style={[styles.statusCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.statusLabel}>Montant dû cette année</Text>
                <Text style={styles.statusValue}>${annualAmount}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.statusLabel}>Montant payé</Text>
                <Text style={[styles.statusValue, { color: colors.accent5 }]}>
                  ${paymentData.paidThisYear}
                </Text>
              </View>
            </View>

            {/* BARRE DE PROGRESSION */}
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
                    width: `${Math.min(
                      (paymentData.paidThisYear / annualAmount) * 100,
                      100,
                    )}%`,
                  },
                ]}
              />
            </View>

            <Text style={styles.progressText}>
              Reste à payer: ${Math.max(remainingThisYear, 0)}
            </Text>
          </View>

          {/* DETTE */}
          {paymentData.debt > 0 && (
            <View
              style={[
                styles.statusCard,
                {
                  backgroundColor: colors.accent6 + "15",
                  borderColor: colors.accent6,
                  borderWidth: 1,
                },
              ]}
            >
              <View style={styles.statusRow}>
                <View>
                  <Text style={[styles.statusLabel, { color: colors.accent6 }]}>
                    Montant en dette
                  </Text>
                  <Text style={[styles.statusValue, { color: colors.accent6 }]}>
                    ${paymentData.debt}
                  </Text>
                </View>
                <Ionicons
                  name="alert-circle-outline"
                  size={24}
                  color={colors.accent6}
                />
              </View>
            </View>
          )}

          {/* TOTAL DÛ */}
          <View
            style={[
              styles.totalCard,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Text style={styles.totalLabel}>Total à payer</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>
              ${totalDebt}
            </Text>
          </View>
        </View>

        {/* ACCÈS ADMIN/TRÉSORIER */}
        {isAdmin && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.adminAccessButton,
                {
                  backgroundColor: colors.primary + "15",
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => router.push("/treasury/member-payment")}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.primary}
              />
              <View style={{ flex: 1, marginLeft: tokens.space.md }}>
                <Text
                  style={[styles.adminAccessTitle, { color: colors.primary }]}
                >
                  Gestion des Paiements
                </Text>
                <Text
                  style={[
                    styles.adminAccessSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Voir et modifier les paiements des membres
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        )}


        {/* HISTORIQUE PAIEMENTS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Historique des Paiements</Text>

          <TouchableOpacity
            style={[styles.linkCard, { borderColor: colors.primary }]}
            onPress={handleOpenHistory}
          >
            <View style={styles.linkContent}>
              <Ionicons name="open-outline" size={20} color={colors.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.linkTitle}>Voir l'historique complet</Text>
                <Text style={styles.linkSubtitle}>
                  Accédez au Google Sheets
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    },

    // HEADER
    header: {
      marginBottom: tokens.space.xxl,
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

    // SECTIONS
    section: {
      marginBottom: tokens.space.xxl,
    },
    sectionTitle: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: tokens.space.lg,
    },

    // PAYMENT CARDS
    paymentCard: {
      borderWidth: 1.5,
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      marginBottom: tokens.space.lg,
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: tokens.space.md,
    },
    cardTitle: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    badge: {
      backgroundColor: colors.primary + "20",
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.xs,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: colors.primary + "40",
    },
    badgeText: {
      fontSize: tokens.font.xs,
      fontWeight: "700",
      color: colors.primary,
      letterSpacing: 1,
    },
    cardAmount: {
      fontSize: tokens.font.xl,
      fontWeight: "700",
      color: colors.primary,
      marginBottom: tokens.space.sm,
    },
    cardDescription: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      marginBottom: tokens.space.lg,
      lineHeight: 18,
    },

    // BUTTONS
    primaryButton: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: tokens.space.md,
      paddingHorizontal: tokens.space.lg,
      borderRadius: tokens.radius.md,
      gap: tokens.space.sm,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    primaryButtonText: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.3,
    },

    secondaryButton: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: tokens.space.md,
      paddingHorizontal: tokens.space.lg,
      borderRadius: tokens.radius.md,
      borderWidth: 1.5,
      gap: tokens.space.sm,
    },
    secondaryButtonText: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      letterSpacing: 0.3,
    },

    // STATUS CARDS
    statusCard: {
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      marginBottom: tokens.space.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    statusRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: tokens.space.lg,
    },
    statusLabel: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      marginBottom: tokens.space.xs,
      fontWeight: "500",
    },
    statusValue: {
      fontSize: tokens.font.lg,
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
    progressText: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      fontWeight: "500",
    },

    totalCard: {
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      alignItems: "center",
      marginBottom: tokens.space.lg,
    },
    totalLabel: {
      fontSize: tokens.font.sm,
      color: colors.primary,
      fontWeight: "600",
      letterSpacing: 0.2,
      marginBottom: tokens.space.sm,
    },
    totalAmount: {
      fontSize: tokens.font.xxxl,
      fontWeight: "700",
      letterSpacing: 0.5,
    },

    // EDIT FORM
    editForm: {
      marginBottom: tokens.space.lg,
    },
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
      borderColor: colors.border,
      borderRadius: tokens.radius.md,
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.md,
      fontSize: tokens.font.base,
      backgroundColor: colors.surface,
    },
    buttonGroup: {
      flexDirection: "row",
      gap: tokens.space.md,
    },

    // LINK CARD
    linkCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1.5,
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    linkContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    linkTitle: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.xs,
      letterSpacing: 0.2,
    },
    linkSubtitle: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      fontWeight: "500",
    },

    // INFO BOXES
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      borderRadius: tokens.radius.md,
      padding: tokens.space.lg,
      marginBottom: tokens.space.md,
    },
    infoLabel: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      marginBottom: tokens.space.xs,
      letterSpacing: 0.2,
    },
    infoText: {
      fontSize: tokens.font.sm,
      lineHeight: 20,
      fontWeight: "500",
    },

    // ADMIN ACCESS
    adminAccessButton: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      borderWidth: 1.5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    adminAccessTitle: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      marginBottom: tokens.space.xs,
      letterSpacing: 0.2,
    },
    adminAccessSubtitle: {
      fontSize: tokens.font.sm,
      fontWeight: "500",
    },
  });
