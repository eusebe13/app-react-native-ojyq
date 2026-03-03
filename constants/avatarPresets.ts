/**
 * Shared preset avatar definitions.
 * Each entry maps to an icon name (MaterialCommunityIcons) + background colour.
 * The user's choice is stored in Firestore as a numeric index into this array.
 */
export const PRESET_AVATARS: { icon: string; bg: string }[] = [
    { icon: "account",        bg: "#3B82F6" },
    { icon: "star",           bg: "#F59E0B" },
    { icon: "heart",          bg: "#EF4444" },
    { icon: "lightning-bolt", bg: "#8B5CF6" },
    { icon: "soccer",         bg: "#10B981" },
    { icon: "basketball",     bg: "#F97316" },
    { icon: "music-note",     bg: "#EC4899" },
    { icon: "leaf",           bg: "#059669" },
    { icon: "fire",           bg: "#DC2626" },
    { icon: "crown",          bg: "#D97706" },
    { icon: "rocket",         bg: "#7C3AED" },
    { icon: "paw",            bg: "#0891B2" },
];
