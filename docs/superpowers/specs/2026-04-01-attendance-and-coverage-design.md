# Design — Liste de présence & Couverture globale

**Date :** 2026-04-01  
**Branche :** feat/Calendar  
**Fichier principal concerné :** `app/(tabs)/calendar.tsx`

---

## Contexte

L'application OJYQ dispose d'un onglet Calendrier avec deux sous-vues :
- **Événements** : liste des événements (à venir, en cours, terminés)
- **Disponibilités** : créneaux récurrents + graphique de couverture hebdomadaire (`WeeklyCoverageChart`)

### Données Firestore pertinentes

| Collection | Contenu |
|---|---|
| `events/{id}` | Titre, date, lieu, description |
| `events/{id}/participants` | `{ userId, userName, status, updatedAt }` — statuts : `going`, `not_going`, `online`, `present_physical`, `absent` |
| `users/{uid}/availabilities` | `{ days[], startHours, startMinutes, endHours, endMinutes }` |

**Cycle de vie des statuts :**
- Avant l'événement : `going` / `not_going`
- Pendant / après : `online` / `present_physical` / `absent`

---

## Fonctionnalité 1 — Liste de présence des événements terminés

### Objectif

Permettre à tout utilisateur authentifié de consulter la liste de présence d'un événement terminé (phase `past`). Vue en lecture seule, avec bouton de copie.

### Changements

#### 1. Événements passés cliquables

Dans le `renderItem` de la FlatList des événements, retirer la condition qui bloque le tap sur les événements passés :

```tsx
// Avant
onPress={() => phase !== "past" && handleEventPress(item)}

// Après
onPress={() => handleEventPress(item)}
```

#### 2. Section `phase === "past"` dans le modal détail

Ajouter un bloc conditionnel dans le `ScrollView` du modal `selectedEvent`, après description et lieu. Ce bloc remplace les sections "Ma participation" et "Ma présence" qui ne doivent **pas** apparaître pour les événements terminés.

Contenu du bloc :
- **En-tête** avec compteur : `X en ligne · Y en présentiel`
- **Liste des présents** filtrée sur `status === "online" || status === "present_physical"`, triée par statut puis alphabétiquement par `userName`
- Pour chaque entrée :
  - Avatar initiale colorée (bleu=online, vert=present_physical)
  - Nom complet (`userName`)
  - Badge statut : `En ligne` (cyan) / `Présentiel` (vert)
  - Horodatage : `updatedAt` formaté `JJ MMM à HH:MM`
- **État vide** si aucun présent : icône + "Aucune présence enregistrée"
- **Bouton "Copier la liste"** en bas du bloc

#### 3. Bouton copier

Utilise `expo-clipboard` (`Clipboard.setStringAsync`). Format du texte copié :

```
Présences — [Titre] ([Date])
En ligne (N) : Nom A, Nom B
Présentiel (N) : Nom C, Nom D
```

Feedback visuel : l'icône du bouton passe de `copy-outline` à `checkmark` pendant 2 secondes.

#### 4. Lecture seule pour les événements passés

Les sections `phase === "future"` et `phase === "ongoing"` dans le modal détail n'ont pas de condition à modifier — elles sont déjà conditionnelles par phase. Aucun bouton de changement de statut n'est donc affiché pour `phase === "past"`.

---

## Fonctionnalité 2 — Couverture globale visible par les membres

### Objectif

Les membres (non-admins) voient le graphique `WeeklyCoverageChart` calculé sur la totalité des membres, mais sans la liste des créneaux individuels.

### Changements

#### 1. WeeklyCoverageChart avec données globales pour tous

```tsx
// Avant
<WeeklyCoverageChart
  availabilities={canManageSchedule ? allAvailabilities : availabilities}
/>

// Après
<WeeklyCoverageChart
  availabilities={allAvailabilities}
/>
```

#### 2. Liste des créneaux réservée aux admins

Conditionner le rendu de la liste (slots par membre) avec `canManageSchedule` :
- `renderItem` : affiche les cartes par membre uniquement si `canManageSchedule`; pour les membres, retourne `null`
- `ListEmptyComponent` : affiché uniquement si `canManageSchedule`

Les membres voient uniquement le graphique dans le header de la FlatList, sans liste en dessous.

#### 3. FAB inchangé

Le bouton `+` reste fonctionnel pour tous — les membres peuvent toujours ajouter leurs créneaux de disponibilité.

---

## RBAC — Récapitulatif des visibilités

| Élément | Membre | Admin/Président |
|---|---|---|
| Événement passé cliquable | ✅ | ✅ |
| Liste de présence (past) | ✅ (lecture seule) | ✅ (lecture seule) |
| Bouton copier la liste | ✅ | ✅ |
| WeeklyCoverageChart (données globales) | ✅ | ✅ |
| Liste des créneaux par membre | ❌ | ✅ |
| Bouton "Générer l'horaire" | ❌ | ✅ |
| Changement de statut sur événement passé | ❌ | ❌ |

---

## Dépendances

- `expo-clipboard` — déjà dans le projet (`expo` SDK)
- Aucune nouvelle collection Firestore requise
- Aucune règle de sécurité Firestore à modifier
