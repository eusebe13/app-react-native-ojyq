/**
 * useMembers — fetches all user profiles from Firestore for admin use.
 *
 * Only the fields needed for the admin view are loaded.
 * Sorted alphabetically by last name then first name.
 */

import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { UserRole, UserStatus } from "@/types";

export type MemberEntry = {
    uid: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    avatarPreset?: number;
};

export function useMembers() {
    const [members, setMembers] = useState<MemberEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const loadMembers = useCallback(async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "users"));
            const result: MemberEntry[] = snap.docs
                .map((d) => ({
                    uid: d.id,
                    firstName: d.data().firstName ?? "",
                    lastName: d.data().lastName ?? "",
                    role: (d.data().role as UserRole) ?? "Membre",
                    status: (d.data().status as UserStatus) ?? "Actif",
                    avatarPreset: d.data().avatarPreset ?? undefined,
                }))
                .sort((a, b) =>
                    `${a.lastName}${a.firstName}`
                        .toLowerCase()
                        .localeCompare(`${b.lastName}${b.firstName}`.toLowerCase())
                );
            setMembers(result);
        } catch (e) {
            console.error("useMembers:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    return { members, loading, refetch: loadMembers };
}
