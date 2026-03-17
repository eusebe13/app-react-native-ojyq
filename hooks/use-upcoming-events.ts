/**
 * useUpcomingEvents — real-time listener for future events from Firestore.
 *
 * Returns the next `maxCount` events whose date >= now, ordered ascending.
 * Client-side filtering avoids requiring a composite Firestore index.
 */

import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { CalendarItem, eventFromFirestore } from "@/types/models";

export function useUpcomingEvents(maxCount = 4) {
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the next 20 events ordered by date, filter future ones client-side
    const q = query(
      collection(db, "events"),
      orderBy("date", "asc"),
      limit(20)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        // Show events from today's midnight onwards (include in-progress today events)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const upcoming = snap.docs
          .map(eventFromFirestore)
          .filter((e) => (e.dateObj ?? new Date(0)) >= todayStart)
          .slice(0, maxCount);
        setEvents(upcoming);
        setLoading(false);
      },
      (err) => {
        console.error("[useUpcomingEvents]", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [maxCount]);

  return { events, loading };
}
