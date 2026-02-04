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
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { Icon } from "@/components/ui/Icon";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { T } from "@/theme/tokens";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        // Active/inactive colors
        tabBarActiveTintColor: T.colors.primary,
        tabBarInactiveTintColor: isDark
          ? "rgba(255,255,255,0.4)"
          : T.colors.textTertiary,

        // Hide default header
        headerShown: false,

        // Haptic feedback on press
        tabBarButton: HapticTab,

        // Tab bar styling
        tabBarStyle: {
          backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: isDark
            ? "rgba(255,255,255,0.05)"
            : T.colors.borderLight,
          height: Platform.select({
            ios: 95, // Accounts for home indicator
            android: 95,
            default: 95,
          }),
          paddingTop: 8,
          paddingBottom: Platform.select({
            ios: 24, // iOS safe area
            android: 8,
            default: 8,
          }),
          paddingHorizontal: 16,

          // Subtle shadow on top
          shadowColor: isDark ? "#000" : T.colors.primary,
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

        // Show labels  (not just on active)
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
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.iconContainer}>
              <Icon
                name={focused ? "send" : "send-outline"}
                size={focused ? 26 : 24}
                color={color}
              />
            </View>
          ),
          // // Badge for unread messages
          // tabBarBadge: 3,
          // tabBarBadgeStyle: {
          //   backgroundColor: T.colors.accent1,
          //   color: "#FFFFFF",
          //   fontSize: 10,
          //   fontWeight: "700",
          //   minWidth: 18,
          //   height: 18,
          //   borderRadius: 9,
          //   marginTop: 2,
          // },
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

      {/* Hide old explore tab if it exists
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      /> */}
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
