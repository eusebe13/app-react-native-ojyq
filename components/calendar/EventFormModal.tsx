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

export interface EventFormData {
  title: string;
  description: string;
  locationLabel: string;
  locationAddress: string;
  date: Date;
  saveAddress: boolean;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editingId: string | null;
  initialValues?: Partial<EventFormData>;
  savedLocations: Array<{ id: string; label: string; address: string }>;
  onSave: (data: EventFormData) => Promise<void>;
}

export function EventFormModal({
  visible,
  onDismiss,
  editingId,
  initialValues,
  savedLocations,
  onSave,
}: Props) {
  const { colors } = useAppTheme();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [date, setDate] = useState(new Date());
  const [saveAddress, setSaveAddress] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Réinitialise le formulaire à chaque ouverture
  useEffect(() => {
    if (visible) {
      setTitle(initialValues?.title ?? "");
      setDescription(initialValues?.description ?? "");
      setLocationLabel(initialValues?.locationLabel ?? "");
      setLocationAddress(initialValues?.locationAddress ?? "");
      setDate(initialValues?.date ?? new Date());
      setSaveAddress(false);
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
  }, [visible]);

  const onChangeDate = (_: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      const next = new Date(date);
      next.setFullYear(selectedDate.getFullYear());
      next.setMonth(selectedDate.getMonth());
      next.setDate(selectedDate.getDate());
      setDate(next);
    }
  };

  const onChangeTime = (_: any, selectedTime?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (selectedTime) {
      const next = new Date(date);
      next.setHours(selectedTime.getHours());
      next.setMinutes(selectedTime.getMinutes());
      setDate(next);
    }
  };

  const openDatePicker = () => {
    setShowTimePicker(false);
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    setShowDatePicker(false);
    setShowTimePicker(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showToast("Le titre est obligatoire", "error");
      return;
    }
    if (!locationLabel.trim()) {
      showToast("Le label du lieu est obligatoire", "error");
      return;
    }
    if (!editingId && date < new Date()) {
      showToast("L'événement est dans le passé.", "error");
      return;
    }
    if (saveAddress) {
      const exists = savedLocations.some(
        (l) =>
          l.label.toLowerCase().trim() === locationLabel.toLowerCase().trim(),
      );
      if (exists) {
        showToast("Ce label existe déjà. Choisissez-en un autre.", "error");
        return;
      }
    }

    await onSave({ title, description, locationLabel, locationAddress, date, saveAddress });
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
            marginBottom: 20,
            color: colors.textPrimary,
          }}
        >
          {editingId ? "Modifier l'événement" : "Nouvel Événement"}
        </Text>

        <ScrollView
          style={{ width: "100%", flexGrow: 0, flexShrink: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {/* Titre */}
          <Text style={labelStyle}>Titre *</Text>
          <TextInput
            style={inputStyle}
            value={title}
            onChangeText={setTitle}
            placeholder="Nom de l'activité"
            placeholderTextColor={colors.textTertiary}
          />

          {/* Description */}
          <Text style={labelStyle}>Description</Text>
          <TextInput
            style={[inputStyle, { height: 80, textAlignVertical: "top", paddingTop: 10 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Détails de l'événement (optionnel)"
            placeholderTextColor={colors.textTertiary}
            multiline
          />

          {/* Date & Heure */}
          <View style={{ flexDirection: "row", width: "100%", justifyContent: "space-between" }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={labelStyle}>Date</Text>
              <TouchableOpacity
                style={{
                  width: "100%",
                  height: 45,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  marginBottom: 15,
                  backgroundColor: colors.surface,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={openDatePicker}
              >
                <Text style={{ color: colors.textPrimary }}>
                  {date.toLocaleDateString("fr-FR")}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#666" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={onChangeDate}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Heure</Text>
              <TouchableOpacity
                style={{
                  width: "100%",
                  height: 45,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  marginBottom: 15,
                  backgroundColor: colors.surface,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={openTimePicker}
              >
                <Text style={{ color: colors.textPrimary }}>
                  {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </Text>
                <Ionicons name="time-outline" size={18} color="#666" />
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={date}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={onChangeTime}
                />
              )}
            </View>
          </View>

          {/* Suggestions de lieux sauvegardés */}
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
                      backgroundColor:
                        locationLabel === loc.label ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor:
                        locationLabel === loc.label ? colors.primary : colors.border,
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

          {/* Label du lieu */}
          <Text style={labelStyle}>Label du lieu *</Text>
          <TextInput
            style={inputStyle}
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="Ex : Gymnase Principal"
            placeholderTextColor={colors.textTertiary}
          />

          {/* Adresse du lieu */}
          <Text style={labelStyle}>Adresse du lieu</Text>
          <TextInput
            style={inputStyle}
            value={locationAddress}
            onChangeText={setLocationAddress}
            placeholder="Ex : 1100 Rue Notre-Dame O, Montréal"
            placeholderTextColor={colors.textTertiary}
          />

          {/* Case à cocher Enregistrer adresse */}
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
        </ScrollView>

        {/* Boutons */}
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
              {editingId ? "Mettre à jour" : "Ajouter"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </DismissableModal>
  );
}
