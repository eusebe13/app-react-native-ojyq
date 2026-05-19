import React from "react";
import {
  Linking,
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as Updates from "expo-updates";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useUpdateStatus } from "@/contexts/UpdateContext";

const STORE_URL =
  "https://play.google.com/store/apps/details?id=org.ojyq.app";

export default function UpdateModal() {
  const { colors } = useAppTheme();
  const { showModal, setShowModal } = useUpdateStatus();

  const handleUpdate = async () => {
    if (__DEV__) {
      await Linking.openURL(STORE_URL).catch(() => {});
      return;
    }
    try {
      await Updates.reloadAsync();
    } catch (e) {
      console.warn("[updates] reload failed:", e);
      await Linking.openURL(STORE_URL).catch(() => {});
    }
  };

  return (
    <Modal transparent animationType="fade" visible={showModal}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "1A" }]}>
            <Ionicons name="arrow-up-circle-outline" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Mise à jour disponible
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Une nouvelle version de l'application est prête. Installez-la maintenant pour profiter des dernières améliorations.
          </Text>
          <TouchableOpacity
            onPress={handleUpdate}
            style={[styles.btn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Mettre à jour maintenant</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowModal(false)}
            style={styles.later}
            activeOpacity={0.7}
          >
            <Text style={[styles.laterText, { color: colors.textSecondary }]}>
              Plus tard
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  later: {
    paddingVertical: 8,
  },
  laterText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
