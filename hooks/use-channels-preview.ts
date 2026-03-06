/**
 * useChannelsPreview — real-time listener for recent channels.
 *
 * Returns the `maxCount` most recently created channels, ordered descending.
 * Used on the home screen to show a preview of the messaging section.
 */

import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { Channel, channelFromFirestore } from "@/types/models";

export function useChannelsPreview(maxCount = 4) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "channels"),
      orderBy("createdAt", "desc"),
      limit(maxCount)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setChannels(snap.docs.map(channelFromFirestore));
        setLoading(false);
      },
      (err) => {
        console.error("[useChannelsPreview]", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [maxCount]);

  return { channels, loading };
}
