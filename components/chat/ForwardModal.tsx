import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

interface Channel {
  id: string;
  name: string;
  audienceType?: string;
}

interface ForwardModalProps {
  visible: boolean;
  channels: Channel[];
  onClose: () => void;
  onForward: (channelId: string) => void;
}

const ForwardModal = React.memo(function ForwardModal({
  visible,
  channels,
  onClose,
  onForward,
}: ForwardModalProps) {
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);

  const handleForward = useCallback(
    (channelId: string) => {
      onForward(channelId);
      onClose();
    },
    [onForward, onClose]
  );

  const renderChannel = useCallback(
    ({ item, index }: { item: Channel; index: number }) => (
      <TouchableOpacity
        style={[
          styles.channelRow,
          index < channels.length - 1 && styles.channelRowBorder,
        ]}
        onPress={() => handleForward(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.channelIcon}>
          <Ionicons name="chatbubbles" size={18} color={colors.primary} />
        </View>
        <Text style={styles.channelName} numberOfLines={1}>
          {item.name}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    ),
    [handleForward, channels.length, styles, colors]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucun canal disponible</Text>
      </View>
    ),
    [styles]
  );

  const keyExtractor = useCallback((item: Channel) => item.id, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Transférer vers…</Text>

        {/* Channel list */}
        <FlatList
          data={channels}
          keyExtractor={keyExtractor}
          renderItem={renderChannel}
          ListEmptyComponent={renderEmpty}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          scrollEnabled={channels.length > 5}
        />

        {/* Cancel button */}
        <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
});

export default ForwardModal;

function getStyles(colors: any, tokens: any) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: 400,
      paddingBottom: tokens.space.lg ?? 24,
    },
    handleRow: {
      alignItems: "center",
      paddingTop: tokens.space.sm ?? 8,
      paddingBottom: 4,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
      marginVertical: tokens.space.md ?? 12,
      paddingHorizontal: tokens.space.md ?? 12,
    },
    list: {
      flexGrow: 0,
    },
    channelRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: tokens.space.md ?? 12,
      gap: tokens.space.md ?? 12,
    },
    channelRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    channelIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    channelName: {
      flex: 1,
      fontSize: tokens.font.base ?? 14,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    emptyContainer: {
      paddingVertical: tokens.space.lg ?? 24,
      alignItems: "center",
    },
    emptyText: {
      fontSize: tokens.font.sm ?? 12,
      color: colors.textSecondary,
    },
    cancelButton: {
      marginTop: tokens.space.sm ?? 8,
      marginHorizontal: tokens.space.md ?? 12,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.surfaceDim,
      alignItems: "center",
    },
    cancelText: {
      fontSize: tokens.font.base ?? 14,
      fontWeight: "700",
      color: colors.textSecondary,
    },
  });
}
