/**
 * Sends push notifications to one or multiple Expo push tokens.
 * Returns stale tokens (DeviceNotRegistered / InvalidCredentials) for cleanup.
 *
 * Extracted here to avoid a require-cycle between use-auth ↔ use-push-notifications.
 */
export async function sendExpoPush(
  tokens: string | string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  categoryId?: string,
): Promise<string[]> {
  const list = Array.isArray(tokens) ? tokens : [tokens];
  if (!list.length) return [];

  const base = {
    sound: "default",
    channelId: "default",
    title,
    body,
    data: data ?? {},
    priority: "high",
    ...(categoryId ? { categoryId } : {}),
  };
  const staleTokens: string[] = [];

  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk.map((to) => ({ to, ...base }))),
      });

      if (!res.ok) {
        console.error("[sendExpoPush] HTTP error:", res.status, res.statusText);
        continue;
      }

      const json = await res.json();
      const tickets: any[] = Array.isArray(json?.data) ? json.data : [];
      tickets.forEach((t, j) => {
        if (t?.status === "error") {
          console.error("[sendExpoPush] ticket error:", t.message, t?.details);
          const errorCode = t?.details?.error;
          if (
            errorCode === "DeviceNotRegistered" ||
            errorCode === "InvalidCredentials"
          ) {
            staleTokens.push(chunk[j]);
          }
        }
      });
    } catch (e) {
      console.error("[sendExpoPush] fetch failed (CORS ou réseau):", e);
    }
  }

  return staleTokens;
}
