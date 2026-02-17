/**
 * Mock Data — Replace with API hooks
 * 
 * BACKEND INTEGRATION:
 *   - SCHEDULE → GET /api/schedule/week?userId=X
 *   - CHATS    → GET /api/chats?limit=6&sort=lastMessage
 * 
 * TODO: Create custom hooks:
 *   - useSchedule() → fetches and caches schedule data
 *   - useChats()    → fetches chats with WebSocket for real-time updates
 */

import { T } from "../theme/tokens";
import { Chat, DayOption, Document, ScheduleEvent } from "../types";

export const SCHEDULE_DATA: ScheduleEvent[] = [
    {
        id: "1",
        day: "Lun",
        date: "3",
        title: "Réunion équipe",
        time: "10h00",
        location: "Salle A",
        color: T.colors.primary,
        isNow: true,
    },
    {
        id: "2",
        day: "Lun",
        date: "3",
        title: "Formation RH",
        time: "14h00",
        location: "En ligne",
        color: T.colors.accent4,
        isNow: false,
    },
    {
        id: "3",
        day: "Mar",
        date: "4",
        title: "Atelier créatif",
        time: "09h00",
        location: "Studio B",
        color: T.colors.accent1,
        isNow: false,
    },
    {
        id: "4",
        day: "Mer",
        date: "5",
        title: "Suivi budget",
        time: "11h00",
        location: "Salle C",
        color: T.colors.accent2,
        isNow: false,
    },
    {
        id: "5",
        day: "Jeu",
        date: "6",
        title: "Plénière OJYQ",
        time: "15h00",
        location: "Auditorium",
        color: T.colors.accent3,
        isNow: false,
    },
    {
        id: "6",
        day: "Ven",
        date: "7",
        title: "Revue hebdo",
        time: "16h00",
        location: "Salle A",
        color: T.colors.accent5,
        isNow: false,
    },
];

export const CHATS_DATA: Chat[] = [
    {
        id: "c1",
        name: "Équipe Organisation",
        lastMessage: "On se retrouve demain à 10h !",
        time: "À l'instant",
        unread: 3,
        isGroup: true,
        isOnline: true,
    },
    {
        id: "c2",
        name: "Marie Dubois",
        lastMessage: "Merci pour le document envoyé.",
        time: "5 min",
        unread: 0,
        isGroup: false,
        isOnline: true,
    },
    {
        id: "c3",
        name: "Finance & Budget",
        lastMessage: "La facture a été validée ✓",
        time: "22 min",
        unread: 1,
        isGroup: true,
        isOnline: false,
    },
    {
        id: "c4",
        name: "Jean-Pierre L.",
        lastMessage: "Je vais vérifier ça cet après-midi.",
        time: "1h",
        unread: 0,
        isGroup: false,
        isOnline: false,
    },
    {
        id: "c5",
        name: "Planification événement",
        lastMessage: "Qui peut s'occuper du catering ?",
        time: "2h",
        unread: 5,
        isGroup: true,
        isOnline: true,
    },
    {
        id: "c6",
        name: "Sarah Côté",
        lastMessage: "Parfait, à bientôt !",
        time: "Hier",
        unread: 0,
        isGroup: false,
        isOnline: false,
    },
];

export const DOCUMENTS_DATA: Document[] = [
    {
        id: "d1",
        icon: "file-document-outline",
        title: "Demande de fonds",
        url: "https://docs.google.com/document/d/1DF0Dq-laPTGJDa0M-SEOUrTqR4szV2GK/edit?usp=sharing",
    },
    {
        id: "d2",
        icon: "clipboard-text-outline",
        title: "Formulaire de dépense (Facture)",
        url: "https://docs.google.com/forms/d/10bSS1_EP4Mp8xGZx8AaNkP_KU_3z8HQovJBK7mDqEMk",
    },
    {
        id: "d3",
        icon: "card-text-outline",
        title: "Carte d'invitation",
        url: "https://docs.google.com/document/d/1P4gsxMJtLNesD4H7mdwnobPJHUT-8-vc",
    },
    {
        id: "d4",
        icon: "pencil-outline",
        title: "Démission / Absence",
        url: "https://docs.google.com/document/d/1rJvOx5GWH9Wr9dnBxuvB9XcFFzrj_vvZ",
    },
    {
        id: "d5",
        icon: "chart-box-outline",
        title: "Contribution mensuelle OJYQ",
        url: "https://docs.google.com/spreadsheets/d/1o8PALcnfRligb1yGkOC_GSwGRGg8klvm4qDaw9ttb4w",
    },
];

export const DAYS: DayOption[] = [ /// TO MODIFY TO USE ACTUAL DATES
    { key: "Lun", label: "Lun", date: "3" },
    { key: "Mar", label: "Mar", date: "4" },
    { key: "Mer", label: "Mer", date: "5" },
    { key: "Jeu", label: "Jeu", date: "6" },
    { key: "Ven", label: "Ven", date: "7" },
];