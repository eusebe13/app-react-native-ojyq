/**
 * useMembers — real-time subscription to all user profiles for admin use.
 *
 * Uses onSnapshot so the list updates automatically whenever any member
 * document changes in Firestore (role edit, status change, etc.).
 * Sorted alphabetically by last name then first name.
 */

import { db } from "@/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
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

    useEffect(() => {
        // Real-time listener — re-renders automatically on any member change
        const unsub = onSnapshot(
            collection(db, "users"),
            (snap) => {
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
                setLoading(false);
            },
            (error) => {
                console.error("useMembers:", error);
                setLoading(false);
            }
        );

        // Cleanup: detach listener when component unmounts
        return unsub;
    }, []);

    // refetch is a no-op: the onSnapshot listener keeps data permanently fresh.
    // Kept for backwards compatibility with pull-to-refresh in the admin screen.
    const refetch = () => {};

    return { members, loading, refetch };
}
