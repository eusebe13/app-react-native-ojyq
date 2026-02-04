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

import { router } from "expo-router";
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
import { T } from "../../theme/tokens";

const HomeScreen = () => {
  const [selectedDay, setSelectedDay] = useState("Lun");

  const todayEvents = SCHEDULE_DATA.filter((e) => e.day === selectedDay);
  const daysWithEvents = new Set(SCHEDULE_DATA.map((e) => e.day));

  // BACKEND: Replace with navigation.navigate("Chat", { chatId })
  const openChat = (id: string) => {
    router.push(`/chat/${id}`);
  };

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
          {/* Decorative blobs */}
          <View style={styles.blob1} />
          {/* <View style={styles.blob2} /> */}

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
              {/* <TouchableOpacity style={styles.headerNotifBtn}>
                <Icon name="bell-outline" size={22} color="#FFFFFF" />
                <Badge dot color="#EC4899" size="sm" />
              </TouchableOpacity> */}
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
        {/* HORAIRE (SCHEDULE)                                                */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader
            icon="calendar-check-outline"
            title="Horaire"
            onViewAll={() => router.push(`/calendar`)}
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
                    <Badge dot color={T.colors.primary} size="sm" />
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
                    color={T.colors.textTertiary}
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
                          {/* <Badge dot color={T.colors.online} size="sm" /> */}
                          <Text style={styles.eventNowText}>En cours</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.eventTitle}>{ev.title}</Text>
                    <View style={styles.eventLocationRow}>
                      <Icon
                        name="map-marker-outline"
                        size={13}
                        color={T.colors.textTertiary}
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
            onViewAll={() => router.push(`/chat`)}
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
                      color={T.colors.textTertiary}
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
                    <Icon name={doc.icon} size={20} color={T.colors.primary} />
                  </View>
                  <Text style={styles.docTitle} numberOfLines={1}>
                    {doc.title}
                  </Text>
                  <Icon
                    name="open-in-new"
                    size={16}
                    color={T.colors.textTertiary}
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
              tintColor={T.colors.primary}
              style={styles.contactCard}
              onPress={() => Linking.openURL("mailto:info@ojyq.org")}
            >
              <View style={styles.contactIconWrap}>
                <Icon name="email-outline" size={22} color={T.colors.primary} />
              </View>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>info@ojyq.org</Text>
            </Card>

            <Card
              variant="tinted"
              tintColor={T.colors.accent2}
              style={styles.contactCard}
              onPress={() => Linking.openURL("tel:+14386224435")}
            >
              <View
                style={[
                  styles.contactIconWrap,
                  { backgroundColor: T.colors.accent2 + "12" },
                ]}
              >
                <Icon name="phone-outline" size={22} color={T.colors.accent2} />
              </View>
              <Text style={styles.contactLabel}>Téléphone</Text>
              <Text style={[styles.contactValue, { color: T.colors.accent2 }]}>
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
const styles = StyleSheet.create({
  // ── Screen ──
  screen: { flex: 1, backgroundColor: T.colors.surfaceDim },
  screenContent: { paddingBottom: 48 },

  // ── Gradient Header ──
  headerGradient: {
    backgroundColor: T.colors.primaryDark,
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
    backgroundColor: T.colors.primaryLight,
    opacity: 0.25,
  },
  blob2: {
    position: "absolute",
    bottom: -30,
    left: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: T.colors.accent1,
    opacity: 0.12,
  },
  headerInner: {
    paddingHorizontal: T.space.xl,
    position: "relative",
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.md,
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
    fontSize: T.font.sm,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  headerOrgBold: {
    fontSize: T.font.md,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerNotifBtn: { position: "relative", padding: 6 },
  headerBadgeRow: { marginTop: T.space.md },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: T.radius.pill,
    alignSelf: "flex-start",
  },
  headerBadgeText: {
    fontSize: T.font.xs,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  // ── Section shared ──
  section: { paddingHorizontal: T.space.xl, marginTop: T.space.xxl },

  // ── Day pills ──
  dayScroll: {
    marginBottom: T.space.md,
    marginHorizontal: -T.space.xl,
    paddingHorizontal: T.space.xl,
  },
  dayPill: {
    alignItems: "center",
    backgroundColor: T.colors.surface,
    borderWidth: 1,
    borderColor: T.colors.border,
    borderRadius: T.radius.lg,
    paddingHorizontal: T.space.md,
    paddingVertical: T.space.sm,
    minWidth: 54,
    gap: 2,
    marginRight: T.space.sm,
  },
  dayPill_active: {
    backgroundColor: T.colors.primary,
    borderColor: T.colors.primary,
    shadowColor: T.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dayPill_label: {
    fontSize: T.font.sm,
    fontWeight: "600",
    color: T.colors.textSecondary,
  },
  dayPill_label_active: { color: "#FFFFFF" },
  dayPill_date: {
    fontSize: T.font.lg,
    fontWeight: "700",
    color: T.colors.textPrimary,
  },
  dayPill_date_active: { color: "#FFFFFF" },

  // ── Events ──
  eventList: { gap: T.space.sm },
  eventCard: { flexDirection: "row", overflow: "hidden", minHeight: 72 },
  eventStripe: { width: 4, minHeight: 72 },
  eventBody: { flex: 1, padding: T.space.md, justifyContent: "center" },
  eventTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.xs,
    marginBottom: 3,
  },
  eventTime: { fontSize: T.font.sm, fontWeight: "700" },
  eventNowBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  eventNowText: {
    fontSize: T.font.sm,
    fontWeight: "600",
    color: T.colors.online,
    marginRight: T.space.sm,
  },
  eventTitle: {
    fontSize: T.font.md,
    fontWeight: "600",
    color: T.colors.textPrimary,
    marginBottom: 3,
  },
  eventLocationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  eventLocation: { fontSize: T.font.sm, color: T.colors.textTertiary },

  // ── Empty ──
  emptyWrap: { alignItems: "center", gap: T.space.sm, padding: T.space.xl },
  emptyText: {
    fontSize: T.font.base,
    color: T.colors.textTertiary,
    fontStyle: "italic",
  },

  // ── Chat list ──
  chatListCard: { overflow: "hidden" },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: T.space.md,
    gap: T.space.md,
  },
  chatMeta: { flex: 1, minWidth: 0 },
  chatMetaTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  chatName: {
    fontSize: T.font.base,
    fontWeight: "500",
    color: T.colors.textSecondary,
  },
  chatName_bold: { color: T.colors.textPrimary, fontWeight: "700" },
  chatTime: {
    fontSize: T.font.xs,
    color: T.colors.textTertiary,
    flexShrink: 0,
  },
  chatPreview: { fontSize: T.font.sm, color: T.colors.textTertiary },
  chatPreview_bold: { color: T.colors.textSecondary, fontWeight: "500" },
  chatDivider: {
    height: 1,
    backgroundColor: T.colors.borderLight,
    marginLeft: 60,
  },

  // ── Documents list ──
  docListCard: { overflow: "hidden" },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: T.space.md,
    gap: T.space.md,
  },
  docIconWrap: {
    width: 38,
    height: 38,
    borderRadius: T.radius.md,
    backgroundColor: T.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: {
    flex: 1,
    fontSize: T.font.base,
    fontWeight: "500",
    color: T.colors.textPrimary,
  },

  // ── Contact ──
  contactRow: {
    flexDirection: "row",
    gap: T.space.sm,
    marginBottom: T.space.sm,
  },
  contactCard: { flex: 1, padding: T.space.md, alignItems: "center", gap: 6 },
  contactIconWrap: {
    width: 42,
    height: 42,
    borderRadius: T.radius.md,
    backgroundColor: T.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  contactLabel: {
    fontSize: T.font.xs,
    fontWeight: "600",
    color: T.colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contactValue: {
    fontSize: T.font.sm,
    fontWeight: "600",
    color: T.colors.primary,
    textAlign: "center",
  },

  // ── Facebook card ──
  fbCard: {
    backgroundColor: T.colors.facebook,
    borderColor: T.colors.facebook,
    overflow: "hidden",
  },
  fbInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: T.space.md,
    gap: T.space.md,
  },
  fbIconWrap: {
    width: 40,
    height: 40,
    borderRadius: T.radius.md,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  fbTextBlock: { flex: 1 },
  fbTitle: { fontSize: T.font.md, fontWeight: "700", color: "#FFFFFF" },
  fbSub: { fontSize: T.font.sm, color: "rgba(255,255,255,0.7)" },

  // ── Footer ──
  footer: {
    alignItems: "center",
    paddingTop: T.space.xxl,
    paddingHorizontal: T.space.xl,
  },
  footerText: {
    fontSize: T.font.sm,
    color: T.colors.textTertiary,
    textAlign: "center",
  },
  footerSub: {
    fontSize: T.font.xs,
    color: T.colors.textTertiary,
    marginTop: 3,
    opacity: 0.7,
  },
});

export default HomeScreen;
