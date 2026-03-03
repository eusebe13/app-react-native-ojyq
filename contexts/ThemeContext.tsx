/**
 * ThemeContext — app-level dark mode toggle with dynamic tokens
 *
 * Usage:
 *   const { isDark, toggleTheme, colors, tokens } = useAppTheme();
 *
 * Wrap the root layout with <ThemeContextProvider>.
 * The preference is persisted in AsyncStorage so it survives app restarts.
 */

import { getThemeTokens } from "@/theme/tokens";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "app_dark_mode";

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => Promise<void>;
  setDark: (value: boolean) => Promise<void>;
  colors: ReturnType<typeof getThemeTokens>["colors"];
  tokens: ReturnType<typeof getThemeTokens>;
}

const defaultTokens = getThemeTokens(false);

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: async () => {},
  setDark: async () => {},
  colors: defaultTokens.colors,
  tokens: defaultTokens,
});

export function ThemeContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDark, setIsDark] = useState(false);

  // Restore saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "true") setIsDark(true);
    });
  }, []);

  const setDark = async (value: boolean) => {
    setIsDark(value);
    await AsyncStorage.setItem(STORAGE_KEY, String(value));
  };

  const toggleTheme = async () => setDark(!isDark);

  const tokens = getThemeTokens(isDark);

  return (
    <ThemeContext.Provider
      value={{ isDark, toggleTheme, setDark, colors: tokens.colors, tokens }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
