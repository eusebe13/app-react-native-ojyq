# Design : Fermeture globale des modales & RBAC Disponibilités

**Date** : 2026-04-01  
**Fichiers principaux** : `app/(tabs)/calendar.tsx`, `components/ui/DismissableModal.tsx`

---

## 1. Contexte

Le fichier `calendar.tsx` contient 8 modales. Certaines gèrent déjà le "clic extérieur" via `TouchableWithoutFeedback` manuel, d'autres non. La demande unifie ce comportement via un composant réutilisable.

Par ailleurs, la permission `canManageSchedule` inclut actuellement Vice-Président et Secrétaire ; la demande la restreint à Administrateur et Président uniquement.

---

## 2. Composant `DismissableModal`

### Fichier
`components/ui/DismissableModal.tsx`

### Interface
```ts
interface DismissableModalProps {
  visible: boolean;
  onDismiss: () => void;
  animationType?: "none" | "slide" | "fade";
  children: React.ReactNode;
}
```

### Comportement
- Wraps React Native `Modal` (`transparent={true}`)
- `onRequestClose` → `onDismiss` (bouton retour Android)
- Overlay : `TouchableWithoutFeedback onPress={onDismiss}` couvrant tout l'écran avec fond `rgba(0,0,0,0.5)`, centré
- Conteneur interne : `View onStartShouldSetResponder={() => true}` pour bloquer la propagation du clic vers le backdrop
- Le composant ne stylise PAS le contenu interne (pas de padding, borderRadius) — la responsabilité reste à l'appelant

### Ce que le composant ne fait PAS
- Ne gère pas le style de la carte (card blanche) — inchangé côté appelant
- Ne gère pas les modales plein écran (`transparent={false}`, scanner caméra, détail événement)

---

## 3. Migration des modales dans `calendar.tsx`

### Modales migrées vers `DismissableModal`

| Modal | `visible` | `onDismiss` | `animationType` |
|---|---|---|---|
| Création/édition événement | `modalVisible` | `closeModal` | `"slide"` |
| Horaire de permanence | `scheduleModalVisible` | `() => setScheduleModalVisible(false)` | `"slide"` |
| Confirmation downgrade | `showDowngradeConfirm` | `() => setShowDowngradeConfirm(false)` | `"fade"` |
| QR Code événement | `qrEvent` (cast en boolean) | `() => setQrEvent(null)` | `"fade"` |
| Confirmation check-in | `pendingCheckin` (cast en boolean) | `() => { setPendingCheckin(null); isProcessing.current = false; }` | `"fade"` |
| Ajout disponibilité | `availabilityModalVisible` | `closeAvailabilityModal` | `"slide"` |

### Modales NON migrées (plein écran, pas de backdrop)

| Modal | Raison |
|---|---|
| Détail événement (`selectedEvent`) | `transparent={false}`, plein écran SafeAreaView |
| Scanner QR (`scannerVisible`) | Caméra plein écran, pas d'overlay |

### Nettoyage
Les `TouchableWithoutFeedback` manuels existants dans `scheduleModalVisible` et `showDowngradeConfirm` sont supprimés, remplacés par `DismissableModal`.

---

## 4. RBAC Disponibilités

### Redéfinition de `canManageSchedule`

**Avant** (ligne ~389) :
```ts
const canManageSchedule = canGenerateQR;
// canGenerateQR = Président | Administrateur | Vice-Président | Secrétaire
```

**Après** :
```ts
const canManageSchedule =
  profile.role === "Administrateur" || profile.role === "Président";
```

`canGenerateQR` reste inchangé — il contrôle uniquement la génération de QR pour les événements.

### Affichage dans l'onglet Disponibilités

**Admin / Président (`canManageSchedule = true`)** :
- `WeeklyCoverageChart` alimenté par `allAvailabilities` (toutes les données membres)
- Bouton "Générer l'horaire de permanence"
- Liste groupée par membre avec leurs créneaux

**Membres ordinaires (`canManageSchedule = false`)** :
- `WeeklyCoverageChart` alimenté par `availabilities` (données personnelles uniquement)
- Pas de bouton "Générer l'horaire"
- Liste de leurs propres créneaux uniquement

### Listeners Firestore

- `collectionGroup("availabilities")` → déjà conditionné par `canManageSchedule` dans le `useEffect` (inchangé)
- `collection(db, "users")` pour `allUsersMap` → déjà conditionné par `canManageSchedule` (inchangé)
- Membres ordinaires ne souscrivent jamais à ces listeners → pas de données des autres membres exposées côté client

---

## 5. Flux de données (résumé)

```
profile.role
  ├─ "Administrateur" | "Président"
  │   ├─ canManageSchedule = true
  │   ├─ Listener: collectionGroup("availabilities") → allAvailabilities
  │   ├─ Listener: collection("users") → allUsersMap
  │   ├─ WeeklyCoverageChart ← allAvailabilities
  │   ├─ Bouton "Générer l'horaire" visible
  │   └─ Liste: groupée par membre
  │
  └─ Autres rôles
      ├─ canManageSchedule = false
      ├─ allAvailabilities = [] (listener jamais actif)
      ├─ WeeklyCoverageChart ← availabilities (personnel)
      ├─ Bouton "Générer l'horaire" masqué
      └─ Liste: créneaux personnels uniquement
```

---

## 6. Hors périmètre

- Refactoring des autres écrans (admin, members, etc.)
- Extraction des autres modales de `calendar.tsx` en composants séparés
- Modifications des règles de sécurité Firestore (hors scope applicatif)
