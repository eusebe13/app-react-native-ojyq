/**
 * Edit Profile — Personal Information Form
 *
 * Design:
 *  • Modern card-based form layout
 *  • Smooth animations and transitions
 *  • Real-time field validation with feedback
 *  • Sections: Basic Info, Contact, Preferences
 *  • Enhanced visual feedback for interactions
 *  • Loading states and error handling
 */

import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useProfile } from "@/hooks/use-profile";
import { Language, UserProfile } from "@/types";

export default function EditProfile() {
  const router = useRouter();
  const { profile, saving, saveProfile } = useProfile();
  const { colors, tokens } = useAppTheme();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phoneNumber: profile.phoneNumber,
    postalCode: profile.postalCode,
    gender: profile.gender,
    birthDate: profile.birthDate,
  });

  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>(
    profile.languages || [],
  );

  const availableLanguages: Language[] = [
    "Français",
    "Anglais",
    "Kiswahili",
    "Kinande",
  ];

  const toggleLanguage = (language: Language) => {
    setSelectedLanguages((prev) =>
      prev.includes(language)
        ? prev.filter((lang) => lang !== language)
        : [...prev, language],
    );
  };

  useEffect(() => {
    setFormData({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phoneNumber: profile.phoneNumber,
      postalCode: profile.postalCode,
      gender: profile.gender,
      birthDate: profile.birthDate,
    });
    setSelectedLanguages(profile.languages || []);
  }, [profile]);

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case "firstName":
      case "lastName":
        if (!value.trim()) {
          newErrors[field] = "Ce champ est requis";
        } else if (value.length < 2) {
          newErrors[field] = "Minimum 2 caractères";
        } else {
          delete newErrors[field];
        }
        break;
      case "phoneNumber":
        if (value && !/^\d{10}/.test(value.replace(/\D/g, ""))) {
          newErrors[field] = "Format invalide";
        } else {
          delete newErrors[field];
        }
        break;
      case "postalCode":
        if (value) {
          // Canadian postal code format: A1A 1A1
          const cleanedPostalCode = value.toUpperCase().replace(/\s/g, "");
          if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleanedPostalCode)) {
            newErrors[field] = "Format invalide (ex: A1A 1A1)";
          } else {
            delete newErrors[field];
          }
        } else {
          delete newErrors[field];
        }
        break;
      case "birthDate":
        if (value) {
          // DD/MM/YYYY format
          const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
          if (!dateRegex.test(value)) {
            newErrors[field] = "Format invalide (ex: 25/12/2000)";
          } else {
            const [day, month, year] = value.split("/").map(Number);
            const date = new Date(year, month - 1, day);
            if (
              date.getDate() !== day ||
              date.getMonth() !== month - 1 ||
              date.getFullYear() !== year
            ) {
              newErrors[field] = "Date invalide";
            } else if (date > new Date()) {
              newErrors[field] = "La date ne peut pas être dans le futur";
            } else {
              delete newErrors[field];
            }
          }
        } else {
          delete newErrors[field];
        }
        break;
    }

    setErrors(newErrors);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleFieldBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const renderErrorMessage = (field: string) => {
    if (touched[field] && errors[field]) {
      return (
        <Text style={[styles.errorText, { color: colors.accent6 }]}>
          {errors[field]}
        </Text>
      );
    }
    return null;
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    if (selectedDate) {
      setFormData((prev) => ({ ...prev, birthDate: selectedDate }));
      setTouched((prev) => ({ ...prev, birthDate: true }));
      validateField(
        "birthDate",
        `${String(selectedDate.getDate()).padStart(2, "0")}/${String(selectedDate.getMonth() + 1).padStart(2, "0")}/${selectedDate.getFullYear()}`,
      );
    }
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    setTouched({
      firstName: true,
      lastName: true,
      phoneNumber: true,
      postalCode: true,
      gender: true,
    });

    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      Alert.alert("Erreur", "Le nom et prénom sont requis");
      return;
    }

    if (Object.keys(errors).length > 0) {
      Alert.alert("Erreur", "Veuillez corriger les erreurs");
      return;
    }

    try {
      const birthDate = formData.birthDate
        ? typeof formData.birthDate === "string"
          ? new Date(formData.birthDate)
          : formData.birthDate
        : null;
      await saveProfile({
        ...formData,
        languages: selectedLanguages,
        birthDate,
      });
      Alert.alert("Succès", "Profil mis à jour avec succès");
      router.back();
    } catch {
      Alert.alert("Erreur", "Impossible de sauvegarder le profil");
    }
  };

  const styles = getStyles(colors, tokens);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surfaceDim }]}
      edges={["left", "right", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section: Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations Personnelles</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Prénom *</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor:
                    touched.firstName && errors.firstName
                      ? colors.accent6
                      : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Votre prénom"
                placeholderTextColor={colors.textSecondary}
                value={formData.firstName}
                onChangeText={(val) => handleInputChange("firstName", val)}
                onBlur={() => handleFieldBlur("firstName")}
                editable={!saving}
              />
            </View>
            {renderErrorMessage("firstName")}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nom *</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor:
                    touched.lastName && errors.lastName
                      ? colors.accent6
                      : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Votre nom"
                placeholderTextColor={colors.textSecondary}
                value={formData.lastName}
                onChangeText={(val) => handleInputChange("lastName", val)}
                onBlur={() => handleFieldBlur("lastName")}
                editable={!saving}
              />
            </View>
            {renderErrorMessage("lastName")}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Genre</Text>
            <View style={styles.genderButtons}>
              {["Homme", "Femme", "Autre"].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.genderButton,
                    formData.gender === gender && [
                      styles.genderButtonActive,
                      {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ],
                  ]}
                  onPress={() => handleInputChange("gender", gender)}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      formData.gender === gender &&
                        styles.genderButtonTextActive,
                    ]}
                  >
                    {gender}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Date de Naissance</Text>
            <TouchableOpacity
              style={[
                styles.inputContainer,
                {
                  borderColor:
                    touched.birthDate && errors.birthDate
                      ? colors.accent6
                      : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={() => setShowDatePicker(true)}
              disabled={saving}
            >
              <View style={styles.datePickerButton}>
                <Text
                  style={[
                    styles.input,
                    { color: colors.textPrimary },
                    !formData.birthDate && { color: colors.textSecondary },
                  ]}
                >
                  {formData.birthDate
                    ? typeof formData.birthDate === "string"
                      ? formData.birthDate
                      : formData.birthDate instanceof Date
                        ? `${String(formData.birthDate.getDate()).padStart(2, "0")}/${String(formData.birthDate.getMonth() + 1).padStart(2, "0")}/${formData.birthDate.getFullYear()}`
                        : "JJ/MM/AAAA"
                    : "JJ/MM/AAAA"}
                </Text>
              </View>
            </TouchableOpacity>
            {renderErrorMessage("birthDate")}
          </View>
        </View>
        {/* Section: Languages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Langues</Text>
          <Text style={styles.sectionDescription}>
            Selectionnez les langues que vous parlez
          </Text>
          <View style={styles.languagesGrid}>
            {availableLanguages.map((language) => (
              <TouchableOpacity
                key={language}
                style={[
                  styles.languageButton,
                  selectedLanguages.includes(language) && [
                    styles.languageButtonActive,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ],
                ]}
                onPress={() => toggleLanguage(language)}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    selectedLanguages.includes(language) &&
                      styles.languageButtonTextActive,
                  ]}
                >
                  {language}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section: Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor:
                    touched.phoneNumber && errors.phoneNumber
                      ? colors.accent6
                      : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="+33 6 12 34 56 78"
                placeholderTextColor={colors.textSecondary}
                value={formData.phoneNumber}
                onChangeText={(val) => handleInputChange("phoneNumber", val)}
                onBlur={() => handleFieldBlur("phoneNumber")}
                keyboardType="phone-pad"
                editable={!saving}
              />
            </View>
            {renderErrorMessage("phoneNumber")}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Code Postal</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor:
                    touched.postalCode && errors.postalCode
                      ? colors.accent6
                      : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="A1A 1A1"
                placeholderTextColor={colors.textSecondary}
                value={formData.postalCode}
                onChangeText={(val) => handleInputChange("postalCode", val)}
                onBlur={() => handleFieldBlur("postalCode")}
                keyboardType="default"
                editable={!saving}
              />
            </View>
            {renderErrorMessage("postalCode")}
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={
            formData.birthDate instanceof Date ? formData.birthDate : new Date()
          }
          mode="date"
          display="spinner"
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1920, 0, 1)}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
      padding: tokens.space.lg,
      paddingBottom: tokens.space.xxxl,
    },
    section: {
      marginBottom: tokens.space.xxl,
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.space.xl,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: tokens.font.sm,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: tokens.space.lg,
    },
    fieldGroup: {
      marginBottom: tokens.space.xl,
    },
    label: {
      fontSize: tokens.font.xs,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: tokens.space.sm,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    inputContainer: {
      borderWidth: 1.5,
      borderRadius: tokens.radius.md,
      overflow: "hidden",
      backgroundColor: colors.surface,
      paddingHorizontal: tokens.space.md,
      paddingVertical: 0,
    },
    input: {
      fontSize: tokens.font.md,
      fontWeight: "500",
      paddingVertical: tokens.space.md,
      color: colors.textPrimary,
    },
    datePickerButton: {
      paddingVertical: tokens.space.md,
      paddingHorizontal: 0,
      justifyContent: "center",
    },
    errorText: {
      fontSize: tokens.font.xs,
      fontWeight: "500",
      marginTop: tokens.space.xs,
      letterSpacing: 0.3,
    },
    genderButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: tokens.space.md,
    },
    genderButton: {
      flex: 1,
      paddingVertical: tokens.space.md,
      paddingHorizontal: tokens.space.md,
      borderRadius: tokens.radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
    },
    genderButtonActive: { borderWidth: 0 },
    genderButtonText: {
      textAlign: "center",
      fontSize: tokens.font.base,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    genderButtonTextActive: { color: "#FFFFFF" },
    languagesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.space.sm,
    },
    languageButton: {
      paddingVertical: tokens.space.sm,
      paddingHorizontal: tokens.space.md,
      borderRadius: tokens.radius.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: tokens.space.xs,
    },
    languageButtonActive: { borderWidth: 0 },
    languageButtonText: {
      textAlign: "center",
      fontSize: tokens.font.sm,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    languageButtonTextActive: { color: "#FFFFFF" },
    sectionDescription: {
      fontSize: tokens.font.sm,
      color: colors.textSecondary,
      marginBottom: tokens.space.md,
      lineHeight: 18,
    },
    buttonContainer: {
      marginTop: tokens.space.xxl,
      gap: tokens.space.md,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: tokens.space.md,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: {
      color: "#FFFFFF",
      fontSize: tokens.font.base,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
  });
