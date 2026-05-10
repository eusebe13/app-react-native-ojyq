/**
 * Centralized Firebase error code → user-friendly French message mapping.
 * Use getFirebaseErrorMessage(error) everywhere instead of error.message.
 */

const ERROR_MAP: Record<string, string> = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  "auth/invalid-credential":       "Email ou mot de passe incorrect.",
  "auth/user-not-found":           "Aucun compte associé à cet email.",
  "auth/wrong-password":           "Mot de passe incorrect.",
  "auth/email-already-in-use":     "Cette adresse email est déjà utilisée.",
  "auth/too-many-requests":        "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
  "auth/network-request-failed":   "Erreur réseau. Vérifiez votre connexion internet.",
  "auth/weak-password":            "Le mot de passe est trop faible (minimum 6 caractères).",
  "auth/invalid-email":            "Adresse email invalide.",
  "auth/user-disabled":            "Ce compte a été désactivé. Contactez un administrateur.",
  "auth/operation-not-allowed":    "Opération non autorisée.",
  "auth/requires-recent-login":    "Veuillez vous reconnecter pour effectuer cette action.",
  "auth/popup-closed-by-user":     "Connexion annulée.",
  "auth/account-exists-with-different-credential":
                                   "Un compte existe déjà avec cet email.",
  "auth/credential-already-in-use":"Ces identifiants sont déjà utilisés.",
  "auth/expired-action-code":      "Le lien a expiré. Veuillez recommencer.",
  "auth/invalid-action-code":      "Lien invalide ou déjà utilisé.",

  // ── Firestore ─────────────────────────────────────────────────────────────
  "permission-denied":             "Accès refusé.",
  "unavailable":                   "Service temporairement indisponible. Réessayez dans un instant.",
  "not-found":                     "Donnée introuvable.",
  "already-exists":                "Cette ressource existe déjà.",
  "resource-exhausted":            "Quota atteint. Réessayez plus tard.",
  "deadline-exceeded":             "La requête a pris trop de temps. Vérifiez votre connexion.",
  "cancelled":                     "Opération annulée.",
  "unauthenticated":               "Vous devez être connecté pour effectuer cette action.",
};

/**
 * Extract a user-friendly French message from any Firebase error.
 * Falls back to `fallback` if the code is unknown.
 */
export function getFirebaseErrorMessage(
  error: unknown,
  fallback = "Une erreur est survenue. Veuillez réessayer.",
): string {
  if (!error) return fallback;

  // Firebase JS SDK errors expose `.code`
  const code = (error as any)?.code as string | undefined;
  if (code && ERROR_MAP[code]) return ERROR_MAP[code];

  // Some SDKs embed the code inside the message: "Firebase: Error (auth/invalid-credential)."
  if (error instanceof Error) {
    const match = error.message.match(/\(([^)]+)\)/);
    if (match && ERROR_MAP[match[1]]) return ERROR_MAP[match[1]];
  }

  return fallback;
}
