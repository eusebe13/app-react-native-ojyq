/**
 * OJYQ - Modèles de données TypeScript
 * 
 * Ce fichier contient toutes les interfaces pour les modules Chat et Calendrier.
 * Intégration avec Firebase Firestore.
 */

import { Timestamp } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════════════════
// MEMBRES ET RÔLES
// ═══════════════════════════════════════════════════════════════════════════

export type MemberRole = 
  | 'president'
  | 'vice-president'
  | 'secretaire'
  | 'vice-secretaire'
  | 'tresorier'
  | 'vice-tresorier'
  | 'responsable-communication'
  | 'vice-responsable-communication'
  | 'responsable-loisir'
  | 'responsable-discipline'
  | 'conseiller'
  | 'membre';

export interface Member {
  id: string;
  uid: string; // Firebase Auth UID
  displayName: string;
  email: string;
  role: MemberRole;
  department?: 'direction' | 'finances' | 'communication' | 'activites' | 'conseil';
  avatarUrl?: string;
  isAdmin: boolean;
  createdAt: Date;
  lastActiveAt?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE CALENDRIER
// ═══════════════════════════════════════════════════════════════════════════

export type EventType = 'general' | 'shift';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  date: Timestamp;
  dateObj?: Date; // Pour le cache local
  endDate?: Timestamp;
  location: string;
  color?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  /** Indique si l'événement est en attente de sync avec Firestore */
  pending?: boolean;
}

export interface Shift extends CalendarEvent {
  type: 'shift';
  assignee: string; // ID du membre assigné
  assigneeName?: string;
  confirmed: boolean;
  notes?: string;
}

export interface GeneralEvent extends CalendarEvent {
  type: 'general';
  attendees?: string[]; // Liste des IDs des participants
  isRecurring?: boolean;
  recurrenceRule?: string;
}

// Helper type pour distinguer les deux
export type CalendarItem = Shift | GeneralEvent;

// ═══════════════════════════════════════════════════════════════════════════
// MODULE CHAT
// ═══════════════════════════════════════════════════════════════════════════

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  createdBy: string;
  createdAt: Timestamp;
  lastMessage: string;
  lastMessageAt?: Timestamp;
  members?: string[]; // Pour les canaux privés
  avatarUrl?: string;
  unreadCount?: number;
  isPinned?: boolean;
}

export interface MessageUser {
  _id: string;
  name: string;
  avatar?: string;
}

export interface Poll {
  question: string;
  yes: number;
  no: number;
  voters: string[]; // Liste des IDs qui ont voté
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface Message {
  _id: string;
  text: string;
  createdAt: Date | Timestamp;
  user: MessageUser;
  image?: string;
  poll?: Poll;
  replyTo?: string; // ID du message auquel on répond
  reactions?: Record<string, string[]>; // emoji -> liste des user IDs
  isEdited?: boolean;
  isDeleted?: boolean;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'video' | 'audio';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// APPELS AUDIO/VIDEO (WebRTC)
// ═══════════════════════════════════════════════════════════════════════════

export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'declined';

export interface Call {
  id: string;
  channelId: string;
  type: CallType;
  status: CallStatus;
  initiator: string;
  participants: string[];
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  duration?: number; // en secondes
}

export interface CallSignaling {
  roomId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  caller: string;
  callee?: string;
  status: 'waiting' | 'active' | 'ended';
  createdAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION & UI STATE
// ═══════════════════════════════════════════════════════════════════════════

export interface DayOption {
  key: string;
  label: string;
  date: string;
  fullDate: Date;
}

export interface ChatPreview {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  isGroup: boolean;
  isOnline: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// FIRESTORE CONVERTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convertit un document Firestore en CalendarEvent (ou Shift)
 */
export const eventFromFirestore = (doc: any): CalendarItem => {
  const data = doc.data();
  
  // Base commune
  const baseEvent = {
    id: doc.id,
    title: data.title || 'Sans titre',
    description: data.description,
    type: (data.type as EventType) || 'general',
    date: data.date,
    dateObj: data.date && typeof data.date.toDate === 'function' ? data.date.toDate() : new Date(),
    location: data.location || 'Lieu à définir',
    createdBy: data.createdBy || 'admin',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    pending: doc.metadata?.hasPendingWrites || false,
  };

  // Si c'est un quart de travail (Shift)
  if (baseEvent.type === 'shift') {
    return {
      ...baseEvent,
      type: 'shift',
      assignee: data.assignee || null,
      assigneeName: data.assigneeName || null,
      confirmed: data.confirmed || false,
      notes: data.notes,
    } as Shift;
  }

  // Si c'est un événement général
  return {
    ...baseEvent,
    type: 'general',
    attendees: data.attendees || [],
    isRecurring: data.isRecurring || false,
  } as GeneralEvent;
};

/**
 * Convertit un document Firestore en Message
 */
export const messageFromFirestore = (doc: any): Message => {
  const data = doc.data();
  return {
    _id: doc.id,
    text: data.text || '',
    createdAt: data.createdAt?.toDate?.() || new Date(),
    user: data.user || { _id: 'unknown', name: 'Inconnu' },
    image: data.image,
    poll: data.poll,
    replyTo: data.replyTo,
    reactions: data.reactions,
    isEdited: data.isEdited,
    isDeleted: data.isDeleted,
    attachments: data.attachments,
  };
};

/**
 * Convertit un document Firestore en Channel
 */
export const channelFromFirestore = (doc: any): Channel => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name || 'Sans nom',
    description: data.description,
    type: data.type || 'public',
    createdBy: data.createdBy || '',
    createdAt: data.createdAt,
    lastMessage: data.lastMessage || '',
    lastMessageAt: data.lastMessageAt,
    members: data.members,
    avatarUrl: data.avatarUrl,
    isPinned: data.isPinned,
  };
};
