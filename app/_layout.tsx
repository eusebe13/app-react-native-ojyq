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
import ActionSheet from "@/components/ActionSheet";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { NotificationTester } from "@/components/dev/NotificationTester";
import { ThemeContextProvider, useAppTheme } from "@/contexts/ThemeContext";
import { UnreadProvider } from "@/contexts/UnreadContext";
import useAuth from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useUpdateCheck } from "@/hooks/use-update-check";
import { UpdateProvider } from "@/contexts/UpdateContext";
import UpdateModal from "@/components/UpdateModal";
import AuthScreen from "./auth/auth-screen";
import { useProfile } from "@/hooks/use-profile";
import WaitingRoomScreen from "@/components/WaitingRoomScreen";

// Prevent the native splash from auto-hiding — our JS splash takes over.
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutInner() {
  const { isDark } = useAppTheme();
  const { user, isLoading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  usePushNotifications();
  useUpdateCheck();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Wait for both auth and profile to resolve before routing.
  // This prevents a brief flash of the wrong screen while Firestore loads.
  const isReady = !authLoading && (user ? !profileLoading : true);

  const renderContent = () => {
    if (!user) return <AuthScreen />;
    if (profile.role === "Visiteur") return <WaitingRoomScreen />;
    return (
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
          name="admin/release-notes"
          options={{ title: "Notes de version" }}
        />
        <Stack.Screen
          name="admin/release-note-edit"
          options={{ title: "Note de version" }}
        />
        <Stack.Screen
          name="channel/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="project/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="treasury/member-payment"
          options={{ title: "Gestion des Paiements" }}
        />
        <Stack.Screen
          name="task/[id]"
          options={{ headerShown: false }}
        />
      </Stack>
    );
  };

  return (
    <>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        {isReady && renderContent()}
        <StatusBar style={isDark ? "light" : "dark"} />
      </ThemeProvider>

      {/* Global overlays — sit above everything */}
      <Toast />
      <ActionSheet />
      <ConfirmModal />
      <UpdateModal />
      {__DEV__ && <NotificationTester />}

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
      <UpdateProvider>
        <UnreadProvider>
          <RootLayoutInner />
        </UnreadProvider>
      </UpdateProvider>
    </ThemeContextProvider>
  );
}
