/**
 * HomeScreen v2 — modern redesign
 *
 * Design:
 *  - Full-bleed gradient hero header with curved bottom edge
 *  - Horizontal scrollable event cards (colored, full-bleed)
 *  - Channel list with color-coded initials
 *  - Real-time Firestore data throughout
 */

import React from "react";
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useProfile } from "@/hooks/use-profile";
import { useUpcomingEvents } from "@/hooks/use-upcoming-events";
import { useChannelsPreview } from "@/hooks/use-channels-preview";
import { TaskSection } from "@/components/TaskSection";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/Card";
import { DOCUMENTS_DATA } from "@/constants/Mockdata";
import type { CalendarItem } from "@/types/models";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function getTodayLabel(): string {
  const s = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getStatusColor(status: string, colors: any): string {
  switch (status) {
    case "Actif":  return colors.online;
    case "Pause":  return colors.accent1;
    case "Visite": return colors.accent3;
    case "Arrêt":  return colors.accent6;
    default:       return colors.textTertiary;
  }
}

function getChannelColor(name: string, colors: any): string {
  const palette = [
    colors.primary,
    colors.accent1,
    colors.accent2,
    colors.accent3,
    colors.accent4,
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % palette.length;
  return palette[Math.abs(h)];
}

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
  if (diff < 60)    return "À l'instant";
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

const EVENT_CARD_PALETTE = [
  "#003566", // midnight navy
  "#AE2012", // vivid crimson
  "#1B4332", // forest emerald
  "#5A189A", // deep violet
  "#1B4965", // ocean teal
  "#800F2F", // dark rose
  "#7B2D00", // burnt sienna
  "#0D3B66", // prussian blue
];

function getEventCardColor(ev: CalendarItem, idx: number): string {
  const stored = (ev as any).color as string | undefined;
  if (stored) return stored;
  return EVENT_CARD_PALETTE[idx % EVENT_CARD_PALETTE.length];
}

function formatEventTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatEventDayNum(d: Date): string {
  return String(d.getDate()).padStart(2, "0");
}

function formatEventMonth(d: Date): string {
  return d.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase().replace(".", "");
}

function formatEventWeekday(d: Date): string {
  return d.toLocaleDateString("fr-FR", { weekday: "short" }).toUpperCase().replace(".", "");
}

// ─── Local section-header sub-component ──────────────────────────────────────

function SectionHead({
  icon,
  title,
  onViewAll,
  colors,
  tokens,
}: {
  icon: string;
  title: string;
  onViewAll?: () => void;
  colors: any;
  tokens: any;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: tokens.space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.space.sm }}>
        <View style={{
          width: 34,
          height: 34,
          borderRadius: tokens.radius.sm,
          backgroundColor: colors.primaryTint,
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Icon name={icon as any} size={17} color={colors.primary} />
        </View>
        <Text style={{ fontSize: tokens.font.lg, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.2 }}>
          {title}
        </Text>
      </View>

      {onViewAll && (
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 4 }}
          onPress={onViewAll}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: tokens.font.sm, color: colors.primary, fontWeight: "600" }}>
            Voir tout
          </Text>
          <Icon name="chevron-right" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

const HomeScreen = () => {
  const { colors, tokens } = useAppTheme();
  const router = useRouter();
  const { profile }  = useProfile();
  const { events }   = useUpcomingEvents(6);
  const { channels } = useChannelsPreview(4);

  const styles      = getStyles(colors, tokens);
  const greeting    = getGreeting();
  const todayLabel  = getTodayLabel();
  const statusColor = getStatusColor(profile.status, colors);
  const fullName    = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Membre";

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════════════════════════════
            HERO HEADER — curved bottom, gradient blobs
            ══════════════════════════════════════════════════════════ */}
        <View style={styles.header}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />

          <View style={styles.headerInner}>
            {/* Row 1: brand + avatar */}
            <View style={styles.headerRow1}>
              <View style={styles.brandPill}>
                <Image
                  source={{ uri: "https://ojyq.org/wp-content/uploads/2025/04/IMG-20250318-WA0007.jpg" }}
                  style={styles.brandLogo}
                />
                <Text style={styles.brandText}>OJYQ</Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push("/(tabs)/profile" as any)}
                activeOpacity={0.85}
              >
                <View style={styles.avatarRing}>
                  <Avatar name={fullName} size={42} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Row 2: greeting + name */}
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {profile.firstName || "Membre"} !
            </Text>

            {/* Row 3: role + status + date */}
            <View style={styles.badgeRow}>
              <View style={styles.rolePill}>
                <Icon name="shield-account-outline" size={11} color="rgba(255,255,255,0.85)" />
                <Text style={styles.rolePillText}>{profile.role}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusColor + "28" }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusPillText, { color: statusColor }]}>
                  {profile.status}
                </Text>
              </View>
              <View style={styles.datePill}>
                <Text style={styles.datePillText}>{todayLabel}</Text>
              </View>
            </View>

            {/* Row 4: quick stats */}
            {(events.length > 0 || channels.length > 0) && (
              <View style={styles.statsRow}>
                <TouchableOpacity
                  style={styles.statBtn}
                  onPress={() => router.push("/(tabs)/calendar" as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.statIconWrap}>
                    <Icon name="calendar-check-outline" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.statValue}>{events.length}</Text>
                    <Text style={styles.statLabel}>
                      {events.length === 1 ? "événement" : "événements"}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.statDivider} />

                <TouchableOpacity
                  style={styles.statBtn}
                  onPress={() => router.push("/(tabs)/chat" as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.statIconWrap}>
                    <Icon name="chat-outline" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.statValue}>{channels.length}</Text>
                    <Text style={styles.statLabel}>
                      {channels.length === 1 ? "canal" : "canaux"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════
            TÂCHES
            ══════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <TaskSection />
        </View>

        {/* ══════════════════════════════════════════════════════════════
            ÉVÉNEMENTS — horizontal colored cards
            ══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionNoHPad}>
          <View style={styles.sectionHeadPad}>
            <SectionHead
              icon="calendar-outline"
              title="Événements à venir"
              onViewAll={() => router.push("/(tabs)/calendar" as any)}
              colors={colors}
              tokens={tokens}
            />
          </View>

          {events.length === 0 ? (
            <View style={[styles.emptyCard, { marginHorizontal: tokens.space.xl }]}>
              <Icon name="calendar-remove-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Aucun événement à venir</Text>
              <Text style={styles.emptySubtitle}>Les prochains événements apparaîtront ici</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventScroll}
            >
              {events.map((ev, i) => {
                const cardColor = getEventCardColor(ev, i);
                const timeStr   = ev.dateObj ? formatEventTime(ev.dateObj)    : "";
                const dayNum    = ev.dateObj ? formatEventDayNum(ev.dateObj)  : "";
                const monthStr  = ev.dateObj ? formatEventMonth(ev.dateObj)   : "";
                const weekday   = ev.dateObj ? formatEventWeekday(ev.dateObj) : "";
                const isShift   = ev.type === "shift";

                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={[styles.eventCard, { backgroundColor: cardColor }]}
                    onPress={() => router.push("/(tabs)/calendar" as any)}
                    activeOpacity={0.88}
                  >
                    {/* Inner shine at top */}
                    <View style={styles.eventCardShine} />

                    {/* Top section: type pill (left) + date block (right) */}
                    <View style={styles.eventCardTop}>
                      <View style={[styles.eventTypePill, isShift && styles.eventTypePillShift]}>
                        <Icon
                          name={isShift ? "clock-time-four-outline" : "calendar-star"}
                          size={10}
                          color="rgba(255,255,255,0.9)"
                        />
                        <Text style={styles.eventTypePillText}>
                          {isShift ? "QUART" : "ÉVÉNEMENT"}
                        </Text>
                      </View>

                      <View style={styles.eventDateBlock}>
                        <Text style={styles.eventDateDay}>{dayNum}</Text>
                        <Text style={styles.eventDateMonth}>{monthStr}</Text>
                        <Text style={styles.eventDateWeekday}>{weekday}</Text>
                      </View>
                    </View>

                    {/* Hairline divider */}
                    <View style={styles.eventCardDivider} />

                    {/* Bottom section: dark overlay, title + meta */}
                    <View style={styles.eventCardBottom}>
                      <Text style={styles.eventCardTitle} numberOfLines={2}>
                        {ev.title}
                      </Text>

                      {!!timeStr && (
                        <View style={styles.eventCardMetaRow}>
                          <Icon name="clock-outline" size={11} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.eventCardMetaText}>{timeStr}</Text>
                        </View>
                      )}

                      {!!ev.location && ev.location !== "Lieu à définir" && (
                        <View style={styles.eventCardMetaRow}>
                          <Icon name="map-marker-outline" size={11} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.eventCardMetaText} numberOfLines={1}>
                            {ev.location}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════
            MESSAGERIE
            ══════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <SectionHead
            icon="chat-outline"
            title="Messagerie"
            onViewAll={() => router.push("/(tabs)/chat" as any)}
            colors={colors}
            tokens={tokens}
          />

          {channels.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="chat-remove-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Aucun canal</Text>
              <Text style={styles.emptySubtitle}>Les discussions apparaîtront ici</Text>
            </View>
          ) : (
            <Card variant="elevated" style={styles.listCard}>
              {channels.map((ch, i) => {
                const chColor = getChannelColor(ch.name, colors);
                const timeStr = relativeTime(ch.lastMessageAt ?? ch.createdAt);
                const unread  = ch.unreadCount ?? 0;
                const isGroup = ch.type === "public" || ch.type === "private";

                return (
                  <View key={ch.id}>
                    <TouchableOpacity
                      style={styles.channelRow}
                      onPress={() => router.push(`/channel/${ch.id}` as any)}
                      activeOpacity={0.8}
                    >
                      {/* Avatar */}
                      <View style={[styles.chAvatarWrap, { backgroundColor: chColor + "1a" }]}>
                        {isGroup ? (
                          <Icon name="account-group" size={20} color={chColor} />
                        ) : (
                          <Text style={[styles.chInitials, { color: chColor }]}>
                            {channelInitials(ch.name)}
                          </Text>
                        )}
                      </View>

                      {/* Content */}
                      <View style={styles.chContent}>
                        <View style={styles.chTopRow}>
                          <Text
                            style={[styles.chName, unread > 0 && styles.chNameUnread]}
                            numberOfLines={1}
                          >
                            {ch.name}
                          </Text>
                          <Text style={styles.chTime}>{timeStr}</Text>
                        </View>
                        <Text
                          style={[styles.chMsg, unread > 0 && styles.chMsgUnread]}
                          numberOfLines={1}
                        >
                          {ch.lastMessage || ch.description || "Aucun message"}
                        </Text>
                      </View>

                      {/* Unread badge */}
                      {unread > 0 ? (
                        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.unreadText}>{unread > 99 ? "99+" : unread}</Text>
                        </View>
                      ) : (
                        <Icon name="chevron-right" size={16} color={colors.borderLight} />
                      )}
                    </TouchableOpacity>

                    {i < channels.length - 1 && (
                      <View style={[styles.rowDivider, { marginLeft: tokens.space.md + 48 + tokens.space.md }]} />
                    )}
                  </View>
                );
              })}
            </Card>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════
            DOCUMENTS
            ══════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <SectionHead
            icon="folder-outline"
            title="Documents"
            colors={colors}
            tokens={tokens}
          />

          <Card variant="elevated" style={styles.listCard}>
            {DOCUMENTS_DATA.map((docItem, i) => (
              <View key={docItem.id}>
                <TouchableOpacity
                  style={styles.docRow}
                  onPress={() => Linking.openURL(docItem.url)}
                  activeOpacity={0.8}
                >
                  <View style={styles.docIconWrap}>
                    <Icon name={docItem.icon} size={19} color={colors.primary} />
                  </View>
                  <Text style={styles.docTitle} numberOfLines={1}>{docItem.title}</Text>
                  <Icon name="open-in-new" size={15} color={colors.textTertiary} />
                </TouchableOpacity>
                {i < DOCUMENTS_DATA.length - 1 && (
                  <View style={[styles.rowDivider, { marginLeft: tokens.space.md + 38 + tokens.space.md }]} />
                )}
              </View>
            ))}
          </Card>
        </View>

        {/* ══════════════════════════════════════════════════════════════
            CONTACT
            ══════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <SectionHead
            icon="contacts-outline"
            title="Contact"
            colors={colors}
            tokens={tokens}
          />

          <View style={styles.contactRow}>
            <Card
              variant="tinted"
              tintColor={colors.primary}
              style={styles.contactCard}
              onPress={() => Linking.openURL("mailto:info@ojyq.org")}
            >
              <View style={styles.contactIconWrap}>
                <Icon name="email-outline" size={22} color={colors.primary} />
              </View>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={[styles.contactValue, { color: colors.primary }]}>info@ojyq.org</Text>
            </Card>

            <Card
              variant="tinted"
              tintColor={colors.accent2}
              style={styles.contactCard}
              onPress={() => Linking.openURL("tel:+14386224435")}
            >
              <View style={[styles.contactIconWrap, { backgroundColor: colors.accent2 + "14" }]}>
                <Icon name="phone-outline" size={22} color={colors.accent2} />
              </View>
              <Text style={styles.contactLabel}>Téléphone</Text>
              <Text style={[styles.contactValue, { color: colors.accent2 }]}>+1 438-622-4435</Text>
            </Card>
          </View>

          <Card
            variant="elevated"
            style={styles.fbCard}
            onPress={() => Linking.openURL("https://www.facebook.com/people/OJYQ/61573730380786/")}
          >
            <View style={styles.fbRow}>
              <View style={styles.fbIconWrap}>
                <Icon name="facebook" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fbTitle}>Facebook</Text>
                <Text style={styles.fbSub}>Suivez nos dernières nouvelles</Text>
              </View>
              <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
            </View>
          </Card>
        </View>

        {/* ══════════════════════════════════════════════════════════════
            FOOTER
            ══════════════════════════════════════════════════════════ */}
        <View style={styles.footer}>
          <Image
            source={{ uri: "https://ojyq.org/wp-content/uploads/2025/04/IMG-20250318-WA0007.jpg" }}
            style={styles.footerLogo}
          />
          <Text style={styles.footerText}>
            © 2026 Organisation de la jeunesse Yira du Québec
          </Text>
          <Text style={styles.footerSub}>Tous droits réservés</Text>
        </View>
      </ScrollView>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceDim },
    content: { paddingBottom: 60 },

    // ── Hero header ──────────────────────────────────────────────────────────
    header: {
      backgroundColor: colors.primaryDark,
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
      overflow: "hidden",
      paddingTop: Platform.OS === "ios" ? 60 : 48,
      paddingBottom: 36,
      // Shadow for the header card
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 12,
    },
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

    headerInner: {
      paddingHorizontal: tokens.space.xl,
      zIndex: 1,
    },
    headerRow1: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: tokens.space.xxl,
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
    },
    brandLogo: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    brandText: {
      fontSize: tokens.font.sm,
      color: "#FFFFFF",
      fontWeight: "800",
      letterSpacing: 1.5,
    },

    // Avatar ring
    avatarRing: {
      borderRadius: 30,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.3)",
      padding: 2,
    },

    // Greeting
    greeting: {
      fontSize: tokens.font.lg,
      color: "rgba(255,255,255,0.6)",
      fontWeight: "400",
      marginBottom: 2,
    },
    heroName: {
      fontSize: 38,
      color: "#FFFFFF",
      fontWeight: "800",
      letterSpacing: -1,
      marginBottom: tokens.space.lg,
      lineHeight: 44,
    },

    // Badges
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
      flexWrap: "wrap",
      marginBottom: tokens.space.xl,
    },
    rolePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.14)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: tokens.radius.pill,
    },
    rolePillText: {
      fontSize: tokens.font.xs,
      color: "rgba(255,255,255,0.9)",
      fontWeight: "600",
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: tokens.radius.pill,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusPillText: {
      fontSize: tokens.font.xs,
      fontWeight: "600",
    },
    datePill: {
      backgroundColor: "rgba(255,255,255,0.09)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: tokens.radius.pill,
    },
    datePillText: {
      fontSize: tokens.font.xs,
      color: "rgba(255,255,255,0.6)",
      fontWeight: "500",
    },

    // Stats row (glass morphism style)
    statsRow: {
      flexDirection: "row",
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.1)",
      overflow: "hidden",
    },
    statBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
      paddingVertical: tokens.space.md,
      paddingHorizontal: tokens.space.md,
    },
    statIconWrap: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.sm,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    statValue: {
      fontSize: tokens.font.lg,
      color: "#FFFFFF",
      fontWeight: "800",
      lineHeight: 22,
    },
    statLabel: {
      fontSize: 10,
      color: "rgba(255,255,255,0.6)",
      fontWeight: "500",
    },
    statDivider: {
      width: 1,
      backgroundColor: "rgba(255,255,255,0.12)",
    },

    // ── Sections ─────────────────────────────────────────────────────────────
    section: {
      paddingHorizontal: tokens.space.xl,
      marginTop: tokens.space.xxl,
    },
    sectionNoHPad: {
      marginTop: tokens.space.xxl,
    },
    sectionHeadPad: {
      paddingHorizontal: tokens.space.xl,
    },

    // ── Empty state ───────────────────────────────────────────────────────────
    emptyCard: {
      alignItems: "center",
      gap: tokens.space.xs,
      paddingVertical: tokens.space.xl + 4,
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    emptyTitle: {
      fontSize: tokens.font.base,
      color: colors.textTertiary,
      fontWeight: "600",
    },
    emptySubtitle: {
      fontSize: tokens.font.sm,
      color: colors.textTertiary,
      opacity: 0.7,
    },

    // ── Event cards (horizontal scroll) ───────────────────────────────────────
    eventScroll: {
      paddingHorizontal: tokens.space.xl,
      paddingBottom: tokens.space.sm,
      gap: tokens.space.md,
    },
    eventCard: {
      width: 200,
      height: 238,
      borderRadius: 24,
      overflow: "hidden",
      justifyContent: "space-between",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
      elevation: 10,
    },
    // Inner shine at very top (simulates a glass highlight)
    eventCardShine: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 56,
      backgroundColor: "rgba(255,255,255,0.08)",
    },
    eventCardTop: {
      flex: 1,
      padding: tokens.space.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    eventTypePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(0,0,0,0.22)",
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
    },
    eventTypePillShift: {
      backgroundColor: "rgba(255,255,255,0.18)",
    },
    eventTypePillText: {
      fontSize: 9,
      color: "rgba(255,255,255,0.95)",
      fontWeight: "800",
      letterSpacing: 0.8,
    },
    // Date block — top-right corner
    eventDateBlock: {
      alignItems: "flex-end",
    },
    eventDateDay: {
      fontSize: 46,
      fontWeight: "800",
      color: "rgba(255,255,255,0.95)",
      lineHeight: 50,
      letterSpacing: -2,
    },
    eventDateMonth: {
      fontSize: 11,
      fontWeight: "700",
      color: "rgba(255,255,255,0.65)",
      letterSpacing: 1.5,
      lineHeight: 14,
    },
    eventDateWeekday: {
      fontSize: 10,
      fontWeight: "500",
      color: "rgba(255,255,255,0.45)",
      letterSpacing: 0.5,
      lineHeight: 13,
    },
    // Hairline between top and bottom sections
    eventCardDivider: {
      height: 1,
      backgroundColor: "rgba(255,255,255,0.14)",
      marginHorizontal: tokens.space.md,
    },
    eventCardBottom: {
      backgroundColor: "rgba(0,0,0,0.42)",
      padding: tokens.space.md,
      paddingTop: 10,
      gap: 5,
    },
    eventCardTitle: {
      fontSize: tokens.font.md,
      fontWeight: "700",
      color: "#FFFFFF",
      lineHeight: 21,
      marginBottom: 2,
      letterSpacing: -0.2,
    },
    eventCardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    eventCardMetaText: {
      fontSize: 11,
      color: "rgba(255,255,255,0.72)",
      fontWeight: "500",
      flex: 1,
    },

    // ── Channels ─────────────────────────────────────────────────────────────
    listCard: { overflow: "hidden" },
    channelRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.md,
      gap: tokens.space.md,
      minHeight: 64,
    },
    chAvatarWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    chInitials: {
      fontSize: tokens.font.base,
      fontWeight: "800",
    },
    chContent: { flex: 1, minWidth: 0 },
    chTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    chName: {
      fontSize: tokens.font.base,
      fontWeight: "500",
      color: colors.textSecondary,
      flex: 1,
      marginRight: tokens.space.sm,
    },
    chNameUnread: { fontWeight: "700", color: colors.textPrimary },
    chTime: { fontSize: tokens.font.xs, color: colors.textTertiary, flexShrink: 0 },
    chMsg: { fontSize: tokens.font.sm, color: colors.textTertiary },
    chMsgUnread: { color: colors.textSecondary, fontWeight: "500" },

    unreadBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 5,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    unreadText: { fontSize: 11, color: "#FFFFFF", fontWeight: "700" },

    rowDivider: { height: 1, backgroundColor: colors.borderLight },

    // ── Documents ────────────────────────────────────────────────────────────
    docRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.md,
      gap: tokens.space.md,
      minHeight: 56,
    },
    docIconWrap: {
      width: 38,
      height: 38,
      borderRadius: tokens.radius.md,
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    docTitle: {
      flex: 1,
      fontSize: tokens.font.base,
      fontWeight: "500",
      color: colors.textPrimary,
    },

    // ── Contact ──────────────────────────────────────────────────────────────
    contactRow: {
      flexDirection: "row",
      gap: tokens.space.sm,
      marginBottom: tokens.space.sm,
    },
    contactCard: {
      flex: 1,
      padding: tokens.space.md,
      alignItems: "center",
      gap: 6,
    },
    contactIconWrap: {
      width: 44,
      height: 44,
      borderRadius: tokens.radius.md,
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    contactLabel: {
      fontSize: tokens.font.xs,
      fontWeight: "600",
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    contactValue: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
      textAlign: "center",
    },
    fbCard: {
      backgroundColor: colors.facebook,
      borderColor: colors.facebook,
      overflow: "hidden",
    },
    fbRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: tokens.space.md,
      gap: tokens.space.md,
    },
    fbIconWrap: {
      width: 42,
      height: 42,
      borderRadius: tokens.radius.md,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    fbTitle: { fontSize: tokens.font.md, fontWeight: "700", color: "#FFFFFF" },
    fbSub:   { fontSize: tokens.font.sm, color: "rgba(255,255,255,0.7)" },

    // ── Footer ───────────────────────────────────────────────────────────────
    footer: {
      alignItems: "center",
      paddingTop: tokens.space.xxl,
      paddingHorizontal: tokens.space.xl,
      gap: tokens.space.xs,
    },
    footerLogo: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginBottom: tokens.space.sm,
      opacity: 0.6,
    },
    footerText: {
      fontSize: tokens.font.sm,
      color: colors.textTertiary,
      textAlign: "center",
      opacity: 0.7,
    },
    footerSub: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
      opacity: 0.5,
    },
  });

export default HomeScreen;
