import { auth, db } from "@/firebaseConfig";
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    User,
} from "firebase/auth";
import {
    addDoc,
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { sendExpoPush } from "@/hooks/use-push-notifications";

// Hook to manage authentication state
export default function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setUser(user ?? null);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    return { user, isLoading };
}

// Function to sign up a user
export const signUp = async (email: string, password: string, username: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 1. Create user document — role Visiteur pending approval
    await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        firstName: username,
        lastName: "",
        role: "Visiteur",
        status: "Actif",
        birthDate: null,
        postalCode: "",
        phoneNumber: "",
        gender: null,
        languages: [],
        darkMode: false,
        notifAgenda: true,
        notifMessages: true,
        createdAt: serverTimestamp(),
    });

    // 2. Create admin approval task
    const taskRef = await addDoc(collection(db, "tasks"), {
        title: `Approuver l'inscription de ${username}`,
        description: "Nouveau visiteur en attente de validation",
        assigneeType: "role",
        assigneeId: "Administrateur",
        assigneeName: "Administrateurs",
        status: "todo",
        priority: "high",
        deadline: null,
        relatedUserId: user.uid,
        createdBy: user.uid,
        createdByName: username,
        createdAt: serverTimestamp(),
    });

    // 3. Store approvalTaskId on the user document
    await updateDoc(doc(db, "users", user.uid), { approvalTaskId: taskRef.id });

    // 4. Push notification to admins (truly fire-and-forget — does not block signUp)
    getDocs(
        query(
            collection(db, "users"),
            where("role", "in", ["Administrateur", "Président", "Vice-Président"])
        )
    ).then((adminSnap) => {
        const tokens = adminSnap.docs
            .map((d) => d.data().expoPushToken as string | undefined)
            .filter((t): t is string => Boolean(t));
        if (tokens.length > 0) {
            sendExpoPush(
                tokens,
                "Nouvelle inscription",
                `${username} attend une validation`,
                { type: "approval" }
            ).catch((e) => console.warn("[signUp] Failed to send push:", e));
        }
    }).catch((e) => console.warn("[signUp] Failed to notify admins:", e));

    return user;
};

// Function to sign in a user
export const signIn = async (email: string, password: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password,
        );
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

// Function to log out a user
export const logOut = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        throw error;
    }
};
