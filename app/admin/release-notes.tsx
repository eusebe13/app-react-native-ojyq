import { showToast } from "@/components/Toast";
import { Icon } from "@/components/ui/Icon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { db } from "@/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface NoteRow {
  id: string;
  version: string;
  title: string;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}

export default function AdminReleaseNotesScreen() {
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "releaseNotes"), orderBy("createdAt", "desc")),
      );
      setNotes(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            version: data.version ?? "",
            title: data.title ?? "",
            isPublished: data.isPublished ?? false,
            publishedAt: data.publishedAt?.toDate() ?? null,
            createdAt: data.createdAt?.toDate() ?? new Date(),
          };
        }),
      );
    } catch {
      showToast("Erreur de chargement", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotes();
  }, [fetchNotes]);

  const renderItem = useCallback(
    ({ item }: { item: NoteRow }) => (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/admin/release-note-edit?id=${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: item.isPublished ? colors.online : colors.accent3 },
            ]}
          />
          <View style={styles.rowInfo}>
            <View style={styles.rowTitleRow}>
              <Text style={styles.rowVersion}>v{item.version}</Text>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            <Text style={styles.rowMeta}>
              {item.isPublished
                ? `Publié · ${item.publishedAt?.toLocaleDateString("fr-FR") ?? ""}`
                : "Brouillon"}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    ),
    [styles, colors],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surfaceDim }]}
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          title: "Notes de version",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/admin/release-note-edit")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginRight: 4 }}
            >
              <Ionicons name="add-circle" size={26} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="newspaper-outline" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                Aucune note de version
              </Text>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/admin/release-note-edit")}
              >
                <Text style={styles.createBtnText}>Créer la première</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function getStyles(colors: any, tokens: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    listContent: { padding: 16, gap: 8 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
    },
    rowLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    rowInfo: { flex: 1 },
    rowTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
    rowVersion: {
      fontSize: tokens.font.xs ?? 10,
      fontWeight: "700",
      color: colors.primary,
      backgroundColor: colors.surfaceDim,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    rowTitle: {
      fontSize: tokens.font.base ?? 14,
      fontWeight: "600",
      color: colors.textPrimary,
      flex: 1,
    },
    rowMeta: { fontSize: tokens.font.xs ?? 10, color: colors.textSecondary },
    empty: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyText: { fontSize: tokens.font.base ?? 14 },
    createBtn: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
    },
    createBtnText: { color: "#FFF", fontWeight: "700", fontSize: tokens.font.base ?? 14 },
  });
}
