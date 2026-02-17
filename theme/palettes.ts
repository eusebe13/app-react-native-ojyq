/**
 * Design Tokens — Color Palette Options
 * 
 * Pick one palette and replace the colors in tokens.ts file.
 */

// ═══════════════════════════════════════════════════════════════════════════
// PALETTE 1: Warm Sunset (Coral + Peach)
// Energetic, friendly, approachable — Great for community/social apps
// ═══════════════════════════════════════════════════════════════════════════
export const PALETTE_SUNSET = {
    colors: {
        // Brand
        primary: "#FF6B6B",       // coral red
        primaryLight: "#FF8787",  // light coral
        primaryDark: "#EE5A52",   // deep coral
        primaryTint: "#FFE8E8",   // coral tint

        // Accent palette
        accent1: "#FFA07A",       // light salmon
        accent2: "#20B2AA",       // light sea green
        accent3: "#FFD93D",       // golden yellow
        accent4: "#C77DFF",       // medium purple
        accent5: "#06D6A0",       // caribbean green
        accent6: "#FF8C42",       // orange

        // Neutrals
        surface: "#FFFFFF",
        surfaceDim: "#FFF9F5",    // warm white
        border: "#F4E4D7",        // warm gray
        borderLight: "#FAF0E6",   // linen

        // Text
        textPrimary: "#2D1B1B",   // dark brown
        textSecondary: "#8B7355",  // warm gray
        textTertiary: "#B4A089",  // light warm gray

        // Status
        online: "#06D6A0",
        facebook: "#1877F2",
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// PALETTE 2: Cool Ocean (Teal + Deep Blue)
// Professional, trustworthy, calming
// ═══════════════════════════════════════════════════════════════════════════
export const PALETTE_OCEAN = {
    colors: {
        // Brand
        primary: "#0EA5E9",       // sky blue
        primaryLight: "#38BDF8",  // light sky
        primaryDark: "#0284C7",   // deep sky
        primaryTint: "#E0F2FE",   // sky tint

        // Accent palette
        accent1: "#EC4899",       // pink
        accent2: "#14B8A6",       // teal
        accent3: "#FBBF24",       // amber
        accent4: "#8B5CF6",       // violet
        accent5: "#10B981",       // emerald
        accent6: "#F97316",       // orange

        // Neutrals
        surface: "#FFFFFF",
        surfaceDim: "#F0F9FF",    // blue tint white
        border: "#E0F2FE",        // light blue
        borderLight: "#F0F9FF",   // sky 50

        // Text
        textPrimary: "#0C4A6E",   // dark blue
        textSecondary: "#64748B", // slate 500
        textTertiary: "#94A3B8",  // slate 400

        // Status
        online: "#10B981",
        facebook: "#1877F2",
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// PALETTE 3: Forest Green (Emerald + Earth Tones)
// Natural, grounded, sustainable
// ═══════════════════════════════════════════════════════════════════════════
export const PALETTE_FOREST = {
    colors: {
        // Brand
        primary: "#059669",       // emerald 600
        primaryLight: "#10B981",  // emerald 500
        primaryDark: "#047857",   // emerald 700
        primaryTint: "#D1FAE5",   // emerald 100

        // Accent palette
        accent1: "#F59E0B",       // amber
        accent2: "#06B6D4",       // cyan
        accent3: "#FBBF24",       // yellow
        accent4: "#8B5CF6",       // violet
        accent5: "#14B8A6",       // teal
        accent6: "#EF4444",       // red

        // Neutrals
        surface: "#FFFFFF",
        surfaceDim: "#F7FEF9",    // green tint
        border: "#D1D5DB",        // gray 300
        borderLight: "#E5E7EB",   // gray 200

        // Text
        textPrimary: "#1F2937",   // gray 800
        textSecondary: "#6B7280", // gray 500
        textTertiary: "#9CA3AF",  // gray 400

        // Status
        online: "#10B981",
        facebook: "#1877F2",
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// PALETTE 4: Vibrant Energy (Purple + Pink Gradient)
// Bold, creative, youthful
// ═══════════════════════════════════════════════════════════════════════════
export const PALETTE_ENERGY = {
    colors: {
        // Brand
        primary: "#A855F7",       // purple 500
        primaryLight: "#C084FC",  // purple 400
        primaryDark: "#9333EA",   // purple 600
        primaryTint: "#F3E8FF",   // purple 100

        // Accent palette
        accent1: "#EC4899",       // pink
        accent2: "#06B6D4",       // cyan
        accent3: "#FBBF24",       // amber
        accent4: "#F43F5E",       // rose
        accent5: "#10B981",       // emerald
        accent6: "#F97316",       // orange

        // Neutrals
        surface: "#FFFFFF",
        surfaceDim: "#FAF5FF",    // purple tint
        border: "#E9D5FF",        // purple 200
        borderLight: "#F3E8FF",   // purple 100

        // Text
        textPrimary: "#1F2937",   // gray 800
        textSecondary: "#6B7280", // gray 500
        textTertiary: "#9CA3AF",  // gray 400

        // Status
        online: "#10B981",
        facebook: "#1877F2",
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// PALETTE 5: Monochrome Elegance (Black + White + Gray)
// Minimal, sophisticated, timeless
// ═══════════════════════════════════════════════════════════════════════════
export const PALETTE_MONO = {
    colors: {
        // Brand
        primary: "#18181B",       // zinc 900
        primaryLight: "#3F3F46",  // zinc 700
        primaryDark: "#09090B",   // zinc 950
        primaryTint: "#F4F4F5",   // zinc 100

        // Accent palette (subtle colored accents)
        accent1: "#EF4444",       // red
        accent2: "#3B82F6",       // blue
        accent3: "#F59E0B",       // amber
        accent4: "#8B5CF6",       // violet
        accent5: "#10B981",       // emerald
        accent6: "#F97316",       // orange

        // Neutrals
        surface: "#FFFFFF",
        surfaceDim: "#FAFAFA",    // neutral 50
        border: "#E4E4E7",        // zinc 200
        borderLight: "#F4F4F5",   // zinc 100

        // Text
        textPrimary: "#18181B",   // zinc 900
        textSecondary: "#71717A", // zinc 500
        textTertiary: "#A1A1AA",  // zinc 400

        // Status
        online: "#10B981",
        facebook: "#1877F2",
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// PALETTE 6: Night Mode (Deep Blue + Neon)
// Modern, tech-forward, gaming-inspired
// ═══════════════════════════════════════════════════════════════════════════
export const PALETTE_NIGHT = {
    colors: {
        // Brand
        primary: "#3B82F6",       // blue 500
        primaryLight: "#60A5FA",  // blue 400
        primaryDark: "#2563EB",   // blue 600
        primaryTint: "#DBEAFE",   // blue 100

        // Accent palette (neon-inspired)
        accent1: "#F472B6",       // pink 400
        accent2: "#2DD4BF",       // teal 400
        accent3: "#FCD34D",       // amber 300
        accent4: "#A78BFA",       // violet 400
        accent5: "#34D399",       // emerald 400
        accent6: "#FB923C",       // orange 400

        // Neutrals
        surface: "#FFFFFF",
        surfaceDim: "#EFF6FF",    // blue 50
        border: "#BFDBFE",        // blue 200
        borderLight: "#DBEAFE",   // blue 100

        // Text
        textPrimary: "#1E3A8A",   // blue 900
        textSecondary: "#64748B", // slate 500
        textTertiary: "#94A3B8",  // slate 400

        // Status
        online: "#34D399",
        facebook: "#1877F2",
    },

};

// ═══════════════════════════════════════════════════════════════════════════
// PALETTE 7: Dark Blue (Navy + Gold Accents)
// Professional, authoritative, premium 
// ═══════════════════════════════════════════════════════════════════════════
export const PALETTE_DARK_BLUE = {
    colors: {
        // Brand
        primary: "#14389cff",       // blue 900 (deep navy)
        primaryLight: "#3B82F6",  // blue 500
        primaryDark: "#1E40AF",   // blue 800
        primaryTint: "#DBEAFE",   // blue 100

        // Accent palette (sophisticated accents)
        accent1: "#F59E0B",       // amber (gold accent)
        accent2: "#06B6D4",       // cyan
        accent3: "#FBBF24",       // yellow
        accent4: "#8B5CF6",       // violet
        accent5: "#10B981",       // emerald
        accent6: "#EF4444",       // red

        // Neutrals
        surface: "#FFFFFF",
        surfaceDim: "#F8FAFC",    // slate 50
        border: "#CBD5E1",        // slate 300
        borderLight: "#E2E8F0",   // slate 200

        // Text
        textPrimary: "#0F172A",   // slate 900
        textSecondary: "#475569", // slate 600
        textTertiary: "#64748B",  // slate 500

        // Status
        online: "#10B981",
        facebook: "#1877F2",
    },
}

