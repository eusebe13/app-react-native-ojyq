/**
 * App Settings — Dark Mode
 *
 * Design:
 *  • Modern card-based settings sections
 *  • Toggle switches with smooth animations
 *  • Clear descriptions for each setting
 *  • Real-time updates with visual feedback
 *  • Dark mode persistent storage
 *  • Enhanced visual hierarchy and spacing
 */

import React from "react";
import { showToast } from "@/components/Toast";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useProfile } from "@/hooks/use-profile";

export default function AppSettings() {
  const { saving, saveProfile } = useProfile();
  const { isDark, setDark, colors, tokens } = useAppTheme();

  const handleDarkModeToggle = async (value: boolean) => {
    try {
      await setDark(value);
      await saveProfile({ darkMode: value });
    } catch {
      showToast("Impossible de mettre à jour le mode sombre", "error");
      await setDark(!value);
    }
  };

  const styles = getStyles(colors, tokens);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surfaceDim }]}
      edges={["left", "right", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section: Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apparence</Text>

          <View
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Mode sombre</Text>
              <Text style={styles.settingDescription}>
                Adaptez l&apos;interface à votre préférence
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleDarkModeToggle}
              disabled={saving}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? "#FFFFFF" : colors.surfaceDim}
            />
          </View>
        </View>

        {/* Section: Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À Propos</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Version de l&apos;Application</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Dernière Mise à Jour</Text>
            <Text style={styles.infoValue}>
              {new Date().toLocaleDateString("fr-FR")}
            </Text>
          </View>
        </View>

        {/* Storage Info */}
        <View style={[styles.section, { backgroundColor: colors.surfaceDim }]}>
          <Text style={styles.storageTitle}>Info</Text>
          <Text style={styles.storageText}>
            Vos préférences sont sauvegardées automatiquement dans le cloud.
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
      marginBottom: tokens.space.xl,
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: tokens.font.xs,
      fontWeight: "700",
      color: colors.textSecondary,
      paddingHorizontal: tokens.space.xl,
      paddingTop: tokens.space.lg,
      paddingBottom: tokens.space.md,
      backgroundColor: colors.surface,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: tokens.space.xl,
      paddingVertical: tokens.space.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    settingInfo: {
      flex: 1,
      marginRight: tokens.space.md,
    },
    settingLabel: {
      fontSize: tokens.font.base,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: tokens.space.xs,
      letterSpacing: 0.2,
    },
    settingDescription: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    infoBox: {
      paddingHorizontal: tokens.space.xl,
      paddingVertical: tokens.space.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    infoLabel: {
      fontSize: tokens.font.base,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: tokens.font.base,
      fontWeight: "600",
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    storageTitle: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: tokens.space.sm,
      paddingHorizontal: tokens.space.xl,
      paddingTop: tokens.space.lg,
      letterSpacing: 0.3,
    },
    storageText: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      paddingHorizontal: tokens.space.xl,
      paddingBottom: tokens.space.lg,
      lineHeight: 19,
    },
  });
