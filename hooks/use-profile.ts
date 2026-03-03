import { db } from "@/firebaseConfig";
import useAuth from "@/hooks/use-auth";
import { UserProfile } from "@/types";
import {
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";

const DEFAULT_PROFILE: UserProfile = {
    firstName: "",
    lastName: "",
    role: "Membre",
    status: "Actif",
    birthDate: null,
    postalCode: "",
    phoneNumber: "",
    gender: null,
    languages: [],
    darkMode: false,
    notifAgenda: true,
    notifMessages: true,
    avatarUrl: undefined,
    avatarPreset: undefined,
};

export function useProfile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) return;

        const docRef = doc(db, "users", user.uid);

        // Real-time listener — re-renders the UI on every Firestore change
        const unsub = onSnapshot(
            docRef,
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setProfile({
                        firstName: data.firstName ?? "",
                        lastName: data.lastName ?? "",
                        role: data.role ?? "Membre",
                        status: data.status ?? "Actif",
                        birthDate: data.birthDate?.toDate?.() ?? null,
                        postalCode: data.postalCode ?? "",
                        phoneNumber: data.phoneNumber ?? "",
                        gender: data.gender ?? null,
                        languages: data.languages ?? [],
                        darkMode: data.darkMode ?? false,
                        notifAgenda: data.notifAgenda !== false,
                        notifMessages: data.notifMessages !== false,
                        avatarUrl: data.avatarUrl ?? undefined,
                        avatarPreset: data.avatarPreset ?? undefined,
                    });
                } else {
                    // Document doesn't exist yet — seed with email prefix
                    const emailPrefix = user.email?.split("@")[0] ?? "";
                    setProfile((prev) => ({ ...prev, firstName: emailPrefix }));
                }
                setLoading(false);
            },
            (error) => {
                console.error("useProfile – listener error:", error);
                setLoading(false);
            }
        );

        // Cleanup: detach listener when user changes or component unmounts
        return unsub;
    }, [user]);

    /**
     * Merge-updates the user document in Firestore.
     * No manual setProfile() needed — the onSnapshot listener picks up the
     * write immediately from the local cache and updates the UI automatically.
     */
    const saveProfile = async (data: Partial<UserProfile>) => {
        if (!user) return;
        setSaving(true);
        try {
            const docRef = doc(db, "users", user.uid);
            const payload: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
            if (data.birthDate !== undefined) {
                payload.birthDate = data.birthDate ?? null;
            }
            await setDoc(docRef, payload, { merge: true });
        } catch (error) {
            console.error("useProfile – save error:", error);
            throw error;
        } finally {
            setSaving(false);
        }
    };

    return { profile, loading, saving, saveProfile };
}
