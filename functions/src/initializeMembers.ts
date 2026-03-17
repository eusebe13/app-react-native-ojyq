import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { membersInitData } from "../../lib/memberData";

/**
 * Cloud Function pour initialiser les utilisateurs Firebase
 *
 * Appelée une seule fois lors de la première utilisation
 * Crée les utilisateurs dans Firebase Auth et Firestore
 *
 * Sécurité:
 * - Accessible seulement aux utilisateurs authentifiés
 * - Vérification que l'appelant est admin
 */
export const initializeMembers = functions.https.onCall(async (data, context) => {
  // Vérifier que l'utilisateur est authentifié
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Vous devez être connecté"
    );
  }

  // Vérifier que l'utilisateur est admin
  const adminDoc = await admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();

  if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Seuls les admins peuvent initialiser les utilisateurs"
    );
  }

  // Vérifier si l'initialisation a déjà été faite
  const initFlagDoc = await admin
    .firestore()
    .collection("_system")
    .doc("initialization")
    .get();

  if (initFlagDoc.exists && initFlagDoc.data()?.completed) {
    return {
      success: true,
      message: "Les utilisateurs ont déjà été initialisés",
      alreadyInitialized: true,
    };
  }

  const results = {
    success: [] as string[],
    failed: [] as { email: string; error: string }[],
    total: membersInitData.length,
  };

  // Grouper les utilisateurs par rôle pour créer la collection roles
  const roleMap = new Map<string, any[]>();
  const directoryData: Record<string, any> = {};

  // Créer chaque utilisateur
  for (const member of membersInitData) {
    try {
      // Vérifier si l'utilisateur existe déjà
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(member.email);
      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          // Créer le nouvel utilisateur
          userRecord = await admin.auth().createUser({
            email: member.email,
            password: member.password,
            displayName: `${member.firstName} ${member.lastName}`,
          });
        } else {
          throw error;
        }
      }

      // Créer/Mettre à jour le document Firestore
      const userData = {
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: member.role,
        createdAt: new Date().toISOString(),
        avatarPreset: null,
        status: "Actif" as const,
      };

      await admin
        .firestore()
        .collection("users")
        .doc(userRecord.uid)
        .set(userData, { merge: true });

      // Créer les données financières
      const paymentData = {
        paidThisYear: 0,
        debt: 0,
        lastPaymentDate: null,
        createdAt: new Date().toISOString(),
      };

      await admin
        .firestore()
        .collection("users")
        .doc(userRecord.uid)
        .collection("financial")
        .doc("payment")
        .set(paymentData, { merge: true });

      // Ajouter à la collection roles (pour faciliter les requêtes par rôle)
      const roleRef = admin
        .firestore()
        .collection("roles")
        .doc(member.role)
        .collection("members");

      await roleRef.doc(userRecord.uid).set({
        uid: userRecord.uid,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        fullName: `${member.firstName} ${member.lastName}`,
        addedAt: new Date().toISOString(),
      });

      // Ajouter au directory (annuaire complet)
      directoryData[userRecord.uid] = {
        uid: userRecord.uid,
        firstName: member.firstName,
        lastName: member.lastName,
        fullName: `${member.firstName} ${member.lastName}`,
        email: member.email,
        role: member.role,
      };

      // Ajouter à la map pour la création de documents de rôle
      if (!roleMap.has(member.role)) {
        roleMap.set(member.role, []);
      }
      roleMap.get(member.role)!.push({
        uid: userRecord.uid,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        fullName: `${member.firstName} ${member.lastName}`,
      });

      results.success.push(member.email);
      console.log(`✅ Utilisateur créé: ${member.email}`);
    } catch (error: any) {
      results.failed.push({
        email: member.email,
        error: error.message || String(error),
      });
      console.error(`❌ Erreur pour ${member.email}:`, error);
    }
  }

  // Créer des documents de rôle avec la liste des membres
  for (const [role, members] of roleMap.entries()) {
    try {
      await admin
        .firestore()
        .collection("roles")
        .doc(role)
        .set(
          {
            name: role,
            count: members.length,
            members: members,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      console.log(`✅ Rôle créé/mis à jour: ${role} (${members.length} membres)`);
    } catch (error: any) {
      console.error(`❌ Erreur pour le rôle ${role}:`, error);
    }
  }

  // Créer le document directory (annuaire complet)
  try {
    await admin
      .firestore()
      .collection("_system")
      .doc("directory")
      .set(
        {
          users: directoryData,
          totalUsers: results.success.length,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    console.log(`✅ Directory créé avec ${results.success.length} utilisateurs`);
  } catch (error: any) {
    console.error(`❌ Erreur lors de la création du directory:`, error);
  }

  // Marquer l'initialisation comme complète
  if (results.failed.length === 0) {
    await admin
      .firestore()
      .collection("_system")
      .doc("initialization")
      .set(
        {
          completed: true,
          completedAt: new Date().toISOString(),
          completedBy: context.auth.uid,
          totalCreated: results.success.length,
        },
        { merge: true }
      );
  }

  return {
    success: results.failed.length === 0,
    message:
      results.failed.length === 0
        ? "Tous les utilisateurs ont été créés avec succès"
        : `${results.success.length}/${results.total} utilisateurs créés`,
    results,
    alreadyInitialized: false,
  };
});

/**
 * Cloud Function pour vérifier le statut d'initialisation
 */
export const checkInitializationStatus = functions.https.onCall(
  async (data, context) => {
    // Vérifier que l'utilisateur est authentifié
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Vous devez être connecté"
      );
    }

    const initFlagDoc = await admin
      .firestore()
      .collection("_system")
      .doc("initialization")
      .get();

    if (initFlagDoc.exists && initFlagDoc.data()?.completed) {
      return {
        initialized: true,
        completedAt: initFlagDoc.data()?.completedAt,
        totalCreated: initFlagDoc.data()?.totalCreated,
      };
    }

    return {
      initialized: false,
    };
  }
);
