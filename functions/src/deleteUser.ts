import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

const CALLER_ROLES = ["Président", "Administrateur", "Vice-Président"];

export const deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Non authentifié");
  }

  const callerDoc = await admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();

  const callerRole = callerDoc.data()?.role as string | undefined;
  if (!callerDoc.exists || !CALLER_ROLES.includes(callerRole ?? "")) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Seuls les admins peuvent supprimer un membre"
    );
  }

  const { uid } = data as { uid: string };
  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "uid requis");
  }

  // Block deletion of Administrateur
  const targetDoc = await admin.firestore().collection("users").doc(uid).get();
  if (targetDoc.data()?.role === "Administrateur") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Impossible de supprimer un Administrateur"
    );
  }

  // Delete from Auth
  await admin.auth().deleteUser(uid);

  // Delete Firestore doc
  await admin.firestore().collection("users").doc(uid).delete();

  return { success: true };
});
