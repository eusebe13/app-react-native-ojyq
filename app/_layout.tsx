import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";

import AppSplashScreen from "@/components/AppSplashScreen";
import { ThemeContextProvider, useAppTheme } from "@/contexts/ThemeContext";
import useAuth from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import AuthScreen from "./auth/auth-screen";

// Prevent the native splash from auto-hiding — our JS splash takes over.
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutInner() {
  const { isDark } = useAppTheme();
  const { user, isLoading: authLoading } = useAuth();
  usePushNotifications();
  const [splashDone, setSplashDone] = useState(false);

  // Dismiss the native splash as soon as JS is running.
  // The AppSplashScreen overlay (same background colour) covers the
  // transition so there is no visible gap.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Once Firebase has resolved the auth state, the overlay will animate out.
  const isReady = !authLoading;

  return (
    <>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        {/* Render app content only after auth is known */}
        {isReady &&
          (user ? (
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
              <Stack.Screen
                name="account/edit"
                options={{ title: "Informations Personnelles" }}
              />
              <Stack.Screen
                name="account/security"
                options={{ title: "Sécurité" }}
              />
              <Stack.Screen
                name="account/settings"
                options={{ title: "Paramètres" }}
              />
              <Stack.Screen
                name="account/payment"
                options={{ title: "Paiement" }}
              />
              <Stack.Screen
                name="admin/members"
                options={{ title: "Membres" }}
              />
              <Stack.Screen
                name="admin/member-edit"
                options={{ title: "Modifier le membre" }}
              />
              <Stack.Screen
                name="channel/[id]"
                options={({ route }) => ({
                  title: route.params?.name || "Canal",
                })}
              />
              <Stack.Screen
                name="treasury/member-payment"
                options={{ title: "Gestion des Paiements" }}
              />
            </Stack>
          ) : (
            <AuthScreen />
          ))}
        <StatusBar style={isDark ? "light" : "dark"} />
      </ThemeProvider>

      {/* Animated JS splash — sits on top until isReady, then fades out */}
      {!splashDone && (
        <AppSplashScreen
          isReady={isReady}
          onAnimationEnd={() => setSplashDone(true)}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeContextProvider>
      <RootLayoutInner />
    </ThemeContextProvider>
  );
}
