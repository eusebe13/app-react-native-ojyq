# Design — Affichage des créneaux personnels pour les membres

**Date :** 2026-04-02
**Branche :** feat/Calendar
**Fichier concerné :** `app/(tabs)/calendar.tsx`

---

## Contexte

Suite à l'implémentation du graphique de couverture globale (tâche précédente), la liste des créneaux a été mise à `[]` pour les non-admins afin de masquer les créneaux des autres membres. Cela a eu l'effet de bord de masquer aussi les créneaux du membre connecté.

## Objectif

Les membres doivent pouvoir voir leurs propres créneaux de disponibilité dans la vue Disponibilités, tout en continuant à ne pas voir ceux des autres membres.

## Changement

### Fichier : `app/(tabs)/calendar.tsx` — ligne ~1197

```tsx
// Avant
data={canManageSchedule ? memberGroups : []}

// Après
data={canManageSchedule ? memberGroups : availabilities}
```

`availabilities` est déjà chargé en temps réel depuis `users/{uid}/availabilities` — il contient uniquement les créneaux du membre connecté.

## RBAC — Récapitulatif mis à jour

| Élément | Membre | Admin/Président |
|---|---|---|
| WeeklyCoverageChart (données globales) | ✅ | ✅ |
| Ses propres créneaux | ✅ | ✅ |
| Créneaux des autres membres | ❌ | ✅ |
| Supprimer ses propres créneaux (appui long) | ✅ | ✅ |
| Bouton "Générer l'horaire" | ❌ | ✅ |
| Message vide si aucun créneau | ❌ | ✅ |

## Dépendances

- Aucune nouvelle collection Firestore
- Aucune nouvelle dépendance
