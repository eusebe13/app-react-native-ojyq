/**
 * Type definitions for OJYQ app data models
 */

export interface ScheduleEvent {
    id: string;
    day: string;
    date: string;
    title: string;
    time: string;
    location?: string;
    color: string;
    isNow?: boolean;
}

export interface Chat {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    unread: number;
    isGroup: boolean;
    isOnline: boolean;
}

export interface Document {
    id: string;
    icon: string;
    title: string;
    url: string;
}

export interface DayOption {
    key: string;
    label: string;
    date: string;
}

// ─── User Profile ──────────────────────────────────────────────────────────

export type UserRole =
    | 'Membre'
    | 'Vice-Président'
    | 'Président'
    | 'Secrétaire'
    | 'Trésorier'
    | 'Administrateur';

export type UserStatus = 'Actif' | 'Pause' | 'Visite' | 'Arrêt';

export type Gender = 'H' | 'F' | 'Autre';

export type Language = 'Français' | 'Anglais' | 'Kiswahili' | 'Kinande';

export interface UserProfile {
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    birthDate: Date | null;
    postalCode: string;
    phoneNumber: string;
    gender: Gender | null;
    languages: Language[];
    darkMode: boolean;
    notifAgenda: boolean;
    notifMessages: boolean;
    avatarUrl?: string;
    avatarPreset?: number | null;
}