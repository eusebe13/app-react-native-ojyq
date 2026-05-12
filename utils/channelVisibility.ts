/**
 * Shared channel visibility predicate.
 * Mirrors the filter logic used in chat.tsx `visibleChannels`.
 * Admin status does NOT bypass private/DM membership — admins see what they
 * actually belong to, same as any other user.
 */
export function isChannelVisible(
  ch: any,
  uid: string | null | undefined,
  userRole: string,
): boolean {
  const effectiveAudience =
    ch.audienceType ?? (ch.type === "public" ? "public" : "private");

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
