import { useEffect } from "react";
import * as Updates from "expo-updates";
import { useUpdateStatus } from "@/contexts/UpdateContext";

export function useUpdateCheck() {
  const { setHasUpdate } = useUpdateStatus();

  useEffect(() => {
    if (__DEV__) return;
    checkAndFetch(setHasUpdate);
  }, []);
}

async function checkAndFetch(setHasUpdate: (v: boolean) => void) {
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;
    await Updates.fetchUpdateAsync();
    setHasUpdate(true);
  } catch (e) {
    console.warn("[updates] check failed:", e);
  }
}
