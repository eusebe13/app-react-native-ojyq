/**
 * QR Attendance Screen
 *
 * Two flows accessible via tabs:
 *  - "En ligne"   (Online)   — scans a member's QR code for remote presence
 *  - "Physique"   (Physical) — scans a member's QR code for on-site presence
 *
 * QR payload format expected (JSON string):
 *   { "name": "Jean Dupont", "email": "jean.dupont@ojyq.org" }
 *
 * On success: stores { name, email, entryTimestamp, attendanceType, scannedBy }
 * to the top-level Firestore collection "attendance".
 *
 * Pattern: State Machine — the screen moves through 4 states:
 *   idle → scanning → confirming → saved
 *
 * Dependencies: expo-camera ~17.0.x, firebase/firestore
 */

import { showToast } from "@/components/Toast";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../firebaseConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceType = "online" | "physical";

interface ScannedPayload {
  name: string;
  email: string;
}

type ScanState = "idle" | "scanning" | "confirming" | "saving" | "saved";

// ─── Constants ────────────────────────────────────────────────────────────────

const RESCAN_DELAY_MS = 2000;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttendanceScreen() {
  const auth = getAuth();
  const { colors, tokens } = useAppTheme();

  const [activeTab, setActiveTab] = useState<AttendanceType>("online");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scannedPayload, setScannedPayload] = useState<ScannedPayload | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Ref-based lock prevents multiple Firestore writes before state update settles
  const isProcessing = useRef(false);

  // ── Permission guards ──────────────────────────────────────────────────────

  if (!permission) {
    return <LoadingScreen colors={colors} />;
  }

  if (!permission.granted) {
    return (
      <PermissionScreen
        colors={colors}
        tokens={tokens}
        onRequest={requestPermission}
      />
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (isProcessing.current || scanState !== "scanning") return;
      isProcessing.current = true;

      try {
        const payload = parseQRPayload(data);
        setScannedPayload(payload);
        setScanState("confirming");
      } catch {
        showToast("Ce code QR n'est pas un code de présence OJYQ.", "error");
        isProcessing.current = false;
        setScanState("scanning");
        // Release lock after a short delay to prevent rapid re-trigger
        setTimeout(() => {
          isProcessing.current = false;
        }, RESCAN_DELAY_MS);
      }
    },
    [scanState],
  );

  const handleConfirmAttendance = async () => {
    if (!scannedPayload) return;
    setScanState("saving");

    try {
      await addDoc(collection(db, "attendance"), {
        name: scannedPayload.name,
        email: scannedPayload.email,
        entryTimestamp: Timestamp.now(),
        attendanceType: activeTab,
        scannedBy: auth.currentUser?.uid ?? "unknown",
      });
      setScanState("saved");
    } catch (error) {
      console.error("Attendance save error:", error);
      showToast("Impossible d'enregistrer la présence.", "error");
      setScanState("confirming");
    }
  };

  const handleReset = () => {
    setScannedPayload(null);
    setScanState("idle");
    isProcessing.current = false;
  };

  const handleStartScanning = () => setScanState("scanning");

  // ── Render ─────────────────────────────────────────────────────────────────

  const s = buildStyles(colors, tokens);

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Présence QR</Text>
        <Text style={s.headerSubtitle}>
          Scannez le code QR d'un membre pour enregistrer sa présence
        </Text>
      </View>

      {/* Tab selector */}
      <View style={s.tabRow}>
        <TabButton
          label="En ligne"
          icon="wifi-outline"
          active={activeTab === "online"}
          accentColor={colors.accent2 ?? "#06B6D4"}
          colors={colors}
          tokens={tokens}
          onPress={() => { setActiveTab("online"); handleReset(); }}
        />
        <TabButton
          label="Physique"
          icon="location-outline"
          active={activeTab === "physical"}
          accentColor={colors.accent5 ?? "#10B981"}
          colors={colors}
          tokens={tokens}
          onPress={() => { setActiveTab("physical"); handleReset(); }}
        />
      </View>

      {/* Body */}
      <View style={s.body}>
        {scanState === "idle" && (
          <IdleView
            activeTab={activeTab}
            colors={colors}
            tokens={tokens}
            onStart={handleStartScanning}
          />
        )}

        {scanState === "scanning" && (
          <ScannerView
            colors={colors}
            tokens={tokens}
            onBarcodeScanned={handleBarcodeScanned}
            onCancel={handleReset}
          />
        )}

        {scanState === "confirming" && scannedPayload && (
          <ConfirmView
            payload={scannedPayload}
            activeTab={activeTab}
            colors={colors}
            tokens={tokens}
            onConfirm={handleConfirmAttendance}
            onCancel={handleReset}
          />
        )}

        {scanState === "saving" && <LoadingScreen colors={colors} />}

        {scanState === "saved" && scannedPayload && (
          <SuccessView
            payload={scannedPayload}
            activeTab={activeTab}
            colors={colors}
            tokens={tokens}
            onScanNext={handleReset}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function IdleView({
  activeTab,
  colors,
  tokens,
  onStart,
}: {
  activeTab: AttendanceType;
  colors: any;
  tokens: any;
  onStart: () => void;
}) {
  const isOnline = activeTab === "online";
  const accentColor = isOnline ? (colors.accent2 ?? "#06B6D4") : (colors.accent5 ?? "#10B981");

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: accentColor + "20",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Ionicons
          name={isOnline ? "wifi" : "location"}
          size={48}
          color={accentColor}
        />
      </View>

      <Text
        style={{
          fontSize: tokens.font.xl,
          fontWeight: "700",
          color: colors.textPrimary,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {isOnline ? "Présence en ligne" : "Présence physique"}
      </Text>
      <Text
        style={{
          fontSize: tokens.font.base,
          color: colors.textSecondary,
          textAlign: "center",
          marginBottom: 40,
          lineHeight: 22,
        }}
      >
        {isOnline
          ? "Scannez le QR d'un membre pour confirmer sa présence à distance."
          : "Scannez le QR d'un membre présent sur place pour enregistrer son arrivée."}
      </Text>

      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: accentColor,
          paddingVertical: 14,
          paddingHorizontal: 32,
          borderRadius: tokens.radius.pill,
          gap: 10,
        }}
        onPress={onStart}
      >
        <Ionicons name="qr-code-outline" size={22} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: tokens.font.base }}>
          Scanner un QR
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ScannerView({
  colors,
  tokens,
  onBarcodeScanned,
  onCancel,
}: {
  colors: any;
  tokens: any;
  onBarcodeScanned: (e: { data: string }) => void;
  onCancel: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={onBarcodeScanned}
      />

      {/* Overlay with scanning frame */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {/* Corner-frame indicator */}
        <View
          style={{
            width: 220,
            height: 220,
            borderWidth: 2,
            borderColor: colors.primary,
            borderRadius: tokens.radius.lg,
            backgroundColor: "transparent",
          }}
        />
        <Text
          style={{
            color: "#fff",
            marginTop: 20,
            fontSize: tokens.font.sm,
            fontWeight: "600",
            textShadowColor: "rgba(0,0,0,0.8)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
          }}
        >
          Alignez le QR dans le cadre
        </Text>
      </View>

      {/* Cancel button */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 40,
          alignSelf: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
          paddingVertical: 12,
          paddingHorizontal: 28,
          borderRadius: tokens.radius.pill,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
        onPress={onCancel}
      >
        <Ionicons name="close-circle-outline" size={20} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: tokens.font.base }}>
          Annuler
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ConfirmView({
  payload,
  activeTab,
  colors,
  tokens,
  onConfirm,
  onCancel,
}: {
  payload: ScannedPayload;
  activeTab: AttendanceType;
  colors: any;
  tokens: any;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <View
        style={{
          backgroundColor: colors.surfaceDim,
          borderRadius: tokens.radius.xl,
          padding: 24,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            fontSize: tokens.font.xxl,
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: 4,
          }}
        >
          Confirmer la présence
        </Text>
        <Text
          style={{
            fontSize: tokens.font.sm,
            color: colors.textSecondary,
            marginBottom: 24,
          }}
        >
          {activeTab === "online" ? "En ligne" : "Physique"} •{" "}
          {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </Text>

        <InfoRow label="Nom" value={payload.name} colors={colors} tokens={tokens} />
        <InfoRow label="Email" value={payload.email} colors={colors} tokens={tokens} />
        <InfoRow
          label="Heure d'entrée"
          value={new Date().toLocaleString("fr-FR")}
          colors={colors}
          tokens={tokens}
        />

        <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 14,
              alignItems: "center",
              borderRadius: tokens.radius.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            onPress={onCancel}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 2,
              paddingVertical: 14,
              alignItems: "center",
              borderRadius: tokens.radius.md,
              backgroundColor: colors.primary,
            }}
            onPress={onConfirm}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SuccessView({
  payload,
  activeTab,
  colors,
  tokens,
  onScanNext,
}: {
  payload: ScannedPayload;
  activeTab: AttendanceType;
  colors: any;
  tokens: any;
  onScanNext: () => void;
}) {
  const accentColor = activeTab === "online"
    ? (colors.accent2 ?? "#06B6D4")
    : (colors.accent5 ?? "#10B981");

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: accentColor + "20",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Ionicons name="checkmark-circle" size={52} color={accentColor} />
      </View>

      <Text
        style={{
          fontSize: tokens.font.xl,
          fontWeight: "700",
          color: colors.textPrimary,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Présence enregistrée !
      </Text>
      <Text
        style={{
          fontSize: tokens.font.base,
          color: colors.textSecondary,
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        {payload.name}
      </Text>
      <Text style={{ fontSize: tokens.font.sm, color: colors.textTertiary, marginBottom: 40 }}>
        {payload.email}
      </Text>

      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.primary,
          paddingVertical: 14,
          paddingHorizontal: 32,
          borderRadius: tokens.radius.pill,
          gap: 10,
        }}
        onPress={onScanNext}
      >
        <Ionicons name="qr-code-outline" size={20} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: tokens.font.base }}>
          Scanner suivant
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Utility sub-components ───────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  colors,
  tokens,
}: {
  label: string;
  value: string;
  colors: any;
  tokens: any;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <Text style={{ fontSize: tokens.font.sm, color: colors.textSecondary, fontWeight: "600" }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: tokens.font.sm,
          color: colors.textPrimary,
          fontWeight: "500",
          maxWidth: "60%",
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  accentColor,
  colors,
  tokens,
  onPress,
}: {
  label: string;
  icon: any;
  active: boolean;
  accentColor: string;
  colors: any;
  tokens: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: tokens.radius.md,
        backgroundColor: active ? accentColor : "transparent",
        marginHorizontal: 4,
      }}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? "#fff" : colors.textSecondary}
      />
      <Text
        style={{
          fontSize: tokens.font.sm,
          fontWeight: active ? "700" : "500",
          color: active ? "#fff" : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function LoadingScreen({ colors }: { colors: any }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function PermissionScreen({
  colors,
  tokens,
  onRequest,
}: {
  colors: any;
  tokens: any;
  onRequest: () => void;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Ionicons name="camera-outline" size={64} color={colors.textTertiary} />
      <Text
        style={{
          fontSize: tokens.font.lg,
          fontWeight: "700",
          color: colors.textPrimary,
          marginTop: 20,
          marginBottom: 10,
          textAlign: "center",
        }}
      >
        Accès caméra requis
      </Text>
      <Text
        style={{
          fontSize: tokens.font.base,
          color: colors.textSecondary,
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        L'application a besoin d'accéder à votre caméra pour scanner les QR codes de présence.
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: colors.primary,
          paddingVertical: 14,
          paddingHorizontal: 32,
          borderRadius: tokens.radius.pill,
        }}
        onPress={onRequest}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: tokens.font.base }}>
          Autoriser la caméra
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses a QR code string into a ScannedPayload.
 * Supports JSON format: { "name": "...", "email": "..." }
 * Throws if the payload is invalid.
 */
function parseQRPayload(raw: string): ScannedPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("QR payload is not valid JSON");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as any).name !== "string" ||
    typeof (parsed as any).email !== "string"
  ) {
    throw new Error("QR payload is missing required name/email fields");
  }

  return {
    name: (parsed as any).name.trim(),
    email: (parsed as any).email.trim().toLowerCase(),
  };
}

// ─── Static styles (layout only, colours from theme) ─────────────────────────

function buildStyles(colors: any, tokens: any) {
  return {
    screen: { flex: 1, backgroundColor: colors.surface },
    header: {
      paddingHorizontal: tokens.space.xl,
      paddingTop: tokens.space.lg,
      paddingBottom: tokens.space.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: tokens.font.xxl,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      marginTop: 4,
    },
    tabRow: {
      flexDirection: "row" as const,
      paddingHorizontal: tokens.space.lg,
      paddingVertical: tokens.space.md,
      backgroundColor: colors.surfaceDim,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    body: { flex: 1 },
  };
}
