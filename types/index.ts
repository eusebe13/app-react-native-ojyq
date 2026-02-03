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