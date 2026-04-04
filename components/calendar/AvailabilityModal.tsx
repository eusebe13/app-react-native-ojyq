import { showToast } from "@/components/Toast";
import { DismissableModal } from "@/components/ui/DismissableModal";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const EMPTY_DAYS = [false, false, false, false, false, false, false];

export interface AvailabilityData {
  selectedDayNames: string[];
  startHours: number;
  startMinutes: number;
  endHours: number;
  endMinutes: number;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSave: (data: AvailabilityData) => Promise<void>;
}

export function AvailabilityModal({ visible, onDismiss, onSave }: Props) {
  const { colors } = useAppTheme();

  const [selectedDays, setSelectedDays] = useState<boolean[]>([...EMPTY_DAYS]);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Réinitialise à l'ouverture
  useEffect(() => {
    if (visible) {
      setSelectedDays([...EMPTY_DAYS]);
      setStartTime(new Date());
      setEndTime(new Date());
      setShowStartPicker(false);
      setShowEndPicker(false);
    }
  }, [visible]);

  const toggleDay = (index: number) => {
    const next = [...selectedDays];
    next[index] = !next[index];
    setSelectedDays(next);
  };

  const handleSave = async () => {
    if (startTime >= endTime) {
      showToast("L'heure de fin doit être après l'heure de début", "error");
      return;
    }
    if (!selectedDays.some(Boolean)) {
      showToast("Sélectionnez au moins un jour", "error");
      return;
    }

    await onSave({
      selectedDayNames: DAY_NAMES.filter((_, i) => selectedDays[i]),
      startHours: startTime.getHours(),
      startMinutes: startTime.getMinutes(),
      endHours: endTime.getHours(),
      endMinutes: endTime.getMinutes(),
    });
  };

  const labelStyle = {
    alignSelf: "flex-start" as const,
    color: colors.textSecondary,
    marginBottom: 5,
    fontSize: 12,
    fontWeight: "600" as const,
  };

  const timePickerRow = {
    width: "100%" as const,
    height: 45,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: colors.surface,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
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
          maxHeight: "85%" as const,
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
          Ajouter une disponibilité
        </Text>

        <ScrollView
          style={{ width: "100%", flexGrow: 0, flexShrink: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {/* Jours de la semaine */}
          <Text style={labelStyle}>Jours de la semaine</Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            {DAY_LABELS.map((day, index) => (
              <TouchableOpacity
                key={`day-${day}`}
                style={[
                  {
                    width: "13%",
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                    alignItems: "center" as const,
                    marginBottom: 8,
                  },
                  selectedDays[index] && { backgroundColor: colors.primary },
                ]}
                onPress={() => toggleDay(index)}
              >
                <Text
                  style={[
                    { fontSize: 12, color: colors.textPrimary, fontWeight: "600" },
                    selectedDays[index] && { color: colors.surface },
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Heure de début */}
          <Text style={labelStyle}>Heure de début</Text>
          <TouchableOpacity
            style={timePickerRow}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={{ fontSize: 14, color: colors.textPrimary, flex: 1 }}>
              {startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </Text>
            <Ionicons name="time" size={20} color="#007AFF" />
          </TouchableOpacity>
          {showStartPicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              display="spinner"
              onChange={(_: any, t?: Date) => {
                if (t) setStartTime(t);
                if (Platform.OS === "android") setShowStartPicker(false);
              }}
            />
          )}

          {/* Heure de fin */}
          <Text style={labelStyle}>Heure de fin</Text>
          <TouchableOpacity
            style={timePickerRow}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={{ fontSize: 14, color: colors.textPrimary, flex: 1 }}>
              {endTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </Text>
            <Ionicons name="time" size={20} color="#007AFF" />
          </TouchableOpacity>
          {showEndPicker && (
            <DateTimePicker
              value={endTime}
              mode="time"
              display="spinner"
              onChange={(_: any, t?: Date) => {
                if (t) setEndTime(t);
                if (Platform.OS === "android") setShowEndPicker(false);
              }}
            />
          )}
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
            <Text style={{ color: colors.surface, fontWeight: "bold" }}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </DismissableModal>
  );
}
