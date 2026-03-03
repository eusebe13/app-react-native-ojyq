/**
 * Payment Settings — Stripe Integration Stubs
 *
 * Design:
 *  • Modern payment methods cards with visual hierarchy
 *  • Billing history with clear status indicators
 *  • Subscription management cards
 *  • Quick action buttons on payment cards
 *  • Empty states with helpful guidance
 *  • Enhanced visual feedback and spacing
 */

import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/ThemeContext";

type PaymentMethod = {
  id: string;
  type: "card" | "apple_pay" | "google_pay";
  last4?: string;
  brand?: string;
  expiry?: string;
  isDefault: boolean;
};

export default function PaymentSettings() {
  const { colors, tokens } = useAppTheme();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: "1",
      type: "card",
      last4: "4242",
      brand: "Visa",
      expiry: "12/25",
      isDefault: true,
    },
    {
      id: "2",
      type: "card",
      last4: "5555",
      brand: "Mastercard",
      expiry: "08/24",
      isDefault: false,
    },
  ]);

  const billingHistory = [
    { id: "1", date: "15 Feb 2026", amount: "€9.99", status: "Paid" },
    { id: "2", date: "15 Jan 2026", amount: "€9.99", status: "Paid" },
    { id: "3", date: "15 Dec 2025", amount: "€9.99", status: "Paid" },
  ];

  const handleAddPaymentMethod = () => {
    Alert.alert(
      "Ajouter un moyen de paiement",
      "Cette fonctionnalité sera bientôt disponible avec l'intégration Stripe.",
    );
  };

  const handleSetDefault = (methodId: string) => {
    setPaymentMethods((prev) =>
      prev.map((method) => ({
        ...method,
        isDefault: method.id === methodId,
      })),
    );
    Alert.alert("Succès", "Moyen de paiement par défaut mis à jour");
  };

  const handleRemovePaymentMethod = (methodId: string) => {
    Alert.alert(
      "Supprimer le moyen de paiement",
      "Êtes-vous sûr de vouloir supprimer ce moyen de paiement?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            setPaymentMethods((prev) => prev.filter((m) => m.id !== methodId));
            Alert.alert("Succès", "Moyen de paiement supprimé");
          },
        },
      ],
    );
  };

  const styles = getStyles(colors, tokens);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surfaceDim }]}
      edges={["left", "right", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section: Payment Methods */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Moyens de Paiement</Text>
            <TouchableOpacity onPress={handleAddPaymentMethod}>
              <Text style={styles.addButton}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {paymentMethods.length > 0 ? (
            paymentMethods.map((method) => (
              <View
                key={method.id}
                style={[styles.paymentCard, { borderColor: colors.border }]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardIcon}>
                    <Text style={styles.cardIconText}>
                      {/* {getCardIcon(method.brand)} */}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardBrand}>{method.brand}</Text>
                    <Text style={styles.cardLast4}>•••• {method.last4}</Text>
                    <Text style={styles.cardExpiry}>
                      Expire: {method.expiry}
                    </Text>
                  </View>
                  {method.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Par défaut</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardActions}>
                  {!method.isDefault && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetDefault(method.id)}
                    >
                      <Text style={styles.actionButtonText}>
                        Définir par défaut
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleRemovePaymentMethod(method.id)}
                  >
                    <Text style={styles.deleteButtonText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucun moyen de paiement</Text>
            </View>
          )}
        </View>

        {/* Section: Billing History */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historique de Facturation</Text>

          {billingHistory.map((bill, index) => (
            <View
              key={bill.id}
              style={[
                styles.billRow,
                index !== billingHistory.length - 1 && {
                  borderBottomColor: colors.border,
                  borderBottomWidth: 1,
                },
              ]}
            >
              <View style={styles.billInfo}>
                <Text style={styles.billDate}>{bill.date}</Text>
                <Text style={styles.billAmount}>{bill.amount}</Text>
              </View>
              <View style={styles.billStatus}>
                <View
                  style={[styles.statusBadge, { backgroundColor: "#D1FAE5" }]}
                >
                  <Text style={styles.statusText}>{bill.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View> */}

        {/* Section: Subscription */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Abonnement</Text>

          <View
            style={[styles.subscriptionCard, { borderColor: colors.border }]}
          >
            <View style={styles.subscriptionContent}>
              <Text style={styles.planName}>Plan Premium</Text>
              <Text style={styles.planPrice}>€9.99 / mois</Text>
              <Text style={styles.renewalDate}>
                Renouvellement le 15 mars 2026
              </Text>
            </View>
            <TouchableOpacity style={styles.manageButton}>
              <Text style={styles.manageButtonText}>Gérer l'abonnement</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Box */}
        <View style={[styles.section, { backgroundColor: colors.surfaceDim }]}>
          <Text style={styles.infoTitle}>Intégration Stripe</Text>
          <Text style={styles.infoText}>
            Les fonctionnalités de paiement complètes (ajout de cartes, gestion
            des abonnements) seront bientôt disponibles avec l'intégration
            Stripe.
          </Text>
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
    section: {
      marginBottom: tokens.space.xxl,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: tokens.space.md,
    },
    sectionTitle: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    addButton: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: colors.primary,
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.xs,
      letterSpacing: 0.2,
    },
    paymentCard: {
      borderWidth: 1.5,
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      marginBottom: tokens.space.md,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    cardContent: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: tokens.space.md,
    },
    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: tokens.radius.md,
      backgroundColor: colors.surfaceDim,
      justifyContent: "center",
      alignItems: "center",
      marginRight: tokens.space.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardIconText: {
      fontSize: tokens.font.xl,
    },
    cardInfo: { flex: 1 },
    cardBrand: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.xs,
      letterSpacing: 0.2,
    },
    cardLast4: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      marginBottom: 2,
      fontWeight: "500",
    },
    cardExpiry: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
    },
    defaultBadge: {
      backgroundColor: (colors.primary || "#3B82F6") + "15",
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.xs,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: (colors.primary || "#3B82F6") + "30",
    },
    defaultBadgeText: {
      fontSize: tokens.font.xs,
      fontWeight: "600",
      color: colors.primary,
      letterSpacing: 0.2,
    },
    cardActions: {
      flexDirection: "row",
      gap: tokens.space.sm,
    },
    actionButton: {
      flex: 1,
      paddingVertical: tokens.space.sm,
      paddingHorizontal: tokens.space.md,
      borderRadius: tokens.radius.sm,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: "center",
    },
    actionButtonText: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
      color: colors.primary,
      letterSpacing: 0.2,
    },
    deleteButton: {
      borderColor: colors.accent6,
    },
    deleteButtonText: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
      color: colors.accent6,
      letterSpacing: 0.2,
    },
    emptyState: {
      paddingVertical: tokens.space.xxl,
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: tokens.font.base,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    billRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: tokens.space.md,
      paddingHorizontal: tokens.space.lg,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      borderRadius: tokens.radius.md,
      marginBottom: tokens.space.sm,
    },
    billInfo: { flex: 1 },
    billDate: {
      fontSize: tokens.font.base,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: tokens.space.xs,
      letterSpacing: 0.2,
    },
    billAmount: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    billStatus: {
      alignItems: "flex-end",
    },
    statusBadge: {
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.xs,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: "rgba(16, 185, 129, 0.3)",
    },
    statusText: {
      fontSize: tokens.font.xs,
      fontWeight: "600",
      color: colors.accent5,
      letterSpacing: 0.2,
    },
    subscriptionCard: {
      borderWidth: 1.5,
      borderRadius: tokens.radius.lg,
      padding: tokens.space.lg,
      backgroundColor: colors.surface,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    subscriptionContent: {
      marginBottom: tokens.space.lg,
    },
    planName: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.xs,
      letterSpacing: 0.3,
    },
    planPrice: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: colors.primary,
      marginBottom: tokens.space.sm,
      letterSpacing: 0.2,
    },
    renewalDate: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    manageButton: {
      paddingVertical: tokens.space.md,
      paddingHorizontal: tokens.space.md,
      borderRadius: tokens.radius.md,
      backgroundColor: colors.primary,
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    manageButtonText: {
      fontSize: tokens.font.base,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.3,
    },
    infoTitle: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.sm,
      paddingHorizontal: tokens.space.lg,
      paddingTop: tokens.space.lg,
      letterSpacing: 0.3,
    },
    infoText: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      paddingHorizontal: tokens.space.lg,
      paddingBottom: tokens.space.lg,
      lineHeight: 19,
      fontWeight: "500",
    },
  });
