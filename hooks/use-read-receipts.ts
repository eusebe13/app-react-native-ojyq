// hooks/use-read-receipts.ts
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import useAuth from "@/hooks/use-auth";

/**
 * Writes channels/{channelId}.lastMessageReadBy.{uid} when the channel
 * screen loses focus. The channel screen reads this from its existing
 * channelDoc snapshot to render read receipt avatars.
 */
export function useWriteReadReceipt(channelId: string | null | undefined) {
  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!user?.uid || !channelId) return;
        updateDoc(doc(db, "channels", channelId), {
          [`lastMessageReadBy.${user.uid}`]: serverTimestamp(),
        }).catch(() => {});
      };
    }, [user?.uid, channelId]),
  );
}
