/**
 * Hook pour accéder au directory des utilisateurs
 *
 * Fournit des fonctions pour lire les utilisateurs par rôle ou globalement
 */

import { db } from "@/firebaseConfig";
import {
    collection,
    doc,
    getDoc,
    getDocs
} from "firebase/firestore";
import { useEffect, useState } from "react";

export type UserInfo = {
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role?: string;
};

export type RoleDirectory = {
  name: string;
  count: number;
  members: UserInfo[];
  updatedAt: string;
};

/**
 * Récupère tous les utilisateurs d'un rôle spécifique
 */
export const getUsersByRole = async (role: string): Promise<UserInfo[]> => {
  try {
    const roleRef = collection(db, "roles", role, "members");
    const snapshot = await getDocs(roleRef);
    return snapshot.docs.map((doc) => doc.data() as UserInfo);
  } catch (error) {
    console.error(`Erreur lors de la récupération des utilisateurs du rôle ${role}:`, error);
    return [];
  }
};

/**
 * Récupère les informations d'un rôle complet (nom, compte, membres)
 */
export const getRoleDirectory = async (role: string): Promise<RoleDirectory | null> => {
  try {
    const roleDoc = await getDoc(doc(db, "roles", role));
    if (roleDoc.exists()) {
      return roleDoc.data() as RoleDirectory;
    }
    return null;
  } catch (error) {
    console.error(`Erreur lors de la récupération du rôle ${role}:`, error);
    return null;
  }
};

/**
 * Récupère tous les rôles disponibles
 */
export const getAllRoles = async (): Promise<string[]> => {
  try {
    const rolesRef = collection(db, "roles");
    const snapshot = await getDocs(rolesRef);
    return snapshot.docs.map((doc) => doc.id);
  } catch (error) {
    console.error("Erreur lors de la récupération des rôles:", error);
    return [];
  }
};

/**
 * Récupère le directory complet (annuaire de tous les utilisateurs)
 */
export const getDirectoryData = async (): Promise<Record<string, UserInfo> | null> => {
  try {
    const directoryDoc = await getDoc(doc(db, "_system", "directory"));
    if (directoryDoc.exists()) {
      return directoryDoc.data().users as Record<string, UserInfo>;
    }
    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération du directory:", error);
    return null;
  }
};

/**
 * Hook React pour récupérer les utilisateurs d'un rôle
 */
export const useUsersByRole = (role: string) => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await getUsersByRole(role);
        setUsers(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [role]);

  return { users, loading, error };
};

/**
 * Hook React pour récupérer le directory complet
 */
export const useDirectory = () => {
  const [directory, setDirectory] = useState<Record<string, UserInfo> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        setLoading(true);
        const data = await getDirectoryData();
        setDirectory(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectory();
  }, []);

  return { directory, loading, error };
};

/**
 * Hook React pour récupérer un rôle spécifique avec ses membres
 */
export const useRoleDirectory = (role: string) => {
  const [roleData, setRoleData] = useState<RoleDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        setLoading(true);
        const data = await getRoleDirectory(role);
        setRoleData(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [role]);

  return { roleData, loading, error };
};
