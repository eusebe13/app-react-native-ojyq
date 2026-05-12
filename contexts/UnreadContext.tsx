// contexts/UnreadContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import useAuth from "@/hooks/use-auth";

type ItemType = "channel" | "task" | "event";

const VALID_ITEM_TYPES: ItemType[] = ["channel", "task", "event"];
function isItemType(v: unknown): v is ItemType {
  return VALID_ITEM_TYPES.includes(v as ItemType);
}

/** In-memory read entry — `lastReadAt` is already converted from Firestore Timestamp to Date */
interface ReadEntryLocal {
  type: ItemType;
  lastReadAt: Date;
}

interface UnreadContextValue {
  readsMap: Record<string, ReadEntryLocal>;
  markRead: (itemId: string, type: ItemType) => Promise<void>;
}

const UnreadContext = createContext<UnreadContextValue>({
  readsMap: {},
  markRead: async () => {},
});

/** Pure helper — exported for unit testing */
export function computeIsUnread(
  lastActivityAt: Date | null | undefined,
  lastReadAt: Date | null | undefined,
): boolean {
  if (!lastActivityAt) return false;
  if (!lastReadAt) return true;
  return lastActivityAt > lastReadAt;
}

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [readsMap, setReadsMap] = useState<Record<string, ReadEntryLocal>>({});

  useEffect(() => {
    if (!user?.uid) {
      setReadsMap({});
      return;
    }
    return onSnapshot(
      query(collection(db, "users", user.uid, "reads")),
      (snap) => {
        const map: Record<string, ReadEntryLocal> = {};
        for (const d of snap.docs) {
          const data = d.data();
          const rawType = data.type;
          if (!isItemType(rawType)) {
            console.warn(`[UnreadContext] unknown type "${rawType}" for doc ${d.id}`);
            continue;
          }
          const ts = data.lastReadAt;
          if (!ts) continue;
          map[d.id] = { type: rawType, lastReadAt: ts.toDate() };
        }
        setReadsMap(map);
      },
    );
  }, [user?.uid]);

  const markRead = useCallback(
    async (itemId: string, type: ItemType) => {
      if (!user?.uid) return;
      await setDoc(
        doc(db, "users", user.uid, "reads", itemId),
        { type, lastReadAt: serverTimestamp() },
        { merge: true },
      ).catch((e) => console.warn("[UnreadContext] markRead failed:", e));
    },
    [user?.uid],
  );

  return (
    <UnreadContext.Provider value={{ readsMap, markRead }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
