import { showToast } from "@/components/Toast";
import { DismissableModal } from "@/components/ui/DismissableModal";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface ProjectFormData {
  name: string;
  description: string;
  locationLabel: string;
  locationAddress: string;
  date: Date | null;
  saveAddress: boolean;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editingId: string | null;
  initialValues?: Partial<ProjectFormData>;
  savedLocations: Array<{ id: string; label: string; address: string }>;
  onSave: (data: ProjectFormData) => Promise<void>;
}

export function ProjectFormModal({
  visible,
  onDismiss,
  editingId,
  initialValues,
  savedLocations,
  onSave,
}: Props) {
  const { colors } = useAppTheme();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialValues?.name ?? "");
      setDescription(initialValues?.description ?? "");
      setLocationLabel(initialValues?.locationLabel ?? "");
      setLocationAddress(initialValues?.locationAddress ?? "");
      setDate(initialValues?.date ?? null);
      setSaveAddress(false);
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
  }, [visible]);

  const dateForPicker = date ?? new Date();

  const onChangeDate = (_: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      const next = new Date(dateForPicker);
      next.setFullYear(selectedDate.getFullYear());
      next.setMonth(selectedDate.getMonth());
      next.setDate(selectedDate.getDate());
      setDate(next);
    }
  };

  const onChangeTime = (_: any, selectedTime?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (selectedTime) {
      const next = new Date(dateForPicker);
      next.setHours(selectedTime.getHours());
      next.setMinutes(selectedTime.getMinutes());
      setDate(next);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast("Le nom du projet est obligatoire", "error");
      return;
    }
    if (saveAddress && locationLabel.trim()) {
      const exists = savedLocations.some(
        (l) => l.label.toLowerCase().trim() === locationLabel.toLowerCase().trim(),
      );
      if (exists) {
        showToast("Ce label existe déjà. Choisissez-en un autre.", "error");
        return;
      }
    }
    await onSave({ name, description, locationLabel, locationAddress, date, saveAddress });
  };

  const inputStyle = {
    width: "100%" as const,
    height: 45,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  };

  const labelStyle = {
    alignSelf: "flex-start" as const,
    color: colors.textSecondary,
    marginBottom: 5,
    fontSize: 12,
    fontWeight: "600" as const,
  };

  return (
    <DismissableModal visible={visible} onDismiss={onDismiss} animationType="slide">
      <View
        style={{
          width: "90%" as const,
          maxWidth: "100%",
          backgroundColor: colors.surfaceDim,
          borderRadius: 20,
          padding: 25,
          alignItems: "center",
          maxHeight: "90%" as const,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 4,
            color: colors.textPrimary,
          }}
        >
          {editingId ? "Modifier le projet" : "Nouveau Projet"}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 20 }}>
          Seul le nom est obligatoire
        </Text>

        <ScrollView
          style={{ width: "100%", flexGrow: 0, flexShrink: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {/* Nom */}
          <Text style={labelStyle}>Nom du projet *</Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder="Nom du projet"
            placeholderTextColor={colors.textTertiary}
          />

          {/* Description */}
          <Text style={labelStyle}>Description</Text>
          <TextInput
            style={[inputStyle, { height: undefined, minHeight: 80, maxHeight: 160, textAlignVertical: "top", paddingTop: 10 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description du projet (optionnel)"
            placeholderTextColor={colors.textTertiary}
            multiline
          />

          {/* Date optionnelle */}
          <Text style={labelStyle}>Date (optionnel)</Text>
          <View style={{ flexDirection: "row", width: "100%", justifyContent: "space-between" }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              {Platform.OS === "web" ? (
                // @ts-ignore – web-only
                <input
                  type="date"
                  value={date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : ""}
                  onChange={(e: any) => {
                    if (!e.target.value) { setDate(null); return; }
                    const [y, m, d] = e.target.value.split("-").map(Number);
                    const next = new Date(dateForPicker);
                    next.setFullYear(y); next.setMonth(m - 1); next.setDate(d);
                    setDate(next);
                  }}
                  onMouseDown={(e: any) => e.stopPropagation()}
                  style={{
                    width: "100%", height: "45px",
                    borderColor: colors.border, borderWidth: "1px", borderStyle: "solid",
                    borderRadius: "8px", paddingLeft: "10px", marginBottom: "15px",
                    backgroundColor: colors.surface, color: date ? colors.textPrimary : colors.textTertiary,
                    fontSize: "14px", cursor: "pointer", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <TouchableOpacity
                  style={{
                    width: "100%", height: 45,
                    borderColor: showDatePicker ? colors.primary : colors.border,
                    borderWidth: showDatePicker ? 2 : 1,
                    borderRadius: 8, paddingHorizontal: 10, marginBottom: 15,
                    backgroundColor: colors.surface, flexDirection: "row",
                    alignItems: "center", justifyContent: "space-between",
                  }}
                  onPress={() => {
                    setShowTimePicker(false);
                    if (!date) setDate(new Date());
                    setShowDatePicker(v => !v);
                  }}
                >
                  <Text style={{ color: date ? colors.textPrimary : colors.textTertiary }}>
                    {date ? date.toLocaleDateString("fr-FR") : "Choisir une date"}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color={showDatePicker ? colors.primary : "#666"} />
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flex: 1 }}>
              {Platform.OS === "web" ? (
                // @ts-ignore – web-only
                <input
                  type="time"
                  value={date ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : ""}
                  onChange={(e: any) => {
                    if (!e.target.value) return;
                    const [h, m] = e.target.value.split(":").map(Number);
                    const next = new Date(dateForPicker);
                    next.setHours(h); next.setMinutes(m);
                    setDate(next);
                  }}
                  onMouseDown={(e: any) => e.stopPropagation()}
                  style={{
                    width: "100%", height: "45px",
                    borderColor: colors.border, borderWidth: "1px", borderStyle: "solid",
                    borderRadius: "8px", paddingLeft: "10px", marginBottom: "15px",
                    backgroundColor: colors.surface, color: date ? colors.textPrimary : colors.textTertiary,
                    fontSize: "14px", cursor: "pointer", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <TouchableOpacity
                  style={{
                    width: "100%", height: 45,
                    borderColor: showTimePicker ? colors.primary : colors.border,
                    borderWidth: showTimePicker ? 2 : 1,
                    borderRadius: 8, paddingHorizontal: 10, marginBottom: 15,
                    backgroundColor: colors.surface, flexDirection: "row",
                    alignItems: "center", justifyContent: "space-between",
                  }}
                  onPress={() => {
                    setShowDatePicker(false);
                    if (!date) setDate(new Date());
                    setShowTimePicker(v => !v);
                  }}
                >
                  <Text style={{ color: date ? colors.textPrimary : colors.textTertiary }}>
                    {date ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "Heure"}
                  </Text>
                  <Ionicons name="time-outline" size={18} color={showTimePicker ? colors.primary : "#666"} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {date && Platform.OS !== "web" && (
            <TouchableOpacity
              onPress={() => { setDate(null); setShowDatePicker(false); setShowTimePicker(false); }}
              style={{ marginBottom: 10, marginTop: -8 }}
            >
              <Text style={{ fontSize: 12, color: colors.accent6 }}>Effacer la date</Text>
            </TouchableOpacity>
          )}

          {/* Lieux sauvegardés */}
          {savedLocations.length > 0 && (
            <>
              <Text style={labelStyle}>Lieux enregistrés</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {savedLocations.map((loc) => (
                  <TouchableOpacity
                    key={loc.id}
                    onPress={() => {
                      setLocationLabel(loc.label);
                      setLocationAddress(loc.address);
                    }}
                    style={{
                      backgroundColor: locationLabel === loc.label ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: locationLabel === loc.label ? colors.primary : colors.border,
                      borderRadius: 20,
                      paddingVertical: 6,
                      paddingHorizontal: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={13}
                      color={locationLabel === loc.label ? "#fff" : colors.textSecondary}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: locationLabel === loc.label ? "#fff" : colors.textPrimary,
                      }}
                    >
                      {loc.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Lieu */}
          <Text style={labelStyle}>Lieu (optionnel)</Text>
          <TextInput
            style={inputStyle}
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="Ex : Gymnase Principal"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={labelStyle}>Adresse (optionnel)</Text>
          <TextInput
            style={inputStyle}
            value={locationAddress}
            onChangeText={setLocationAddress}
            placeholder="Ex : 1100 Rue Notre-Dame O, Montréal"
            placeholderTextColor={colors.textTertiary}
          />

          {locationLabel.trim() !== "" && (
            <TouchableOpacity
              onPress={() => setSaveAddress(!saveAddress)}
              style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  borderWidth: 2,
                  borderColor: saveAddress ? colors.primary : colors.border,
                  backgroundColor: saveAddress ? colors.primary : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {saveAddress && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>
                Enregistrer cette adresse pour une prochaine fois
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Pickers natifs hors du ScrollView — évite les conflits de touch iOS */}
        {Platform.OS !== "web" && showDatePicker && (
          <DateTimePicker
            value={dateForPicker}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onChangeDate}
          />
        )}
        {Platform.OS !== "web" && showTimePicker && (
          <DateTimePicker
            value={dateForPicker}
            mode="time"
            is24Hour={true}
            display="spinner"
            onChange={onChangeTime}
          />
        )}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            width: "100%",
            marginTop: 10,
          }}
        >
          <TouchableOpacity
            onPress={onDismiss}
            style={{ flex: 1, padding: 12, marginRight: 10, alignItems: "center" }}
          >
            <Text style={{ color: colors.accent6, fontWeight: "600" }}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={{
              flex: 1,
              backgroundColor: colors.primary,
              borderRadius: 8,
              padding: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.surface, fontWeight: "bold" }}>
              {editingId ? "Mettre à jour" : "Créer le projet"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </DismissableModal>
  );
}
