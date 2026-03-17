/**
 * Hook pour initialiser les utilisateurs Firebase
 *
 * Appelle la Cloud Function initializeMembers
 * Gère l'état et les erreurs
 */

import { functions } from "@/firebaseConfig";
import { httpsCallable } from "firebase/functions";

export type InitMembersResult = {
  success: boolean;
  message: string;
  alreadyInitialized: boolean;
  results?: {
    success: string[];
    failed: { email: string; error: string }[];
    total: number;
  };
};

/**
 * Initialise les utilisateurs dans Firebase via Cloud Function
 * Seulement les admins peuvent le faire
 *
 * @returns Résultat de l'initialisation
 */
export const initializeUsersInFirebase = async (): Promise<
  InitMembersResult
> => {
  try {
    const initializeMembers = httpsCallable(functions, "initializeMembers");
    const result = await initializeMembers({});
    return result.data as InitMembersResult;
  } catch (error: any) {
    console.error("Erreur lors de l'appel à Cloud Function:", error);
    throw error;
  }
};

/**
 * Vérifie le statut d'initialisation
 *
 * @returns État d'initialisation
 */
export const checkInitializationStatus = async (): Promise<{
  initialized: boolean;
  completedAt?: string;
  totalCreated?: number;
}> => {
  try {
    const checkStatus = httpsCallable(functions, "checkInitializationStatus");
    const result = await checkStatus({});
    return result.data as any;
  } catch (error: any) {
    console.error("Erreur lors de la vérification du statut:", error);
    throw error;
  }
};
