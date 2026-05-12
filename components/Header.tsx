import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import { Avatar } from "./Avatar";
import { Icon } from "./ui/Icon";

interface HeaderProps {
  title?: string;
  /** MaterialCommunityIcons name shown in a frosted square before the title */
  titleIcon?: string;
  /** Small glass-morphism pill below the title for contextual info */
  chip?: { icon: string; label: string };
}

export const Header = ({ title, titleIcon, chip }: HeaderProps = {}) => {
  const { colors, tokens } = useAppTheme();
  const styles = getStyles(colors, tokens);
  const router = useRouter();
  const { profile } = useProfile();
  const fullName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Membre";

  return (
    <View style={[styles.header, !title && styles.headerCompact]}>
      {/* ── Atmospheric blobs ───────────────────────────────────────────── */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />
      {/* Extra top-left accent blob */}
      <View style={styles.blob4} />

      <View style={styles.headerInner}>
        {/* ── Row 1 : brand pill ←→ avatar ────────────────────────────── */}
        <View style={styles.topRow}>
          <View style={styles.brandPill}>
            <Image
              source={{
                uri: "https://ojyq.org/wp-content/uploads/2025/04/IMG-20250318-WA0007.jpg",
              }}
              style={styles.brandLogo}
            />
            <Text style={styles.brandText}>OJYQ</Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile" as any)}
            activeOpacity={0.85}
          >
            <View style={styles.avatarRing}>
              <Avatar name={fullName} size={40} avatarPreset={profile.avatarPreset ?? null} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Row 2 : page identity block ─────────────────────────────── */}
        {title && (
          <View style={styles.identityBlock}>
            {/* Icon + title */}
            <View style={styles.titleRow}>
              {titleIcon && (
                <View style={styles.titleIconWrap}>
                  <Icon
                    name={titleIcon}
                    size={19}
                    color="rgba(255,255,255,0.88)"
                  />
                </View>
              )}
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>

            {/* Accent underline */}
            <View style={styles.titleAccent} />

            {/* Contextual chip */}
            {chip && (
              <View style={styles.chip}>
                <Icon
                  name={chip.icon}
                  size={12}
                  color="rgba(255,255,255,0.65)"
                />
                <Text style={styles.chipText}>{chip.label}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    header: {
      backgroundColor: colors.primaryDark,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      overflow: "hidden",
      paddingTop: Platform.OS === "ios" ? 58 : 46,
      paddingBottom: 32,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.30,
      shadowRadius: 20,
      elevation: 12,
    },
    headerCompact: {
      paddingBottom: 22,
    },

    // ── Blobs ─────────────────────────────────────────────────────────────────
    blob1: {
      position: "absolute",
      top: -80,
      right: -80,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: colors.primaryLight,
      opacity: 0.15,
    },
    blob2: {
      position: "absolute",
      bottom: -60,
      left: -60,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: colors.primary,
      opacity: 0.12,
    },
    blob3: {
      position: "absolute",
      top: "35%",
      right: "25%",
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primaryLight,
      opacity: 0.07,
    },
    blob4: {
      position: "absolute",
      top: -30,
      left: -30,
      width: 130,
      height: 130,
      borderRadius: 65,
      backgroundColor: colors.primary,
      opacity: 0.09,
    },

    // ── Inner layout ──────────────────────────────────────────────────────────
    headerInner: {
      paddingHorizontal: tokens.space.xl,
      zIndex: 1,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: tokens.space.xl,
    },

    // Brand pill
    brandPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: "rgba(255,255,255,0.12)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
    },
    brandLogo: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    brandText: {
      fontSize: tokens.font.sm,
      color: "#FFFFFF",
      fontWeight: "800",
      letterSpacing: 1.5,
    },

    // Avatar ring
    avatarRing: {
      borderRadius: 28,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.28)",
      padding: 2,
    },

    // ── Page identity block ───────────────────────────────────────────────────
    identityBlock: {
      gap: 0,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.md,
    },
    titleIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.13)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: tokens.font.xxxl,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: -0.6,
      flex: 1,
    },
    titleAccent: {
      width: 36,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.primary,
      marginTop: 8,
      marginLeft: 48, // aligns under title text (icon wrap width + gap)
      opacity: 0.85,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      marginTop: tokens.space.md,
      backgroundColor: "rgba(255,255,255,0.09)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.13)",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: tokens.radius.pill,
    },
    chipText: {
      fontSize: tokens.font.sm,
      color: "rgba(255,255,255,0.70)",
      fontWeight: "500",
      letterSpacing: 0.1,
    },
  });
