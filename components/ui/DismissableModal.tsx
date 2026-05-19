import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
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
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        {/* Backdrop absoluteFill — ferme le modal au tap sur le fond.
            Séparé du contenu pour ne pas bloquer les ScrollViews. */}
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Contenu — pas de onStartShouldSetResponder, les ScrollViews
            reçoivent les gestes de scroll normalement.
            On web, onClick stopPropagation empêche les éléments HTML
            (<input>, etc.) de déclencher le onDismiss du backdrop. */}
        <View
          {...(Platform.OS === "web"
            ? { onClick: (e: any) => e.stopPropagation() }
            : {})}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}
