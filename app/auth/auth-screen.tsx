// auth-screen.tsx
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { signIn, signUp, resetPassword } from "./../../hooks/use-auth";
import { getFirebaseErrorMessage } from "@/lib/firebase-errors";
import styles from "./auth-screen.styles";

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
  onToggleSecure?: () => void;
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
  onToggleSecure,
}: InputFieldProps) => {
  const input = (
    <TextInput
      style={[
        styles.input,
        !editable && styles.inputDisabled,
        onToggleSecure && { paddingRight: 90 },
      ]}
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

  if (onToggleSecure) {
    return (
      <View style={{ position: "relative" }}>
        {input}
        <TouchableOpacity
          style={{
            position: "absolute",
            right: 16,
            top: 0,
            bottom: 0,
            justifyContent: "center",
          }}
          onPress={onToggleSecure}
          disabled={!editable}
        >
          <Text style={{ color: "#A5B4FC", fontSize: 13, fontWeight: "600" }}>
            {secureTextEntry ? "Afficher" : "Masquer"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return input;
};

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
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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
    () => mode === "signin" || mode === "forgot" || password === confirmPassword,
    [mode, password, confirmPassword],
  );

  const canSubmit = useMemo(() => {
    if (mode === "forgot") return emailValid && !loading;
    return emailValid && passwordValid && confirmPasswordValid && !loading;
  }, [mode, emailValid, passwordValid, confirmPasswordValid, loading]);

  const title = useMemo(() => {
    if (mode === "forgot") return "Mot de passe oublié";
    return mode === "signin" ? "Connexion" : "Créer un compte";
  }, [mode]);

  const subtitle = useMemo(() => {
    if (mode === "forgot") return "Recevez un lien de réinitialisation";
    return mode === "signin"
      ? "Accédez à votre compte"
      : "Rejoignez la communauté OJYQ";
  }, [mode]);

  const handleAuth = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const trimmedEmail = email.trim();

      if (mode === "forgot") {
        await resetPassword(trimmedEmail);
        setResetSent(true);
        return;
      }

      if (mode === "signin") {
        await signIn(trimmedEmail, password);
      } else {
        if (!emailValid) throw new Error("L'email doit se terminer par @ojyq.org");
        if (!passwordValid) throw new Error("Le mot de passe doit contenir min. 6 caractères, dont au moins 1 chiffre et 1 lettre.");
        if (password !== confirmPassword) throw new Error("Les mots de passe ne correspondent pas.");
        await signUp(trimmedEmail, password, username.trim());
      }
    } catch (error) {
      setErrorMsg(getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setErrorMsg("");
    setConfirmPassword("");
    setResetSent(false);
  };

  const goToForgot = () => {
    setMode("forgot");
    setErrorMsg("");
    setResetSent(false);
  };

  const goToSignIn = () => {
    setMode("signin");
    setErrorMsg("");
    setResetSent(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <ScrollView
        style={styles.scroll}
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

          {/* ── Forgot password — success state ── */}
          {mode === "forgot" && resetSent ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✉️</Text>
              <Text style={styles.successTitle}>Email envoyé !</Text>
              <Text style={styles.successText}>
                Vérifiez votre boîte mail {email.trim()} et suivez le lien pour réinitialiser votre mot de passe.
              </Text>
              <TouchableOpacity
                style={[styles.button, { marginTop: 24 }]}
                onPress={goToSignIn}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Retour à la connexion</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ── Email field ── */}
              <View style={styles.inputContainer}>
                <InputField
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email (@ojyq.org)"
                  editable={!loading}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType={mode === "forgot" ? "done" : "next"}
                  onSubmitEditing={mode === "forgot" && canSubmit ? handleAuth : undefined}
                />
                {email.length > 0 && (
                  <ValidationHint
                    isValid={emailValid}
                    message="L'email doit se terminer par @ojyq.org"
                  />
                )}
              </View>

              {/* ── Username (signup only) ── */}
              {mode === "signup" && (
                <View style={styles.inputContainer}>
                  <InputField
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Nom d'utilisateur"
                    editable={!loading}
                    autoCapitalize="none"
                  />
                  {username.length > 0 && (
                    <ValidationHint
                      isValid={username.trim().length > 0}
                      message="Le nom d'utilisateur ne peut pas être vide"
                    />
                  )}
                </View>
              )}

              {/* ── Password (signin + signup only) ── */}
              {mode !== "forgot" && (
                <View style={styles.inputContainer}>
                  <InputField
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Mot de passe"
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    onToggleSecure={() => setShowPassword((v) => !v)}
                  />
                  {password.length > 0 && (
                    <ValidationHint
                      isValid={passwordValid}
                      message="Min. 6 caractères, avec au moins 1 chiffre et 1 lettre"
                    />
                  )}

                  {/* Forgot password link — signin only */}
                  {mode === "signin" && (
                    <TouchableOpacity
                      onPress={goToForgot}
                      disabled={loading}
                      activeOpacity={0.7}
                      style={styles.forgotLink}
                    >
                      <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* ── Confirm password (signup only) ── */}
              {mode === "signup" && (
                <View style={styles.inputContainer}>
                  <InputField
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirmer le mot de passe"
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={canSubmit ? handleAuth : undefined}
                    onToggleSecure={() => setShowConfirmPassword((v) => !v)}
                  />
                  {confirmPassword.length > 0 && (
                    <ValidationHint
                      isValid={confirmPasswordValid}
                      message="Les mots de passe ne correspondent pas"
                    />
                  )}
                </View>
              )}

              {/* ── Error ── */}
              {errorMsg ? (
                <View style={styles.errorContainer}>
                  <ErrorMessage message={errorMsg} />
                </View>
              ) : null}

              {/* ── Submit ── */}
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
                    {mode === "signin"
                      ? "Se connecter"
                      : mode === "signup"
                      ? "Créer le compte"
                      : "Envoyer le lien"}
                  </Text>
                )}
              </TouchableOpacity>

              {/* ── Bottom link ── */}
              {mode === "forgot" ? (
                <TouchableOpacity
                  onPress={goToSignIn}
                  disabled={loading}
                  activeOpacity={0.7}
                  style={styles.switchButton}
                >
                  <Text style={styles.switchText}>← Retour à la connexion</Text>
                </TouchableOpacity>
              ) : (
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
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
};

export default AuthScreen;
