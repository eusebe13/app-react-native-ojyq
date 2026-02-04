/**
 * Design Tokens — Single source of truth for all design values
 * 
 * Update colors, spacing, or typography here and changes propagate
 * throughout the entire app.
 * 
 * TO CHANGE PALETTE:
 * 1. Open palettes.ts
 * 2. Pick your favorite (SUNSET, OCEAN, FOREST, ENERGY, MONO, NIGHT, DARK_BLUE)
 * 3. Replace the colors import below
 */

import { PALETTE_DARK_BLUE } from "./palettes";



// ═══════════════════════════════════════════════════════════════════════════
// PICK YOUR PALETTE (uncomment one)
// ═══════════════════════════════════════════════════════════════════════════

// const ACTIVE_PALETTE = PALETTE_SUNSET;   // Warm, friendly, energetic
// const ACTIVE_PALETTE = PALETTE_OCEAN;    //  Professional, trustworthy
// const ACTIVE_PALETTE = PALETTE_FOREST;   //  Natural, grounded
// const ACTIVE_PALETTE = PALETTE_ENERGY;   // Bold, creative, youthful (CURRENT)
// const ACTIVE_PALETTE = PALETTE_MONO;     // Minimal, sophisticated
// const ACTIVE_PALETTE = PALETTE_NIGHT;    // Modern, tech-forward
const ACTIVE_PALETTE = PALETTE_DARK_BLUE;  // Professional, authoritative, premium


// ═══════════════════════════════════════════════════════════════════════════

export const T = {
    colors: ACTIVE_PALETTE.colors,

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