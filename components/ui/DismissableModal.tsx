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
