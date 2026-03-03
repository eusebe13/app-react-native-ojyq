/**
 * Design Tokens — Single source of truth for all design values
 * 
 * Update colors, spacing, or typography here and changes propagate
 * throughout the entire app.
 * 
 * TO CHANGE PALETTE:
 * 1. Uncomment your favorite palette pair below
 * 2. The theme will automatically switch between light and dark versions
 */

import {
    PALETTE_DARK_BLUE,
    PALETTE_DARK_BLUE_DARK,
} from "./palettes";

// ═══════════════════════════════════════════════════════════════════════════
// PICK YOUR PALETTE (uncomment one pair)
// ═══════════════════════════════════════════════════════════════════════════

// Light & Dark Mode Palette Pairs
// const LIGHT_PALETTE = PALETTE_SUNSET;
// const DARK_PALETTE = PALETTE_SUNSET_DARK;

// const LIGHT_PALETTE = PALETTE_OCEAN;
// const DARK_PALETTE = PALETTE_OCEAN_DARK;

// const LIGHT_PALETTE = PALETTE_FOREST;
// const DARK_PALETTE = PALETTE_FOREST_DARK;

// const LIGHT_PALETTE = PALETTE_ENERGY;
// const DARK_PALETTE = PALETTE_ENERGY_DARK;

// const LIGHT_PALETTE = PALETTE_MONO;
// const DARK_PALETTE = PALETTE_MONO_DARK;

// const LIGHT_PALETTE = PALETTE_NIGHT;
// const DARK_PALETTE = PALETTE_NIGHT_DARK;

const LIGHT_PALETTE = PALETTE_DARK_BLUE;        // Light mode (navy + gold)
const DARK_PALETTE = PALETTE_DARK_BLUE_DARK;    // Dark mode

// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get theme tokens based on dark mode setting
 * This function should be called from ThemeContext
 */
export function getThemeTokens(isDark: boolean) {
    const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;

    return {
        colors: palette.colors,

        // Spacing scale (4-base)
        space: {
            xs: 4,
            sm: 8,
            md: 12,
            lg: 16,
            xl: 20,
            xxl: 28,
            xxxl: 36,
        },

        // Border radius
        radius: {
            sm: 8,
            md: 12,
            lg: 16,
            xl: 20,
            pill: 100,
        },

        // Font sizes
        font: {
            xs: 10,
            sm: 12,
            base: 14,
            md: 15,
            lg: 17,
            xl: 20,
            xxl: 24,
            xxxl: 28,
        },
    };
}

/**
 * Default export for light mode (fallback)
 */
export const T = getThemeTokens(false);