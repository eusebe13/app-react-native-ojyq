import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";

export type ChangeType = "new" | "fix" | "improve" | "remove";

export interface ReleaseChange {
  type: ChangeType;
  text: string;
}

export interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  summary: string;
  changes: ReleaseChange[];
  publishedAt: Date;
}

export function useReleaseNotes(uid: string | null | undefined) {
  const [latestNote, setLatestNote] = useState<ReleaseNote | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    Promise.all([
      getDocs(
        query(
          collection(db, "releaseNotes"),
          where("isPublished", "==", true),
          orderBy("publishedAt", "desc"),
          limit(1),
        ),
      ),
      getDoc(doc(db, "users", uid)),
    ])
      .then(([snap, userSnap]) => {
        if (cancelled || snap.empty) return;
        const d = snap.docs[0];
        const data = d.data();
        const note: ReleaseNote = {
          id: d.id,
          version: data.version ?? "",
          title: data.title ?? "",
          summary: data.summary ?? "",
          changes: data.changes ?? [],
          publishedAt: data.publishedAt?.toDate() ?? new Date(),
        };
        setLatestNote(note);
        const lastSeen: Date | null =
          userSnap.exists()
            ? (userSnap.data().lastSeenReleaseAt?.toDate?.() ?? null)
            : null;
        if (!lastSeen || note.publishedAt > lastSeen) {
          setIsNew(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const markAsSeen = useCallback(async () => {
    if (!uid) return;
    setIsNew(false);
    await updateDoc(doc(db, "users", uid), {
      lastSeenReleaseAt: Timestamp.now(),
    }).catch(() => {});
  }, [uid]);

  return { latestNote, isNew, loading, markAsSeen };
}
