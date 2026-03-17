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
import { useAppTheme } from "@/contexts/ThemeContext";

export default function TabLayout() {
  const { colors, isDark } = useAppTheme();

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
