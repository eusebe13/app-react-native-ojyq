import React from "react";
import { Modal, TouchableWithoutFeedback, View } from "react-native";

interface DismissableModalProps {
  visible: boolean;
  onDismiss: () => void;
  animationType?: "none" | "slide" | "fade";
  children: React.ReactNode;
}

/**
 * Modal transparent avec fermeture au clic sur le backdrop.
 *
 * Architecture : backdrop absolu + contenu frère (pas parent-enfant).
 * Les touches sur le contenu n'atteignent jamais le backdrop — pas besoin
 * de stopPropagation. Les ScrollView et TextInput à l'intérieur fonctionnent
 * normalement car aucun Pressable n'enveloppe le contenu.
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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Backdrop : couvre tout l'écran derrière le contenu */}
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          />
        </TouchableWithoutFeedback>

        {/* Contenu : frère du backdrop, positionné au-dessus en z-order.
            maxHeight: '100%' pour que les % dans les cartes enfants se résolvent. */}
        <View style={{ maxHeight: "100%" }}>
          {children}
        </View>
      </View>
    </Modal>
  );
}
