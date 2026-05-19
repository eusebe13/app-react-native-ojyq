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

function isChannelVisible(ch: any, uid: string | null | undefined, userRole: string): boolean {
  const effectiveAudience = ch.audienceType ?? (ch.type === "public" ? "public" : "private");

  if (ch.createdBy === uid) return true;
  if (effectiveAudience === "public") return true;
  if (effectiveAudience === "private" || effectiveAudience === "direct") {
    return !!(ch.members && ch.members.includes(uid));
  }
  if (effectiveAudience === "roles") {
    return !!(ch.allowedRoles && ch.allowedRoles.includes(userRole));
  }
  return false;
}

export function useChannelsPreview({ uid, userRole = "Membre", maxCount = 4 }: Options = {}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "channels"),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map(channelFromFirestore);
        const visible = all.filter((ch) => isChannelVisible(ch, uid, userRole));
        setTotalCount(visible.length);
        setChannels(visible.slice(0, maxCount));
        setLoading(false);
      },
      (err) => {
        console.error("[useChannelsPreview]", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [uid, userRole, maxCount]);

  return { channels, totalCount, loading };
}
