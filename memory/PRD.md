# OJYQ - Product Requirements Document

## Application Overview
**Nom**: OJYQ (Organisation de la Jeunesse Yira du Québec)
**Type**: Application mobile React Native / Expo
**Stack**: TypeScript, Firebase (Firestore + Auth), React Navigation

---

## Architecture

### Structure des fichiers
```
/app/
├── app/                    # Expo Router pages
│   ├── (tabs)/             # Tab navigation
│   │   ├── index.tsx       # Accueil
│   │   ├── chat.tsx        # Liste des canaux ✅ REFACTORISÉ
│   │   ├── calendar.tsx    # Agenda ✅ REFACTORISÉ
│   │   └── profile.tsx     # Profil utilisateur
│   ├── channel/
│   │   └── [id].tsx        # Conversation ✅ REFACTORISÉ
│   └── auth/
│       └── auth-screen.tsx # Authentification
├── components/
│   ├── chat/               # ✅ NOUVEAU
│   │   ├── ChannelItem.tsx
│   │   ├── PollBubble.tsx
│   │   └── CallControls.tsx
│   ├── calendar/           # ✅ NOUVEAU
│   │   └── EventCard.tsx
│   └── ui/
├── hooks/
│   ├── useTheme.ts         # ✅ NOUVEAU
│   └── use-auth.ts
├── theme/
│   ├── colors.ts           # ✅ NOUVEAU - Bleu marine/ciel
│   └── tokens.ts
└── types/
    ├── models.ts           # ✅ NOUVEAU - Interfaces TypeScript
    └── index.ts
```

### Modèles de données (TypeScript)
- `CalendarEvent` - Événement générique
- `Shift` - Quart de travail avec assignation
- `Channel` - Canal de discussion
- `Message` - Message avec support sondages
- `Poll` - Sondage Pour/Contre
- `Member` - Membre avec rôle

---

## User Personas

### 1. Membres actifs
- Accès lecture/écriture aux discussions
- Participation aux sondages
- Consultation du calendrier

### 2. Responsables/Admin
- Création d'événements et quarts
- Gestion des canaux
- Assignation des quarts

### 3. Direction (Président, Secrétaire, Trésorier)
- Tous les droits admin
- Appels audio/vidéo (WebRTC)

---

## Core Requirements (Implémentés)

### Module Chat ✅
- [x] Liste des canaux avec recherche
- [x] Création/modification/suppression de canaux
- [x] Messagerie instantanée (GiftedChat)
- [x] Sondages interactifs (Pour/Contre)
- [x] Envoi de photos (base64)
- [x] UI préparée pour appels WebRTC

### Module Calendrier ✅
- [x] Vue unifiée événements + quarts
- [x] Distinction visuelle (couleurs)
- [x] Création/modification/suppression
- [x] Assignation de membres aux quarts
- [x] Fonctionnement optimiste (cache Firestore)
- [x] Filtrage par type

### Thème ✅
- [x] Mode sombre (bleu marine #0F172A)
- [x] Mode clair (bleu ciel #E0F4FF)
- [x] Hook useTheme() avec détection auto

---

## What's Been Implemented (Jan 2026)

### Session 1 - Refactorisation complète
1. **Types TypeScript stricts** (`/app/types/models.ts`)
2. **Système de thème** avec mode sombre/clair
3. **Composants modulaires**:
   - EventCard (calendrier)
   - PollBubble (sondages chat)
   - ChannelItem (liste canaux)
   - CallControls (UI WebRTC)
4. **Refonte chat.tsx** - Architecture modulaire, recherche
5. **Refonte calendar.tsx** - Filtres, assignation membres
6. **Refonte channel/[id].tsx** - Sondages intégrés

---

## Backlog (P0/P1/P2)

### P0 - Critique
- [ ] Intégration Firebase Auth complète
- [ ] WebRTC appels audio/vidéo réels

### P1 - Important
- [ ] Notifications push
- [ ] Mode hors-ligne complet
- [ ] Récurrence des événements

### P2 - Nice to have
- [ ] Réactions aux messages (emoji)
- [ ] Édition de messages
- [ ] Export calendrier iCal
- [ ] Statistiques de présence

---

## Next Tasks
1. Intégrer Firebase Auth avec les rôles membres
2. Implémenter WebRTC avec les hooks créés
3. Ajouter les notifications push
4. Tests E2E avec Detox

---

## Firebase Configuration
- Project ID: ojyq-ec4e3
- Auth Domain: ojyq-ec4e3.firebaseapp.com
- Collections: `channels`, `events`, `members`
