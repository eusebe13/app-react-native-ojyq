/**
 * HomeScreen — OJYQ Member Portal
 *
 * Features:
 *  - Gradient header with logo and notification bell
 *  - Weekly schedule with day filter
 *  - Recent chat list with unread badges
 *  - Document quick access
 *  - Contact information
 *
 * BACKEND INTEGRATION NOTES:
 *  - Replace mockData imports with API hooks (useSchedule, useChats, useDocuments)
 *  - Add WebSocket connection for real-time chat updates
 *  - Implement navigation handlers for chat/schedule detail views
 *  - Add pull-to-refresh functionality
 */

import React, { useState } from "react";
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
import { Avatar } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { SectionHeader } from "../../components/SectionHeader";
import { Icon } from "../../components/ui/Icon";
import {
  CHATS_DATA,
  DAYS,
  DOCUMENTS_DATA,
  SCHEDULE_DATA,
} from "../../constants/Mockdata";
import { useAppTheme } from "../../contexts/ThemeContext";
import { TaskSection } from "../../components/TaskSection";

const HomeScreen = () => {
  const { colors, tokens } = useAppTheme();
  const styles = getStyles(colors, tokens);

  const [selectedDay, setSelectedDay] = useState("Lun");

  const todayEvents = SCHEDULE_DATA.filter((e) => e.day === selectedDay);
  const daysWithEvents = new Set(SCHEDULE_DATA.map((e) => e.day));

  // BACKEND: Replace with navigation.navigate("Chat", { chatId })
  const openChat = (id: string) => console.log("[NAV] Chat →", id);

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─────────────────────────────────────────────────────────────── */}
        {/* GRADIENT HEADER                                                   */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <View style={styles.headerGradient}>
          {/* Decorative blob */}
          <View style={styles.blob1} />

          <View style={styles.headerInner}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.headerAvatarWrap}>
                <Image
                  source={{
                    uri: "https://ojyq.org/wp-content/uploads/2025/04/IMG-20250318-WA0007.jpg",
                  }}
                  style={styles.headerLogo}
                />
              </TouchableOpacity>
              <View style={styles.headerTitleBlock}>
                <Text style={styles.headerOrgName}>
                  Organisation de la jeunesse
                </Text>
                <Text style={styles.headerOrgBold}>Yira du Québec</Text>
              </View>
            </View>

            <View style={styles.headerBadgeRow}>
              <View style={styles.headerBadge}>
                <Icon
                  name="shield-check-outline"
                  size={13}
                  color="rgba(255,255,255,0.85)"
                />
                <Text style={styles.headerBadgeText}>ESPACE MEMBRES</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* TÂCHES                                                            */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <TaskSection />
        </View>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* HORAIRE (SCHEDULE)                                                */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader
            icon="calendar-check-outline"
            title="Horaire"
            onViewAll={() => console.log("[NAV] Horaire complet")}
          />

          {/* Day pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dayScroll}
          >
            {DAYS.map((d) => {
              const active = selectedDay === d.key;
              const hasEvents = daysWithEvents.has(d.key);
              return (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.dayPill, active && styles.dayPill_active]}
                  onPress={() => setSelectedDay(d.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayPill_label,
                      active && styles.dayPill_label_active,
                    ]}
                  >
                    {d.label}
                  </Text>
                  <Text
                    style={[
                      styles.dayPill_date,
                      active && styles.dayPill_date_active,
                    ]}
                  >
                    {d.date}
                  </Text>
                  {hasEvents && !active && (
                    <Badge dot color={colors.primary} size="sm" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Events */}
          <View style={styles.eventList}>
            {todayEvents.length === 0 ? (
              <Card variant="default">
                <View style={styles.emptyWrap}>
                  <Icon
                    name="calendar-remove-outline"
                    size={28}
                    color={colors.textTertiary}
                  />
                  <Text style={styles.emptyText}>Aucun événement ce jour</Text>
                </View>
              </Card>
            ) : (
              todayEvents.map((ev) => (
                <Card key={ev.id} variant="default" style={styles.eventCard}>
                  {/* Color stripe */}
                  <View
                    style={[styles.eventStripe, { backgroundColor: ev.color }]}
                  />

                  <View style={styles.eventBody}>
                    <View style={styles.eventTimeRow}>
                      <Text style={[styles.eventTime, { color: ev.color }]}>
                        {ev.time}
                      </Text>
                      {ev.isNow && (
                        <View style={styles.eventNowBadge}>
                          <Text style={styles.eventNowText}>En cours</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.eventTitle}>{ev.title}</Text>
                    <View style={styles.eventLocationRow}>
                      <Icon
                        name="map-marker-outline"
                        size={13}
                        color={colors.textTertiary}
                      />
                      <Text style={styles.eventLocation}>{ev.location}</Text>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        </View>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* MESSAGERIE (CHAT)                                                 */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader
            icon="chat-outline"
            title="Messagerie"
            onViewAll={() => console.log("[NAV] Tous les chats")}
          />

          <Card variant="elevated" style={styles.chatListCard}>
            {CHATS_DATA.map((chat, i) => (
              <View key={chat.id}>
                <TouchableOpacity
                  style={styles.chatRow}
                  onPress={() => openChat(chat.id)}
                  activeOpacity={0.88}
                >
                  <Avatar
                    name={chat.name}
                    isGroup={chat.isGroup}
                    isOnline={chat.isOnline}
                  />

                  <View style={styles.chatMeta}>
                    <View style={styles.chatMetaTop}>
                      <Text
                        style={[
                          styles.chatName,
                          chat.unread > 0 && styles.chatName_bold,
                        ]}
                      >
                        {chat.name}
                      </Text>
                      <Text style={styles.chatTime}>{chat.time}</Text>
                    </View>
                    <Text
                      style={[
                        styles.chatPreview,
                        chat.unread > 0 && styles.chatPreview_bold,
                      ]}
                      numberOfLines={1}
                    >
                      {chat.lastMessage}
                    </Text>
                  </View>

                  {chat.unread > 0 ? (
                    <Badge count={chat.unread} />
                  ) : (
                    <Icon
                      name="check-all"
                      size={16}
                      color={colors.textTertiary}
                    />
                  )}
                </TouchableOpacity>

                {/* Divider (not after last) */}
                {i < CHATS_DATA.length - 1 && (
                  <View style={styles.chatDivider} />
                )}
              </View>
            ))}
          </Card>
        </View>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* DOCUMENTS                                                         */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader icon="folder-outline" title="Documents" />

          <Card variant="elevated" style={styles.docListCard}>
            {DOCUMENTS_DATA.map((doc, i) => (
              <View key={doc.id}>
                <TouchableOpacity
                  style={styles.docRow}
                  onPress={() => Linking.openURL(doc.url)}
                  activeOpacity={0.88}
                >
                  <View style={styles.docIconWrap}>
                    <Icon name={doc.icon} size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.docTitle} numberOfLines={1}>
                    {doc.title}
                  </Text>
                  <Icon
                    name="open-in-new"
                    size={16}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
                {i < DOCUMENTS_DATA.length - 1 && (
                  <View style={styles.chatDivider} />
                )}
              </View>
            ))}
          </Card>
        </View>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* CONTACT                                                           */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader icon="contacts-outline" title="Contact" />

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
              <Text style={styles.contactValue}>info@ojyq.org</Text>
            </Card>

            <Card
              variant="tinted"
              tintColor={colors.accent2}
              style={styles.contactCard}
              onPress={() => Linking.openURL("tel:+14386224435")}
            >
              <View
                style={[
                  styles.contactIconWrap,
                  { backgroundColor: colors.accent2 + "12" },
                ]}
              >
                <Icon name="phone-outline" size={22} color={colors.accent2} />
              </View>
              <Text style={styles.contactLabel}>Téléphone</Text>
              <Text style={[styles.contactValue, { color: colors.accent2 }]}>
                +1 438-622-4435
              </Text>
            </Card>
          </View>

          <Card
            variant="elevated"
            style={styles.fbCard}
            onPress={() =>
              Linking.openURL(
                "https://www.facebook.com/people/OJYQ/61573730380786/",
              )
            }
          >
            <View style={styles.fbInner}>
              <View style={styles.fbIconWrap}>
                <Icon name="facebook" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.fbTextBlock}>
                <Text style={styles.fbTitle}>Facebook</Text>
                <Text style={styles.fbSub}>Suivez nos dernières nouvelles</Text>
              </View>
              <Icon
                name="chevron-right"
                size={20}
                color="rgba(255,255,255,0.7)"
              />
            </View>
          </Card>
        </View>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* FOOTER                                                            */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 Organisation de la jeunesse Yira du Québec
          </Text>
          <Text style={styles.footerSub}>Tous droits réservés</Text>
        </View>
      </ScrollView>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    // ── Screen ──
    screen: { flex: 1, backgroundColor: colors.surfaceDim },
    screenContent: { paddingBottom: 48 },

    // ── Gradient Header ──
    headerGradient: {
      backgroundColor: colors.primaryDark,
      paddingTop: Platform.OS === "ios" ? 58 : 44,
      paddingBottom: 28,
      position: "relative",
      overflow: "hidden",
    },
    blob1: {
      position: "absolute",
      top: -40,
      right: -40,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: colors.primaryLight,
      opacity: 0.25,
    },
    headerInner: {
      paddingHorizontal: tokens.space.xl,
      position: "relative",
      zIndex: 1,
    },
    headerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.md,
    },
    headerAvatarWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.4)",
      overflow: "hidden",
    },
    headerLogo: { width: 42, height: 42, borderRadius: 21 },
    headerTitleBlock: { flex: 1 },
    headerOrgName: {
      fontSize: tokens.font.sm,
      color: "rgba(255,255,255,0.7)",
      fontWeight: "500",
    },
    headerOrgBold: {
      fontSize: tokens.font.md,
      color: "#FFFFFF",
      fontWeight: "700",
      letterSpacing: -0.3,
    },
    headerBadgeRow: { marginTop: tokens.space.md },
    headerBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(255,255,255,0.15)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: tokens.radius.pill,
      alignSelf: "flex-start",
    },
    headerBadgeText: {
      fontSize: tokens.font.xs,
      color: "rgba(255,255,255,0.85)",
      fontWeight: "700",
      letterSpacing: 0.8,
    },

    // ── Section shared ──
    section: { paddingHorizontal: tokens.space.xl, marginTop: tokens.space.xxl },

    // ── Day pills ──
    dayScroll: {
      marginBottom: tokens.space.md,
      marginHorizontal: -tokens.space.xl,
      paddingHorizontal: tokens.space.xl,
    },
    dayPill: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: tokens.radius.lg,
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.sm,
      minWidth: 54,
      gap: 2,
      marginRight: tokens.space.sm,
    },
    dayPill_active: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    dayPill_label: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    dayPill_label_active: { color: "#FFFFFF" },
    dayPill_date: {
      fontSize: tokens.font.lg,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    dayPill_date_active: { color: "#FFFFFF" },

    // ── Events ──
    eventList: { gap: tokens.space.sm },
    eventCard: { flexDirection: "row", overflow: "hidden", minHeight: 72 },
    eventStripe: { width: 4, minHeight: 72 },
    eventBody: { flex: 1, padding: tokens.space.md, justifyContent: "center" },
    eventTimeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.xs,
      marginBottom: 3,
    },
    eventTime: { fontSize: tokens.font.sm, fontWeight: "700" },
    eventNowBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
    eventNowText: {
      fontSize: tokens.font.sm,
      fontWeight: "600",
      color: colors.online,
      marginRight: tokens.space.sm,
    },
    eventTitle: {
      fontSize: tokens.font.md,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 3,
    },
    eventLocationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    eventLocation: { fontSize: tokens.font.sm, color: colors.textTertiary },

    // ── Empty ──
    emptyWrap: { alignItems: "center", gap: tokens.space.sm, padding: tokens.space.xl },
    emptyText: {
      fontSize: tokens.font.base,
      color: colors.textTertiary,
      fontStyle: "italic",
    },

    // ── Chat list ──
    chatListCard: { overflow: "hidden" },
    chatRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: tokens.space.md,
      gap: tokens.space.md,
    },
    chatMeta: { flex: 1, minWidth: 0 },
    chatMetaTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 3,
    },
    chatName: {
      fontSize: tokens.font.base,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    chatName_bold: { color: colors.textPrimary, fontWeight: "700" },
    chatTime: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
      flexShrink: 0,
    },
    chatPreview: { fontSize: tokens.font.sm, color: colors.textTertiary },
    chatPreview_bold: { color: colors.textSecondary, fontWeight: "500" },
    chatDivider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginLeft: 60,
    },

    // ── Documents list ──
    docListCard: { overflow: "hidden" },
    docRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: tokens.space.md,
      gap: tokens.space.md,
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

    // ── Contact ──
    contactRow: {
      flexDirection: "row",
      gap: tokens.space.sm,
      marginBottom: tokens.space.sm,
    },
    contactCard: { flex: 1, padding: tokens.space.md, alignItems: "center", gap: 6 },
    contactIconWrap: {
      width: 42,
      height: 42,
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
      color: colors.primary,
      textAlign: "center",
    },

    // ── Facebook card ──
    fbCard: {
      backgroundColor: colors.facebook,
      borderColor: colors.facebook,
      overflow: "hidden",
    },
    fbInner: {
      flexDirection: "row",
      alignItems: "center",
      padding: tokens.space.md,
      gap: tokens.space.md,
    },
    fbIconWrap: {
      width: 40,
      height: 40,
      borderRadius: tokens.radius.md,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    fbTextBlock: { flex: 1 },
    fbTitle: { fontSize: tokens.font.md, fontWeight: "700", color: "#FFFFFF" },
    fbSub: { fontSize: tokens.font.sm, color: "rgba(255,255,255,0.7)" },

    // ── Footer ──
    footer: {
      alignItems: "center",
      paddingTop: tokens.space.xxl,
      paddingHorizontal: tokens.space.xl,
    },
    footerText: {
      fontSize: tokens.font.sm,
      color: colors.textTertiary,
      textAlign: "center",
    },
    footerSub: {
      fontSize: tokens.font.xs,
      color: colors.textTertiary,
      marginTop: 3,
      opacity: 0.7,
    },
  });

export default HomeScreen;
