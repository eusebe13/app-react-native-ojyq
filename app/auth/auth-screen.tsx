// auth-screen.tsx
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import styles from "./auth-screen.styles";
import { signIn, signUp } from "./../../hooks/use-auth";

interface InputFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  editable?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
  returnKeyType?: "done" | "next";
  onSubmitEditing?: () => void;
}

const InputField = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  editable = true,
  autoCapitalize = "none",
  keyboardType = "default",
  returnKeyType = "next",
  onSubmitEditing,
}: InputFieldProps) => (
  <TextInput
    style={[styles.input, !editable && styles.inputDisabled]}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="rgba(148, 163, 184, 0.6)"
    secureTextEntry={secureTextEntry}
    editable={editable}
    autoCapitalize={autoCapitalize}
    keyboardType={keyboardType}
    returnKeyType={returnKeyType}
    onSubmitEditing={onSubmitEditing}
  />
);

const ErrorMessage = ({ message }: { message: string }) =>
  message ? <Text style={styles.errorText}>{message}</Text> : null;

const ValidationHint = ({
  isValid,
  message,
}: {
  isValid: boolean;
  message: string;
}) => (!isValid ? <Text style={styles.hintText}>{message}</Text> : null);

const AuthScreen = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Validation logic
  const emailValid = useMemo(
    () => email.trim().length > 0 && email.trim().endsWith("@ojyq.org"),
    [email],
  );

  const passwordValid = useMemo(
    () =>
      password.length >= 6 &&
      /[0-9]/.test(password) &&
      /[a-zA-Z]/.test(password),
    [password],
  );

  const confirmPasswordValid = useMemo(
    () => mode === "signin" || password === confirmPassword,
    [mode, password, confirmPassword],
  );

  const canSubmit = useMemo(
    () => emailValid && passwordValid && confirmPasswordValid && !loading,
    [emailValid, passwordValid, confirmPasswordValid, loading],
  );

  const title = useMemo(
    () => (mode === "signin" ? "Connexion" : "Créer un compte"),
    [mode],
  );

  const subtitle = useMemo(
    () =>
      mode === "signin"
        ? "Accédez à votre compte"
        : "Rejoignez la communauté OJYQ",
    [mode],
  );

  const handleAuth = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const trimmedEmail = email.trim();

      if (mode === "signin") {
        await signIn(trimmedEmail, password);
      } else {
        if (!emailValid) {
          throw new Error("L'email doit se terminer par @ojyq.org");
        }
        if (!passwordValid) {
          throw new Error(
            "Le mot de passe doit contenir min. 6 caractères, dont au moins 1 chiffre et 1 lettre.",
          );
        }
        if (password !== confirmPassword) {
          throw new Error("Les mots de passe ne correspondent pas.");
        }

        await signUp(trimmedEmail, password);
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Une erreur est survenue.");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setErrorMsg("");
    setConfirmPassword("");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={{
              uri: "https://ojyq.org/wp-content/uploads/2025/04/IMG-20250318-WA0007.jpg",
            }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <InputField
              value={email}
              onChangeText={setEmail}
              placeholder="Email (@ojyq.org)"
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {email.length > 0 && (
              <ValidationHint
                isValid={emailValid}
                message="L'email doit se terminer par @ojyq.org"
              />
            )}
          </View>

          <View style={styles.inputContainer}>
            <InputField
              value={password}
              onChangeText={setPassword}
              placeholder="Mot de passe"
              secureTextEntry
              editable={!loading}
            />
            {password.length > 0 && (
              <ValidationHint
                isValid={passwordValid}
                message="Min. 6 caractères, avec au moins 1 chiffre et 1 lettre"
              />
            )}
          </View>

          {mode === "signup" && (
            <View style={styles.inputContainer}>
              <InputField
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmer le mot de passe"
                secureTextEntry
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={canSubmit ? handleAuth : undefined}
              />
              {confirmPassword.length > 0 && (
                <ValidationHint
                  isValid={confirmPasswordValid}
                  message="Les mots de passe ne correspondent pas"
                />
              )}
            </View>
          )}

          {errorMsg && (
            <View style={styles.errorContainer}>
              <ErrorMessage message={errorMsg} />
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === "signin" ? "Se connecter" : "Créer le compte"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleMode}
            disabled={loading}
            activeOpacity={0.7}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {mode === "signin"
                ? "Pas de compte ? S'inscrire"
                : "Déjà inscrit ? Se connecter"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default AuthScreen;
