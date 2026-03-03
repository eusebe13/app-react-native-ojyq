import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { ThemeContextProvider, useAppTheme } from "@/contexts/ThemeContext";
import useAuth from "@/hooks/use-auth";
import AuthScreen from "./auth/auth-screen";

export const unstable_settings = {
    anchor: "(tabs)",
};

function RootLayoutInner() {
    const { isDark } = useAppTheme();
    const { user } = useAuth();

    if (!user) {
        return <AuthScreen />;
    }

    return (
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
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
            </Stack>
            <StatusBar style={isDark ? "light" : "dark"} />
        </ThemeProvider>
    );
}

export default function RootLayout() {
    return (
        <ThemeContextProvider>
            <RootLayoutInner />
        </ThemeContextProvider>
    );
}
