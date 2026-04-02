# Member Own Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher les créneaux de disponibilité du membre connecté dans la vue Disponibilités, sans exposer les créneaux des autres membres.

**Architecture:** Un seul changement dans `calendar.tsx` — passer `availabilities` (créneaux du membre connecté, déjà chargés) au lieu de `[]` comme `data` de la FlatList pour les non-admins. Le `renderItem` non-admin et la suppression via appui long sont déjà fonctionnels.

**Tech Stack:** React Native, Expo SDK 54, Firebase Firestore

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/(tabs)/calendar.tsx` | Modify (~line 1197) | Passer `availabilities` au lieu de `[]` pour les non-admins |

---

## Task 1 : Afficher les créneaux du membre connecté

**Files:**
- Modify: `app/(tabs)/calendar.tsx:1197`

- [ ] **Step 1 : Appliquer le changement**

Dans `app/(tabs)/calendar.tsx`, remplacer :

```tsx
data={canManageSchedule ? memberGroups : []}
```

par :

```tsx
data={canManageSchedule ? memberGroups : availabilities}
```

- [ ] **Step 2 : Vérifier le type du `keyExtractor`**

La ligne suivante (actuellement `keyExtractor={(item) => item.userId}`) est typée sur `memberGroups`. Avec `availabilities` comme données alternatives, TypeScript peut se plaindre car les items de `availabilities` ont `id` et non `userId`.

Remplacer :

```tsx
keyExtractor={(item) => item.userId}
```

par :

```tsx
keyExtractor={(item) => item.userId ?? item.id}
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "calendar.tsx"
```

Expected : aucune sortie (aucune erreur dans calendar.tsx).

- [ ] **Step 4 : Vérification manuelle**

Lancer `npx expo start`. Avec un compte **membre** (non-admin) :
- Naviguer vers Calendrier → Disponibilités
- Le graphique de couverture globale est présent
- Les créneaux personnels du membre sont listés en dessous
- Appui long sur un créneau → confirmation de suppression s'affiche
- Le bouton `+` permet d'ajouter un nouveau créneau

Avec un compte **admin/président** :
- Comportement inchangé : graphique + liste par membre

- [ ] **Step 5 : Commit**

```bash
git add "app/(tabs)/calendar.tsx"
git commit -m "feat: show member's own availability slots in schedule view"
```

---

## Self-Review

### Spec coverage

| Exigence spec | Task |
|---|---|
| Membre voit ses propres créneaux | Task 1 Step 1 |
| Membre ne voit pas les créneaux des autres | Task 1 Step 1 (memberGroups réservé aux admins) |
| Admin inchangé | Task 1 Step 1 (branche canManageSchedule non modifiée) |

### Placeholder scan

Aucun TBD, aucun TODO, code complet dans chaque step.

### Type consistency

`availabilities` : `any[]` avec champ `id` — cohérent avec `item.id` dans `keyExtractor`.
