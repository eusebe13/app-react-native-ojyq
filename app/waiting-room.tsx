import React from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/contexts/ThemeContext";
import { logOut } from "@/hooks/use-auth";

export default function WaitingRoomScreen() {
  const { colors } = useAppTheme();

  const handleContact = () => {
    Linking.openURL("mailto:info@ojyq.org").catch(() => {});
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (e) {
      console.warn("[WaitingRoomScreen] logout error:", e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.inner}>

        {/* ── Stepper ─────────────────────────────────────────────────── */}
        <View style={styles.stepper}>
          {/* Step 1 — done */}
          <View style={[styles.stepCircle, styles.stepDone]}>
            <Text style={styles.stepCheckmark}>✓</Text>
          </View>
          <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
          {/* Step 2 — current */}
          <View style={[styles.stepCircle, styles.stepCurrent]}>
            <Text style={styles.stepCurrentText}>2</Text>
          </View>
          <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
          {/* Step 3 — future */}
          <View style={[styles.stepCircle, {
            backgroundColor: colors.surfaceDim,
            borderColor: colors.border,
            borderWidth: 1,
          }]}>
            <Text style={[styles.stepNumber, { color: colors.textTertiary }]}>3</Text>
          </View>
        </View>

        {/* ── Step labels ─────────────────────────────────────────────── */}
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, { color: "#10B981" }]}>Inscrit</Text>
          <Text style={[styles.stepLabel, { color: "#F59E0B" }]}>Validation</Text>
          <Text style={[styles.stepLabel, { color: colors.textTertiary }]}>Accès</Text>
        </View>

        {/* ── Title ───────────────────────────────────────────────────── */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Étape 2 : Validation en cours
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Votre compte a bien été créé. Un administrateur va valider votre accès prochainement.
        </Text>

        {/* ── Contact ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.contactBox, {
            backgroundColor: "rgba(245,158,11,0.10)",
            borderColor: "rgba(245,158,11,0.30)",
          }]}
          onPress={handleContact}
          activeOpacity={0.7}
        >
          <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>
            Des questions ?
          </Text>
          <Text style={styles.contactEmail}>info@ojyq.org</Text>
        </TouchableOpacity>

        {/* ── Logout ──────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>
            Se déconnecter
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  stepper: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDone: { backgroundColor: "#10B981" },
  stepCurrent: {
    backgroundColor: "rgba(245,158,11,0.20)",
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  stepLine: { height: 2, width: 40 },
  stepCheckmark: { color: "#fff", fontWeight: "700", fontSize: 16 },
  stepCurrentText: { color: "#F59E0B", fontWeight: "700", fontSize: 14 },
  stepNumber: { fontWeight: "700", fontSize: 14 },
  stepLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 186,
    marginBottom: 24,
  },
  stepLabel: { fontSize: 11, fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  contactBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  contactLabel: { fontSize: 12, marginBottom: 4 },
  contactEmail: { color: "#F59E0B", fontWeight: "700", fontSize: 15 },
  logoutButton: { marginTop: 24, padding: 8 },
  logoutText: { fontSize: 14, textDecorationLine: "underline" },
});
