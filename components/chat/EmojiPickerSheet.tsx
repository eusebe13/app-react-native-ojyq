import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const emojiData = require("@emoji-mart/data") as any;

interface EmojiPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelected: (emoji: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  people: "😀",
  nature: "🌿",
  foods: "🍕",
  activity: "⚽",
  places: "🏔️",
  objects: "💡",
  symbols: "❤️",
  flags: "🏳️",
};

const CELL_HEIGHT = 44;

function buildCategories() {
  return (emojiData.categories as { id: string; emojis: string[] }[]).map(
    (cat) => ({
      id: cat.id,
      icon: CATEGORY_ICONS[cat.id] ?? "❓",
      emojis: cat.emojis
        .map((id: string) => emojiData.emojis[id]?.skins[0]?.native as string)
        .filter(Boolean),
    })
  );
}

const EmojiPickerSheet = React.memo(function EmojiPickerSheet({
  visible,
  onClose,
  onEmojiSelected,
}: EmojiPickerSheetProps) {
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);

  const categories = useMemo(() => buildCategories(), []);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");

  const activeEmojis = useMemo(
    () => categories.find((c) => c.id === activeCategory)?.emojis ?? [],
    [categories, activeCategory]
  );

  const handleEmojiPress = useCallback(
    (emoji: string) => {
      onEmojiSelected(emoji);
      onClose();
    },
    [onEmojiSelected, onClose]
  );

  const handleCategoryPress = useCallback((id: string) => {
    setActiveCategory(id);
  }, []);

  const renderEmoji = useCallback(
    ({ item }: { item: string }) => (
      <TouchableOpacity
        style={styles.emojiCell}
        onPress={() => handleEmojiPress(item)}
        activeOpacity={0.6}
      >
        <Text style={styles.emojiChar}>{item}</Text>
      </TouchableOpacity>
    ),
    [handleEmojiPress, styles]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<string> | null | undefined, index: number) => ({
      length: CELL_HEIGHT,
      offset: CELL_HEIGHT * Math.floor(index / 8),
      index,
    }),
    []
  );

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
        <Text style={styles.title}>RÉAGIR</Text>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.tab,
                activeCategory === cat.id && styles.tabActive,
              ]}
              onPress={() => handleCategoryPress(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabIcon}>{cat.icon}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Emoji grid */}
        <FlatList
          data={activeEmojis}
          keyExtractor={(item) => item}
          numColumns={8}
          renderItem={renderEmoji}
          getItemLayout={getItemLayout}
          removeClippedSubviews
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
});

export default EmojiPickerSheet;

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
      fontSize: tokens.font.xs ?? 10,
      color: colors.textSecondary,
      letterSpacing: 1,
      textTransform: "uppercase",
      textAlign: "center",
      marginBottom: tokens.space.sm ?? 8,
    },
    tabsScroll: {
      flexGrow: 0,
    },
    tabsContent: {
      paddingHorizontal: tokens.space.sm ?? 8,
      gap: 4,
    },
    tab: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
    tabIcon: {
      fontSize: 24,
    },
    grid: {
      maxHeight: 320,
      marginTop: tokens.space.sm ?? 8,
    },
    gridContent: {
      paddingHorizontal: tokens.space.sm ?? 8,
    },
    emojiCell: {
      flex: 1,
      height: CELL_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
    },
    emojiChar: {
      fontSize: 26,
    },
  });
}
