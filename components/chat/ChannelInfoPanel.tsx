/**
 * ChannelInfoPanel — panneau d'informations d'un canal
 * S'ouvre via un tap sur le header du canal.
 * Contient : membres, sondages avec résultats, galerie fichiers/images.
 */

import { DismissableModal } from "@/components/ui/DismissableModal";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image, Linking } from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import type { ChatMessage } from "./types";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  channelId: string;
  channelName: string;
  messages: ChatMessage[];
}

type Tab = "members" | "polls" | "media";

export default function ChannelInfoPanel({
  visible,
  onDismiss,
  channelId,
  channelName,
  messages,
}: Props) {
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<Tab>("members");
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Charger tous les membres actifs
  useEffect(() => {
    if (!visible) return;
    setLoadingMembers(true);
    getDocs(collection(db, "users"))
      .then((snap) => {
        setMembers(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((u: any) => u.status !== "Arrêt")
            .sort((a: any, b: any) =>
              (a.firstName ?? "").localeCompare(b.firstName ?? ""),
            ),
        );
      })
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, [visible]);

  // Extraire les sondages depuis les messages
  const polls = useMemo(
    () => messages.filter((m) => m.poll != null).reverse(),
    [messages],
  );

  // Extraire les médias (images + fichiers)
  const mediaItems = useMemo(
    () =>
      messages
        .filter((m) => m.image || m.file)
        .reverse(),
    [messages],
  );

  const tabConfig: { id: Tab; label: string; icon: string }[] = [
    { id: "members", label: "Membres", icon: "people-outline" },
    { id: "polls", label: "Sondages", icon: "stats-chart-outline" },
    { id: "media", label: "Médias", icon: "images-outline" },
  ];

  return (
    <DismissableModal visible={visible} onDismiss={onDismiss} animationType="slide">
      <View
        style={{
          width: "92%",
          maxWidth: 480,
          backgroundColor: colors.surfaceDim,
          borderRadius: 20,
          overflow: "hidden",
          maxHeight: "85%",
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}>
              {channelName}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              Informations du canal
            </Text>
          </View>
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {tabConfig.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                paddingVertical: 10,
                borderBottomWidth: 2,
                borderBottomColor:
                  activeTab === tab.id ? colors.primary : "transparent",
              }}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={activeTab === tab.id ? colors.primary : colors.textSecondary}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: activeTab === tab.id ? "700" : "500",
                  color: activeTab === tab.id ? colors.primary : colors.textSecondary,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {activeTab === "members" && (
          loadingMembers ? (
            <View style={{ padding: 32, alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ padding: 12 }}
              ListEmptyComponent={
                <Text style={{ color: colors.textTertiary, textAlign: "center", padding: 24 }}>
                  Aucun membre trouvé.
                </Text>
              }
              renderItem={({ item }) => {
                const name = [item.firstName, item.lastName].filter(Boolean).join(" ") || item.email || item.id;
                return (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      gap: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.primary + "22",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
                        {(name[0] ?? "?").toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary }}>
                        {name}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                        {item.role ?? "Membre"}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )
        )}

        {activeTab === "polls" && (
          <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 12 }}>
            {polls.length === 0 ? (
              <Text style={{ color: colors.textTertiary, textAlign: "center", padding: 24 }}>
                Aucun sondage dans ce canal.
              </Text>
            ) : (
              polls.map((msg) => {
                const poll = msg.poll!;
                const totalVotes = poll.options.reduce(
                  (sum, o) => sum + o.voters.length,
                  0,
                );
                return (
                  <View
                    key={msg._id}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: colors.textPrimary,
                        marginBottom: 8,
                      }}
                    >
                      {poll.question}
                    </Text>
                    {poll.options.map((opt, i) => {
                      const pct = totalVotes > 0 ? (opt.voters.length / totalVotes) * 100 : 0;
                      return (
                        <View key={i} style={{ marginBottom: 6 }}>
                          <View
                            style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}
                          >
                            <Text style={{ fontSize: 13, color: colors.textPrimary }}>
                              {opt.text}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                              {opt.voters.length} ({Math.round(pct)}%)
                            </Text>
                          </View>
                          <View
                            style={{
                              height: 6,
                              backgroundColor: colors.border,
                              borderRadius: 3,
                              overflow: "hidden",
                            }}
                          >
                            <View
                              style={{
                                height: "100%",
                                width: `${pct}%`,
                                backgroundColor: colors.primary,
                                borderRadius: 3,
                              }}
                            />
                          </View>
                        </View>
                      );
                    })}
                    <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4 }}>
                      {totalVotes} vote{totalVotes !== 1 ? "s" : ""} au total
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {activeTab === "media" && (
          <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 12 }}>
            {mediaItems.length === 0 ? (
              <Text style={{ color: colors.textTertiary, textAlign: "center", padding: 24 }}>
                Aucun média partagé dans ce canal.
              </Text>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {mediaItems.map((msg) => {
                  if (msg.image) {
                    return (
                      <Image
                        key={msg._id}
                        source={{ uri: msg.image }}
                        style={{
                          width: 96,
                          height: 96,
                          borderRadius: 8,
                          backgroundColor: colors.border,
                        }}
                        resizeMode="cover"
                      />
                    );
                  }
                  if (msg.file) {
                    return (
                      <TouchableOpacity
                        key={msg._id}
                        onPress={() => Linking.openURL(msg.file!.uri).catch(() => {})}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 8,
                          padding: 8,
                          width: "100%",
                          marginBottom: 2,
                        }}
                      >
                        <Ionicons name="document-outline" size={18} color={colors.primary} />
                        <Text
                          style={{ fontSize: 13, color: colors.textPrimary, flex: 1 }}
                          numberOfLines={1}
                        >
                          {msg.file.name}
                        </Text>
                        <Ionicons name="download-outline" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    );
                  }
                  return null;
                })}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </DismissableModal>
  );
}
