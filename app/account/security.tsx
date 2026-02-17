/**
 * Security Settings — In-App Password Change
 *
 * Design:
 *  • Modern password input with visibility toggle
 *  • Real-time password strength indicator with visual feedback
 *  • Password confirmation matching
 *  • Requirements checklist
 *  • Smooth loading states and error handling
 *  • Enhanced visual hierarchy and spacing
 */

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/ThemeContext";
import { auth } from "@/firebaseConfig";

type PasswordStrength = "weak" | "fair" | "good" | "strong";

export default function SecuritySettings() {
  const { colors, tokens } = useAppTheme();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] =
    useState<PasswordStrength>("weak");

  const getPasswordStrength = (password: string): PasswordStrength => {
    if (!password) return "weak";
    if (password.length < 8) return "weak";
    if (password.length < 12) return "fair";
    if (
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*]/.test(password)
    ) {
      return "strong";
    }
    return "good";
  };

  const getStrengthColor = (strength: PasswordStrength) => {
    switch (strength) {
      case "weak":
        return colors.accent6 || "#EF4444";
      case "fair":
        return colors.accent4 || "#F59E0B";
      case "good":
        return colors.accent5 || "#10B981";
      case "strong":
        return colors.primary || "#3B82F6";
    }
  };

  const getStrengthLabel = (strength: PasswordStrength) => {
    const labels: Record<PasswordStrength, string> = {
      weak: "Faible",
      fair: "Moyen",
      good: "Bon",
      strong: "Très fort",
    };
    return labels[strength];
  };

  const getStrengthPercentage = (strength: PasswordStrength) => {
    const percentages: Record<PasswordStrength, number> = {
      weak: 25,
      fair: 50,
      good: 75,
      strong: 100,
    };
    return percentages[strength];
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre mot de passe actuel");
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }

    const strength = getPasswordStrength(newPassword);
    if (strength === "weak") {
      Alert.alert(
        "Erreur",
        "Le mot de passe est trop faible (minimum 8 caractères)",
      );
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(
        "Erreur",
        "Le nouveau mot de passe doit être différent de l'ancien",
      );
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        Alert.alert("Erreur", "Utilisateur non trouvé");
        return;
      }

      // Re-authenticate before password change
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      Alert.alert("Succès", "Mot de passe changé avec succès");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStrength("weak");
    } catch (error: any) {
      if (error.code === "auth/wrong-password") {
        Alert.alert("Erreur", "Le mot de passe actuel est incorrect");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Erreur", "Le nouveau mot de passe est trop faible");
      } else {
        Alert.alert(
          "Erreur",
          error.message || "Impossible de changer le mot de passe",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewPasswordChange = (text: string) => {
    setNewPassword(text);
    setPasswordStrength(getPasswordStrength(text));
  };

  const styles = getStyles(colors, tokens);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surfaceDim }]}
      edges={["left", "right", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section: Current Password */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vérification d'Identité</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mot de passe actuel *</Text>
            <View
              style={[
                styles.passwordInput,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <TextInput
                style={[styles.passwordField, { color: colors.textPrimary }]}
                placeholder="Entrez votre mot de passe"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showCurrentPassword}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={loading}
              >
                <Text style={[styles.toggleText, { color: colors.primary }]}>
                  {showCurrentPassword ? "Masquer" : "Afficher"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section: New Password */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nouveau Mot de Passe</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nouveau mot de passe *</Text>
            <View
              style={[
                styles.passwordInput,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <TextInput
                style={[styles.passwordField, { color: colors.textPrimary }]}
                placeholder="Minimum 8 caractères"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={handleNewPasswordChange}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                disabled={loading}
              >
                <Text style={[styles.toggleText, { color: colors.primary }]}>
                  {showNewPassword ? "Masquer" : "Afficher"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator */}
            {newPassword && (
              <View style={styles.strengthContainer}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={[
                      styles.strengthLabel,
                      { color: getStrengthColor(passwordStrength) },
                    ]}
                  >
                    Force: {getStrengthLabel(passwordStrength)}
                  </Text>
                </View>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${getStrengthPercentage(passwordStrength)}%`,
                        backgroundColor: getStrengthColor(passwordStrength),
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirmer le mot de passe *</Text>
            <View
              style={[
                styles.passwordInput,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <TextInput
                style={[styles.passwordField, { color: colors.textPrimary }]}
                placeholder="Confirmez le nouveau mot de passe"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                <Text style={[styles.toggleText, { color: colors.primary }]}>
                  {showConfirmPassword ? "Masquer" : "Afficher"}
                </Text>
              </TouchableOpacity>
            </View>

            {newPassword &&
              confirmPassword &&
              newPassword !== confirmPassword && (
                <Text style={[styles.errorText, { color: colors.accent6 }]}>
                  ❌ Les mots de passe ne correspondent pas
                </Text>
              )}
            {newPassword &&
              confirmPassword &&
              newPassword === confirmPassword && (
                <Text style={[styles.successText, { color: colors.accent5 }]}>
                  ✓ Les mots de passe correspondent
                </Text>
              )}
          </View>
        </View>

        {/* Requirements */}
        <View style={[styles.section, { backgroundColor: colors.surfaceDim }]}>
          <Text style={styles.requirementsTitle}>
            Exigences du mot de passe:
          </Text>
          <Text style={styles.requirementText}>• Minimum 8 caractères</Text>
          <Text style={styles.requirementText}>
            • Au moins une lettre majuscule
          </Text>
          <Text style={styles.requirementText}>• Au moins un chiffre</Text>
          <Text style={styles.requirementText}>
            • Au moins un caractère spécial (!@#$%^&*)
          </Text>
        </View>

        {/* Change Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.changeButton,
              loading && styles.changeButtonDisabled,
            ]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.changeButtonText}>
                Changer le mot de passe
              </Text>
            )}
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
    section: {
      marginBottom: tokens.space.xxl,
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.space.xl,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: tokens.space.lg,
    },
    fieldGroup: {
      marginBottom: tokens.space.xl,
    },
    label: {
      fontSize: tokens.font.xs,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: tokens.space.sm,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    passwordInput: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderRadius: tokens.radius.md,
      paddingHorizontal: tokens.space.md,
      paddingVertical: 0,
    },
    passwordField: {
      flex: 1,
      paddingVertical: tokens.space.md,
      fontSize: tokens.font.md,
      fontWeight: "500",
    },
    toggleText: {
      fontSize: tokens.font.xs,
      fontWeight: "600",
      paddingHorizontal: tokens.space.sm,
    },
    strengthContainer: {
      marginTop: tokens.space.md,
    },
    strengthBar: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    strengthFill: {
      height: "100%",
      borderRadius: 3,
    },
    strengthLabel: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    errorText: {
      fontSize: tokens.font.sm,
      fontWeight: "500",
      marginTop: tokens.space.sm,
      letterSpacing: 0.2,
    },
    successText: {
      fontSize: tokens.font.sm,
      fontWeight: "500",
      marginTop: tokens.space.sm,
      letterSpacing: 0.2,
    },
    requirementsTitle: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.md,
    },
    requirementText: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      marginBottom: tokens.space.xs,
      lineHeight: 18,
    },
    buttonContainer: {
      marginTop: tokens.space.xxl,
      gap: tokens.space.md,
    },
    changeButton: {
      backgroundColor: colors.primary,
      paddingVertical: tokens.space.md,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    changeButtonDisabled: { opacity: 0.6 },
    changeButtonText: {
      color: "#FFFFFF",
      fontSize: tokens.font.base,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
  });
