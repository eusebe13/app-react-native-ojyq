/**
 * useChannelsPreview — real-time listener for recent channels.
 *
 * Returns the `maxCount` most recently active channels the current user
 * has access to, ordered descending by createdAt.
 * Used on the home screen to show a preview of the messaging section.
 */

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { Channel, channelFromFirestore } from "@/types/models";

interface Options {
  uid?: string | null;
  userRole?: string;
  maxCount?: number;
}

function isChannelVisible(ch: any, uid: string | null | undefined, userRole: string, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (ch.createdBy === uid) return true;

  const effectiveAudience = ch.audienceType ?? (ch.type === "public" ? "public" : "private");

  if (effectiveAudience === "public") return true;
  if (effectiveAudience === "private") return !!(ch.members && ch.members.includes(uid));
  if (effectiveAudience === "roles") return !!(ch.allowedRoles && ch.allowedRoles.includes(userRole));

  return false;
}

export function useChannelsPreview({ uid, userRole = "Membre", maxCount = 4 }: Options = {}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = userRole === "Administrateur" || userRole === "Admin";

  useEffect(() => {
    const q = query(
      collection(db, "channels"),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map(channelFromFirestore);
        const visible = all
          .filter((ch) => isChannelVisible(ch, uid, userRole, isAdmin))
          .slice(0, maxCount);
        setChannels(visible);
        setLoading(false);
      },
      (err) => {
        console.error("[useChannelsPreview]", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [uid, userRole, maxCount]);

  return { channels, loading };
}
