/**
 * Type definitions for OJYQ app data models
 * 
 * Ce fichier re-exporte les types du module models.ts
 * et définit les types locaux pour la compatibilité.
 */

// Re-export tous les types du module models
export * from './models';

// Types legacy pour compatibilité avec le code existant
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