// hooks/use-read-state.ts
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useUnread } from "@/contexts/UnreadContext";

type ItemType = "channel" | "task" | "event";

/**
 * Writes users/{uid}/reads/{itemId} when the screen loses focus.
 * Call this at the top of any screen that should mark itself as read.
 */
export function useReadState(
  itemId: string | null | undefined,
  type: ItemType,
) {
  const { markRead } = useUnread();

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!itemId) return;
        markRead(itemId, type).catch(() => {});
      };
    }, [itemId, type, markRead]),
  );
}
