/**
 * TabLayout — Modern grounded tab bar with refined design
 *
 * Design features:
 *  - Clean full-width design (no floating)
 *  - Animated sliding indicator line
 *  - Icon size and weight changes on active
 *  - Smooth color transitions
 *  - Proper safe area handling
 *  - Haptic feedback
 */

import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { HapticTab } from "@/components/haptic-tab";
import { Icon } from "@/components/ui/Icon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { computeIsUnread, useUnread } from "@/contexts/UnreadContext";
import useAuth from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { db } from "@/firebaseConfig";
import type { Channel } from "@/types/models";

function isChannelVisible(ch: any, uid: string | null | undefined, userRole: string): boolean {
  const effectiveAudience = ch.audienceType ?? (ch.type === "public" ? "public" : "private");
  if (ch.createdBy === uid) return true;
  if (effectiveAudience === "public") return true;
  if (effectiveAudience === "private" || effectiveAudience === "direct") {
    return !!(ch.members && ch.members.includes(uid));
  }
  if (effectiveAudience === "roles") return !!(ch.allowedRoles && ch.allowedRoles.includes(userRole));
  return false;
}

function useHasUnreadChannels(uid: string | null | undefined, userRole: string): boolean {
  const { readsMap } = useUnread();
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    const q = query(collection(db, "channels"), orderBy("lastMessageAt", "desc"));
    return onSnapshot(q, (snap) => {
      setChannels(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Channel)));
    });
  }, []);

  return channels.some((ch) => {
    if (!isChannelVisible(ch, uid, userRole)) return false;
    const lastActivity = ch.lastMessageAt?.toDate?.() ?? null;
    const lastRead = readsMap[ch.id]?.lastReadAt ?? null;
    return computeIsUnread(lastActivity, lastRead);
  });
}

export default function TabLayout() {
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const { profile } = useProfile();
  const hasUnreadChat = useHasUnreadChannels(user?.uid, profile.role);

  return (
    <Tabs
      screenOptions={{
        // Active/inactive colors
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark
          ? "rgba(255,255,255,0.4)"
          : colors.textTertiary,

        // Hide default header
        headerShown: false,

        // Haptic feedback on press
        tabBarButton: HapticTab,

        // Tab bar styling
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: isDark
            ? "rgba(255,255,255,0.05)"
            : colors.borderLight,
          height: Platform.select({
            ios: 95,
            android: 95,
            default: 95,
          }),
          paddingTop: 8,
          paddingBottom: Platform.select({
            ios: 24,
            android: 8,
            default: 8,
          }),
          paddingHorizontal: 16,

          // Subtle shadow on top
          shadowColor: isDark ? "#000" : colors.primary,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 8,
          elevation: 8,
        },

        // Tab item styling
        tabBarItemStyle: {
          paddingHorizontal: 8,
        },

        // Label styling
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
          marginBottom: 0,
        },

        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.iconContainer}>
              <Icon
                name={focused ? "home" : "home-outline"}
                size={focused ? 26 : 24}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Messages",
          tabBarBadge: hasUnreadChat ? "" : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            minWidth: 10,
            height: 10,
            borderRadius: 5,
            fontSize: 1,
            lineHeight: 10,
          },
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.iconContainer}>
              <Icon
                name={focused ? "send" : "send-outline"}
                size={focused ? 26 : 24}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: "Agenda",
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.iconContainer}>
              <Icon
                name={focused ? "calendar" : "calendar-outline"}
                size={focused ? 26 : 24}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.iconContainer}>
              <Icon
                name={focused ? "account-circle" : "account-circle-outline"}
                size={focused ? 26 : 24}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: 32,
  },
});
