# Modal Dismiss & RBAC Disponibilités — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un comportement "clic extérieur = fermeture" uniforme à toutes les modales transparentes via un composant `DismissableModal`, et restreindre la visualisation globale des disponibilités aux rôles Administrateur/Président uniquement.

**Architecture:** On crée `components/ui/DismissableModal.tsx` (wrapper React Native `Modal` + `TouchableWithoutFeedback` sur le backdrop). Les 6 modales transparentes de `calendar.tsx` migrent vers ce composant. La permission `canManageSchedule` est redéfinie indépendamment de `canGenerateQR`. Le `WeeklyCoverageChart` affiché aux membres ordinaires reçoit uniquement leurs propres disponibilités.

**Tech Stack:** React Native (`Modal`, `TouchableWithoutFeedback`), Expo, TypeScript, Firebase Firestore

> **Note sur les tests :** Le projet n'a pas `@testing-library/react-native` et le runner jest actuel échoue sur les imports TypeScript `type`. Les tâches ci-dessous utilisent la vérification manuelle via `expo start` pour les composants UI. Aucun test unitaire n'est ajouté pour ce périmètre.

---

## File Map

| Fichier | Action | Responsabilité |
|---|---|---|
| `components/ui/DismissableModal.tsx` | **Créer** | Wrapper modal avec dismiss sur backdrop |
| `app/(tabs)/calendar.tsx` | **Modifier** | Migrer 6 modales + redéfinir canManageSchedule + chart conditionnel |

---

### Task 1 : Créer `DismissableModal`

**Files:**
- Create: `components/ui/DismissableModal.tsx`

- [ ] **Step 1 : Créer le fichier `components/ui/DismissableModal.tsx`**

```tsx
import React from "react";
import {
  Modal,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface DismissableModalProps {
  visible: boolean;
  onDismiss: () => void;
  animationType?: "none" | "slide" | "fade";
  children: React.ReactNode;
}

/**
 * Modal transparent avec fermeture automatique au clic sur le backdrop.
 * Le contenu interne (card) est rendu par l'appelant — ce composant ne
 * stylise pas la carte, uniquement l'overlay.
 */
export function DismissableModal({
  visible,
  onDismiss,
  animationType = "fade",
  children,
}: DismissableModalProps) {
  return (
    <Modal
      visible={visible}
      animationType={animationType}
      transparent={true}
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          {/* onStartShouldSetResponder bloque la propagation du clic
              depuis le contenu interne vers le backdrop */}
          <View onStartShouldSetResponder={() => true}>
            {children}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
```

- [ ] **Step 2 : Vérifier manuellement la compilation**

Lance `npx expo start` et vérifie qu'il n'y a pas d'erreur TypeScript dans le terminal. Tu peux aussi exécuter :

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur de type.

- [ ] **Step 3 : Commit**

```bash
git add components/ui/DismissableModal.tsx
git commit -m "feat: add DismissableModal component with backdrop dismiss"
```

---

### Task 2 : Migrer la modale "Création/édition événement" (`modalVisible`)

**Files:**
- Modify: `app/(tabs)/calendar.tsx`

La modale actuelle (ligne ~1315) est un `<Modal visible={modalVisible} animationType="slide" transparent={true}>` avec un `<View style={dynamicStyles.modalOverlay}>` comme premier enfant direct.

- [ ] **Step 1 : Ajouter l'import de `DismissableModal`**

En haut du fichier, après les autres imports de composants :

```tsx
import { DismissableModal } from "@/components/ui/DismissableModal";
```

- [ ] **Step 2 : Remplacer la modale événement**

Remplacer :
```tsx
<Modal visible={modalVisible} animationType="slide" transparent={true}>
  <View style={dynamicStyles.modalOverlay}>
    <View style={dynamicStyles.modalView}>
```

Par :
```tsx
<DismissableModal
  visible={modalVisible}
  onDismiss={closeModal}
  animationType="slide"
>
  <View style={dynamicStyles.modalView}>
```

Et supprimer la balise fermante `</View>` correspondant à `modalOverlay` (garder uniquement la fermeture de `modalView` et `DismissableModal`).

La structure finale doit être :
```tsx
<DismissableModal
  visible={modalVisible}
  onDismiss={closeModal}
  animationType="slide"
>
  <View style={dynamicStyles.modalView}>
    {/* ... contenu inchangé ... */}
  </View>
</DismissableModal>
```

- [ ] **Step 3 : Vérifier manuellement**

Lance l'app, ouvre la modale "Nouvel Événement" (bouton FAB +), puis :
- Tape sur le fond sombre → la modale se ferme ✓
- Tape à l'intérieur de la carte blanche → la modale reste ouverte ✓
- Appuie sur "Annuler" → la modale se ferme ✓

- [ ] **Step 4 : Commit**

```bash
git add app/(tabs)/calendar.tsx
git commit -m "feat: migrate event creation modal to DismissableModal"
```

---

### Task 3 : Migrer la modale "Horaire de permanence" (`scheduleModalVisible`)

**Files:**
- Modify: `app/(tabs)/calendar.tsx`

La modale actuelle (ligne ~1496) utilise déjà un `TouchableWithoutFeedback` manuel à remplacer.

- [ ] **Step 1 : Remplacer la modale horaire**

Remplacer tout le bloc :
```tsx
<Modal
  visible={scheduleModalVisible}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setScheduleModalVisible(false)}
>
  <TouchableWithoutFeedback onPress={() => setScheduleModalVisible(false)}>
    <View style={dynamicStyles.modalOverlay}>
      <View
        style={[dynamicStyles.modalView, { maxHeight: "90%", paddingBottom: 0 }]}
        onStartShouldSetResponder={() => true}
      >
```

Par :
```tsx
<DismissableModal
  visible={scheduleModalVisible}
  onDismiss={() => setScheduleModalVisible(false)}
  animationType="slide"
>
  <View
    style={[dynamicStyles.modalView, { maxHeight: "90%", paddingBottom: 0 }]}
  >
```

Et supprimer les balises fermantes `</TouchableWithoutFeedback>` et `</View>` (pour `modalOverlay`) tout en conservant `</View>` (pour `modalView`) et `</DismissableModal>`.

> Note : le `onStartShouldSetResponder` n'est plus nécessaire sur la `modalView` car `DismissableModal` l'applique sur son propre `View` interne.

- [ ] **Step 2 : Vérifier manuellement**

Lance l'app, ouvre la modale "Horaire de permanence" (onglet Disponibilités, rôle Admin/Président), puis :
- Tape sur le fond sombre → la modale se ferme ✓
- Tape à l'intérieur → la modale reste ouverte ✓

- [ ] **Step 3 : Commit**

```bash
git add app/(tabs)/calendar.tsx
git commit -m "feat: migrate schedule modal to DismissableModal"
```

---

### Task 4 : Migrer la modale "Confirmation downgrade" (`showDowngradeConfirm`)

**Files:**
- Modify: `app/(tabs)/calendar.tsx`

La modale actuelle (ligne ~1652) utilise aussi un `TouchableWithoutFeedback` manuel.

- [ ] **Step 1 : Remplacer la modale downgrade**

Remplacer :
```tsx
<Modal
  visible={showDowngradeConfirm}
  animationType="fade"
  transparent={true}
  onRequestClose={() => setShowDowngradeConfirm(false)}
>
  <TouchableWithoutFeedback onPress={() => setShowDowngradeConfirm(false)}>
    <View style={dynamicStyles.modalOverlay}>
      <View style={dynamicStyles.modalView} onStartShouldSetResponder={() => true}>
```

Par :
```tsx
<DismissableModal
  visible={showDowngradeConfirm}
  onDismiss={() => setShowDowngradeConfirm(false)}
  animationType="fade"
>
  <View style={dynamicStyles.modalView}>
```

Supprimer les balises fermantes `</TouchableWithoutFeedback>` et `</View>` (pour `modalOverlay`), conserver `</View>` (pour `modalView`) et ajouter `</DismissableModal>`.

- [ ] **Step 2 : Vérifier manuellement**

Lance l'app, rejoins un événement en cours, marque-toi "présent en présentiel", clique "Passer en ligne à la place →" pour ouvrir la modale de confirmation, puis :
- Tape le fond sombre → la modale se ferme ✓
- Tape sur les boutons → fonctionnement normal ✓

- [ ] **Step 3 : Commit**

```bash
git add app/(tabs)/calendar.tsx
git commit -m "feat: migrate downgrade confirm modal to DismissableModal"
```

---

### Task 5 : Migrer la modale "QR Code événement" (`qrEvent`)

**Files:**
- Modify: `app/(tabs)/calendar.tsx`

La modale actuelle (ligne ~2387) est un `Modal` nu sans dismiss.

- [ ] **Step 1 : Remplacer la modale QR**

Remplacer :
```tsx
<Modal
  visible={!!qrEvent}
  animationType="fade"
  transparent={true}
  onRequestClose={() => setQrEvent(null)}
>
  <View style={dynamicStyles.modalOverlay}>
    <View
      style={[
        dynamicStyles.modalView,
        { paddingVertical: 24, gap: 0, maxHeight: "85%" },
      ]}
    >
```

Par :
```tsx
<DismissableModal
  visible={!!qrEvent}
  onDismiss={() => setQrEvent(null)}
  animationType="fade"
>
  <View
    style={[
      dynamicStyles.modalView,
      { paddingVertical: 24, gap: 0, maxHeight: "85%" },
    ]}
  >
```

Supprimer la balise fermante `</View>` pour `modalOverlay`, conserver `</View>` pour `modalView` et ajouter `</DismissableModal>`.

- [ ] **Step 2 : Vérifier manuellement**

Lance l'app (rôle Admin/Président), clique l'icône QR sur un événement, puis :
- Tape le fond sombre → la modale se ferme ✓
- Tape à l'intérieur du QR code → modale reste ouverte ✓
- Bouton "Fermer" → fonctionne ✓

- [ ] **Step 3 : Commit**

```bash
git add app/(tabs)/calendar.tsx
git commit -m "feat: migrate QR modal to DismissableModal"
```

---

### Task 6 : Migrer la modale "Confirmation check-in" (`pendingCheckin`)

**Files:**
- Modify: `app/(tabs)/calendar.tsx`

La modale actuelle (ligne ~2543) est un `Modal` nu sans dismiss.

- [ ] **Step 1 : Remplacer la modale check-in**

Remplacer :
```tsx
<Modal
  visible={!!pendingCheckin}
  animationType="fade"
  transparent={true}
  onRequestClose={() => {
    setPendingCheckin(null);
    isProcessing.current = false;
  }}
>
  <View style={dynamicStyles.modalOverlay}>
    <View style={dynamicStyles.modalView}>
```

Par :
```tsx
<DismissableModal
  visible={!!pendingCheckin}
  onDismiss={() => {
    setPendingCheckin(null);
    isProcessing.current = false;
  }}
  animationType="fade"
>
  <View style={dynamicStyles.modalView}>
```

> Important : `isProcessing.current = false` dans `onDismiss` est obligatoire pour éviter que le scanner reste bloqué si l'utilisateur ferme la modale sans confirmer.

Supprimer `</View>` (pour `modalOverlay`), conserver `</View>` (pour `modalView`) et ajouter `</DismissableModal>`.

- [ ] **Step 2 : Vérifier manuellement**

Lance l'app, scanne un QR d'événement (ou simule le state `pendingCheckin`), puis :
- Tape le fond sombre → la modale se ferme, le scanner peut re-scanner ✓
- Bouton "Confirmer" → enregistre la présence ✓
- Bouton "Annuler" → ferme la modale et reset `isProcessing` ✓

- [ ] **Step 3 : Commit**

```bash
git add app/(tabs)/calendar.tsx
git commit -m "feat: migrate check-in confirmation modal to DismissableModal"
```

---

### Task 7 : Migrer la modale "Ajout disponibilité" (`availabilityModalVisible`)

**Files:**
- Modify: `app/(tabs)/calendar.tsx`

La modale actuelle (ligne ~2599) est un `Modal` nu sans dismiss.

- [ ] **Step 1 : Remplacer la modale disponibilité**

Remplacer :
```tsx
<Modal
  visible={availabilityModalVisible}
  animationType="slide"
  transparent={true}
>
  <View style={dynamicStyles.modalOverlay}>
    <View style={dynamicStyles.modalView}>
```

Par :
```tsx
<DismissableModal
  visible={availabilityModalVisible}
  onDismiss={closeAvailabilityModal}
  animationType="slide"
>
  <View style={dynamicStyles.modalView}>
```

Supprimer `</View>` (pour `modalOverlay`), conserver `</View>` (pour `modalView`) et ajouter `</DismissableModal>`.

- [ ] **Step 2 : Vérifier manuellement**

Lance l'app, onglet Disponibilités, bouton FAB +, puis :
- Tape le fond sombre → la modale se ferme, les champs sont réinitialisés ✓
- Tape à l'intérieur → la modale reste ouverte ✓
- Bouton "Annuler" → fonctionne ✓

- [ ] **Step 3 : Commit**

```bash
git add app/(tabs)/calendar.tsx
git commit -m "feat: migrate availability modal to DismissableModal"
```

---

### Task 8 : RBAC — Restreindre `canManageSchedule` à Admin/Président

**Files:**
- Modify: `app/(tabs)/calendar.tsx`

- [ ] **Step 1 : Redéfinir `canManageSchedule`**

Trouver (ligne ~388-389) :
```ts
const canManageSchedule = canGenerateQR; // Administrateur ou Président
```

Remplacer par :
```ts
const canManageSchedule =
  profile.role === "Administrateur" || profile.role === "Président";
```

> `canGenerateQR` (Président | Administrateur | Vice-Président | Secrétaire) reste inchangé — il contrôle uniquement les boutons QR sur les événements.

- [ ] **Step 2 : Vérifier manuellement avec un compte Vice-Président ou Secrétaire**

Connecte-toi avec un compte ayant le rôle "Vice-Président" ou "Secrétaire" :
- Onglet Disponibilités → la liste groupée par membres n'est plus visible ✓
- Le bouton "Générer l'horaire" n'apparaît plus ✓
- Le chart affiche uniquement les données personnelles ✓
- Les boutons QR sur les événements sont toujours visibles ✓ (canGenerateQR inchangé)

- [ ] **Step 3 : Commit**

```bash
git add app/(tabs)/calendar.tsx
git commit -m "fix: restrict canManageSchedule to Admin and Président only"
```

---

### Task 9 : RBAC — Conditionner le `WeeklyCoverageChart` pour les membres ordinaires

**Files:**
- Modify: `app/(tabs)/calendar.tsx`

Actuellement (ligne ~1198), le chart reçoit toujours `allAvailabilities` :
```tsx
<WeeklyCoverageChart availabilities={allAvailabilities} />
```

Pour les membres ordinaires, `allAvailabilities` est vide (le listener ne tourne pas) — le chart s'affiche mais sans données. Il faut lui passer leurs données personnelles.

- [ ] **Step 1 : Conditionner la source de données du chart**

Remplacer :
```tsx
<WeeklyCoverageChart availabilities={allAvailabilities} />
```

Par :
```tsx
<WeeklyCoverageChart
  availabilities={canManageSchedule ? allAvailabilities : availabilities}
/>
```

- [ ] **Step 2 : Vérifier manuellement**

Avec un compte **membre ordinaire** :
- Onglet Disponibilités → le chart affiche ses propres créneaux (barres proportionnelles à ses disponibilités) ✓
- Les données des autres membres ne sont pas visibles ✓

Avec un compte **Admin/Président** :
- Le chart affiche la couverture globale de tous les membres ✓

- [ ] **Step 3 : Commit**

```bash
git add app/(tabs)/calendar.tsx
git commit -m "feat: show personal availability in chart for non-admin members"
```

---

## Récapitulatif des commits attendus

1. `feat: add DismissableModal component with backdrop dismiss`
2. `feat: migrate event creation modal to DismissableModal`
3. `feat: migrate schedule modal to DismissableModal`
4. `feat: migrate downgrade confirm modal to DismissableModal`
5. `feat: migrate QR modal to DismissableModal`
6. `feat: migrate check-in confirmation modal to DismissableModal`
7. `feat: migrate availability modal to DismissableModal`
8. `fix: restrict canManageSchedule to Admin and Président only`
9. `feat: show personal availability in chart for non-admin members`
