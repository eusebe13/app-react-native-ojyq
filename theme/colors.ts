/**
 * OJYQ - Système de couleurs avec support Mode Sombre/Clair
 * 
 * Mode Sombre: Bleu marine (#0F172A, #1E3A5F)
 * Mode Clair: Bleu ciel (#87CEEB, #E0F4FF)
 */

// ═══════════════════════════════════════════════════════════════════════════
// COULEURS DE BASE
// ═══════════════════════════════════════════════════════════════════════════

export const Colors = {
  // Bleu Marine (Mode Sombre)
  navy: {
    50: '#E8EEF5',
    100: '#C5D4E8',
    200: '#9FB8DA',
    300: '#789CCC',
    400: '#5B87C1',
    500: '#3E72B6',
    600: '#3160A0',
    700: '#254D87',
    800: '#1E3A5F', // Primary dark
    900: '#0F172A', // Background dark
    950: '#080D17',
  },

  // Bleu Ciel (Mode Clair)
  sky: {
    50: '#F0F9FF',
    100: '#E0F4FF', // Background light
    200: '#BAE6FD',
    300: '#87CEEB', // Primary light
    400: '#5CBCE0',
    500: '#38BDF8',
    600: '#0EA5E9',
    700: '#0284C7',
    800: '#0369A1',
    900: '#075985',
    950: '#0C4A6E',
  },

  // Accents
  accent: {
    orange: '#FF9500',
    green: '#10B981',
    red: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    amber: '#F59E0B',
    teal: '#14B8A6',
  },

  // Neutres
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },

  // Status
  status: {
    online: '#10B981',
    offline: '#6B7280',
    busy: '#EF4444',
    away: '#F59E0B',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// THÈMES
// ═══════════════════════════════════════════════════════════════════════════

export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryTint: string;

  // Borders
  border: string;
  borderLight: string;
  borderFocus: string;

  // Events
  eventGeneral: string;
  eventShift: string;
  eventPast: string;

  // Interactive
  buttonPrimary: string;
  buttonSecondary: string;
  buttonDanger: string;

  // Status
  success: string;
  warning: string;
  error: string;
  info: string;

  // Chat specific
  messageBubble: string;
  messageBubbleOwn: string;
  messageText: string;
  messageTextOwn: string;

  // Overlay
  overlay: string;
  modalBackground: string;
}

export const LightTheme: ThemeColors = {
  // Backgrounds - Bleu ciel
  background: Colors.sky[100],
  backgroundSecondary: Colors.sky[50],
  surface: Colors.neutral.white,
  surfaceElevated: Colors.neutral.white,

  // Text
  textPrimary: Colors.navy[900],
  textSecondary: Colors.navy[600],
  textTertiary: Colors.neutral.gray[500],
  textInverse: Colors.neutral.white,

  // Brand - Bleu ciel
  primary: Colors.sky[600],
  primaryLight: Colors.sky[400],
  primaryDark: Colors.sky[700],
  primaryTint: Colors.sky[100],

  // Borders
  border: Colors.sky[200],
  borderLight: Colors.sky[100],
  borderFocus: Colors.sky[500],

  // Events
  eventGeneral: Colors.sky[600],
  eventShift: Colors.accent.orange,
  eventPast: Colors.neutral.gray[400],

  // Interactive
  buttonPrimary: Colors.sky[600],
  buttonSecondary: Colors.sky[100],
  buttonDanger: Colors.accent.red,

  // Status
  success: Colors.accent.green,
  warning: Colors.accent.amber,
  error: Colors.accent.red,
  info: Colors.sky[500],

  // Chat
  messageBubble: Colors.neutral.gray[100],
  messageBubbleOwn: Colors.sky[500],
  messageText: Colors.navy[900],
  messageTextOwn: Colors.neutral.white,

  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)',
  modalBackground: Colors.neutral.white,
};

export const DarkTheme: ThemeColors = {
  // Backgrounds - Bleu marine
  background: Colors.navy[900],
  backgroundSecondary: Colors.navy[950],
  surface: Colors.navy[800],
  surfaceElevated: Colors.navy[700],

  // Text
  textPrimary: Colors.neutral.white,
  textSecondary: Colors.sky[200],
  textTertiary: Colors.neutral.gray[400],
  textInverse: Colors.navy[900],

  // Brand - Bleu ciel sur fond sombre
  primary: Colors.sky[400],
  primaryLight: Colors.sky[300],
  primaryDark: Colors.sky[500],
  primaryTint: 'rgba(56, 189, 248, 0.15)',

  // Borders
  border: Colors.navy[600],
  borderLight: Colors.navy[700],
  borderFocus: Colors.sky[400],

  // Events
  eventGeneral: Colors.sky[400],
  eventShift: Colors.accent.orange,
  eventPast: Colors.neutral.gray[600],

  // Interactive
  buttonPrimary: Colors.sky[500],
  buttonSecondary: Colors.navy[700],
  buttonDanger: Colors.accent.red,

  // Status
  success: Colors.accent.green,
  warning: Colors.accent.amber,
  error: Colors.accent.red,
  info: Colors.sky[400],

  // Chat
  messageBubble: Colors.navy[700],
  messageBubbleOwn: Colors.sky[600],
  messageText: Colors.neutral.white,
  messageTextOwn: Colors.neutral.white,

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: Colors.navy[800],
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const getTheme = (isDark: boolean): ThemeColors => {
  return isDark ? DarkTheme : LightTheme;
};

/**
 * Ajoute de l'opacité à une couleur hex
 */
export const withOpacity = (color: string, opacity: number): string => {
  const hex = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `${color}${hex}`;
};
