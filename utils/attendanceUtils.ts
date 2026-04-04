/**
 * Formats an attendance list for clipboard export.
 * Pure function — no side effects.
 */
export function formatAttendanceText(
  eventTitle: string,
  eventDate: Date,
  onlineNames: string[],
  physicalNames: string[],
): string {
  const dateStr = eventDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const header = `Présences — ${eventTitle} (${dateStr})`;

  if (onlineNames.length === 0 && physicalNames.length === 0) {
    return `${header}\nAucune présence enregistrée.`;
  }

  const lines: string[] = [header];
  if (onlineNames.length > 0) {
    lines.push(`En ligne (${onlineNames.length}) : ${onlineNames.join(", ")}`);
  }
  if (physicalNames.length > 0) {
    lines.push(`Présentiel (${physicalNames.length}) : ${physicalNames.join(", ")}`);
  }
  return lines.join("\n");
}
