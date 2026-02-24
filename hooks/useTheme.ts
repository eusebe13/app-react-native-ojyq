/**
 * OJYQ - Hook de thème
 * 
 * Gère le mode sombre/clair et retourne les couleurs appropriées.
 */

import { useMemo } from 'react';
import { useColorScheme } from './use-color-scheme';
import { getTheme, ThemeColors, DarkTheme, LightTheme } from '../theme/colors';

export interface UseThemeReturn {
  isDark: boolean;
  colors: ThemeColors;
  theme: 'dark' | 'light';
}

export const useTheme = (): UseThemeReturn => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = useMemo(() => getTheme(isDark), [isDark]);

  return {
    isDark,
    colors,
    theme: isDark ? 'dark' : 'light',
  };
};

export { DarkTheme, LightTheme };
export type { ThemeColors };
