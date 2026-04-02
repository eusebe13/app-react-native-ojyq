# Attendance List & Global Coverage Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow all users to view the attendance list of past events (read-only, with copy), and show members the global weekly coverage chart without individual slot details.

**Architecture:** All changes are in `app/(tabs)/calendar.tsx`. A new pure utility `utils/attendanceUtils.ts` extracts the clipboard text formatting logic (testable in isolation). Two independent changes: (1) unlock past event detail + enrich its read-only view, (2) update coverage chart data source and hide slot list for non-admins.

**Tech Stack:** React Native, Expo SDK 54, Firebase Firestore, `expo-clipboard` (already installed `~8.0.8`), Jest (existing test runner)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `utils/attendanceUtils.ts` | Create | Pure function: format clipboard text from attendance data |
| `utils/__tests__/attendanceUtils.test.ts` | Create | Unit tests for `formatAttendanceText` |
| `app/(tabs)/calendar.tsx` | Modify | 4 targeted edits (see tasks below) |

---

## Task 1: Extract and test `formatAttendanceText`

**Files:**
- Create: `utils/attendanceUtils.ts`
- Create: `utils/__tests__/attendanceUtils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `utils/__tests__/attendanceUtils.test.ts`:

```typescript
import { formatAttendanceText } from "../attendanceUtils";

describe("formatAttendanceText", () => {
  const date = new Date("2026-03-15T14:00:00");

  it("formats a list with both online and physical attendees", () => {
    const result = formatAttendanceText("Réunion mensuelle", date, ["Alice M.", "Bob D."], ["Claire T.", "David R."]);
    expect(result).toBe(
      "Présences — Réunion mensuelle (15 mars 2026)\nEn ligne (2) : Alice M., Bob D.\nPrésentiel (2) : Claire T., David R."
    );
  });

  it("omits the online line when there are no online attendees", () => {
    const result = formatAttendanceText("Atelier", date, [], ["Paul S."]);
    expect(result).toBe(
      "Présences — Atelier (15 mars 2026)\nPrésentiel (1) : Paul S."
    );
  });

  it("omits the physical line when there are no physical attendees", () => {
    const result = formatAttendanceText("Sprint review", date, ["Ana K."], []);
    expect(result).toBe(
      "Présences — Sprint review (15 mars 2026)\nEn ligne (1) : Ana K."
    );
  });

  it("returns only the header when no one attended", () => {
    const result = formatAttendanceText("Vide", date, [], []);
    expect(result).toBe("Présences — Vide (15 mars 2026)\nAucune présence enregistrée.");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest utils/__tests__/attendanceUtils.test.ts --no-coverage
```

Expected: `Cannot find module '../attendanceUtils'`

- [ ] **Step 3: Implement `formatAttendanceText`**

Create `utils/attendanceUtils.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest utils/__tests__/attendanceUtils.test.ts --no-coverage
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add utils/attendanceUtils.ts utils/__tests__/attendanceUtils.test.ts
git commit -m "feat: add formatAttendanceText utility with tests"
```

---

## Task 2: Make past events tappable

**Files:**
- Modify: `app/(tabs)/calendar.tsx:1055`

- [ ] **Step 1: Remove the tap block on past events**

In `app/(tabs)/calendar.tsx` at line 1055, replace:

```tsx
onPress={() => phase !== "past" && handleEventPress(item)}
```

with:

```tsx
onPress={() => handleEventPress(item)}
```

- [ ] **Step 2: Verify manually**

Launch the app (`npx expo start`), navigate to the Calendrier tab → Événements tab. Tap on an event marked "TERMINÉ". The detail modal should open and show the "Récapitulatif des présences" section (already exists at line 2275). No participation buttons should appear (they are already gated behind `phase === "future"` and `phase === "ongoing"` conditions).

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/calendar.tsx"
git commit -m "feat: enable tapping past events to view attendance"
```

---

## Task 3: Enrich past event attendance view + copy button

**Files:**
- Modify: `app/(tabs)/calendar.tsx:2272-2371` (phase === "past" section)

This task replaces the existing basic `phase === "past"` block (lines 2275–2371) with an enriched version that:
- Filters to only `online` and `present_physical` (excludes `absent`)
- Sorts: physical first, then online, alphabetically within each group
- Shows counters per status type
- Adds a copy button with 2-second checkmark feedback

- [ ] **Step 1: Add `expo-clipboard` import and `copiedAttendance` state**

In `app/(tabs)/calendar.tsx`, add the import at the top of the file alongside existing imports:

```tsx
import * as Clipboard from "expo-clipboard";
```

Then add a state variable alongside the other state declarations (around line 383):

```tsx
const [copiedAttendance, setCopiedAttendance] = useState(false);
```

- [ ] **Step 2: Replace the `phase === "past"` section**

In `app/(tabs)/calendar.tsx`, replace the entire block starting at `{/* ══════════════════════════════════════════════════` at line 2272 through `)}` at line 2371 with:

```tsx
{/* ══════════════════════════════════════════════════
    PHASE 3 — PAST : liste de présence (lecture seule)
══════════════════════════════════════════════════ */}
{phase === "past" && (() => {
  const attendanceList = participants
    .filter((p) => p.status === "online" || p.status === "present_physical")
    .sort((a, b) => {
      if (a.status === b.status)
        return (a.userName ?? "").localeCompare(b.userName ?? "");
      return a.status === "present_physical" ? -1 : 1;
    });

  const physicalNames = attendanceList
    .filter((p) => p.status === "present_physical")
    .map((p) => p.userName ?? "?");
  const onlineNames = attendanceList
    .filter((p) => p.status === "online")
    .map((p) => p.userName ?? "?");

  const handleCopy = async () => {
    const text = formatAttendanceText(ev.title, ev.dateObj, onlineNames, physicalNames);
    await Clipboard.setStringAsync(text);
    setCopiedAttendance(true);
    setTimeout(() => setCopiedAttendance(false), 2000);
  };

  return (
    <View
      style={{
        backgroundColor: colors.surfaceDim,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Liste de présence
          </Text>
          {attendanceList.length > 0 && (
            <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
              {physicalNames.length > 0 && `${physicalNames.length} présentiel`}
              {physicalNames.length > 0 && onlineNames.length > 0 && " · "}
              {onlineNames.length > 0 && `${onlineNames.length} en ligne`}
            </Text>
          )}
        </View>
        {attendanceList.length > 0 && (
          <TouchableOpacity
            onPress={handleCopy}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: copiedAttendance ? "#10B98120" : colors.surface,
              borderWidth: 1,
              borderColor: copiedAttendance ? "#10B981" : colors.border,
            }}
          >
            <Ionicons
              name={copiedAttendance ? "checkmark" : "copy-outline"}
              size={14}
              color={copiedAttendance ? "#10B981" : colors.textSecondary}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: copiedAttendance ? "#10B981" : colors.textSecondary,
              }}
            >
              {copiedAttendance ? "Copié !" : "Copier"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {attendanceList.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 16 }}>
          <Ionicons name="people-outline" size={32} color={colors.textTertiary} />
          <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 8 }}>
            Aucune présence enregistrée.
          </Text>
        </View>
      ) : (
        attendanceList.map((p, idx) => {
          const isPhysical = p.status === "present_physical";
          const statusColor = isPhysical ? "#007AFF" : "#06B6D4";
          const statusLabel = isPhysical ? "Présentiel" : "En ligne";
          const statusIcon = isPhysical ? "checkmark-circle" : "wifi";
          const at = p.updatedAt?.toDate?.();

          return (
            <View
              key={p.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                borderTopWidth: idx > 0 ? 1 : 0,
                borderTopColor: colors.border,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: statusColor + "22",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: statusColor }}>
                  {(p.userName?.[0] ?? "?").toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary }}>
                  {p.userName}
                </Text>
                {at && (
                  <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                    {at.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}{" "}
                    à {at.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                )}
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: statusColor + "22",
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Ionicons name={statusIcon as any} size={12} color={statusColor} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: statusColor }}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
})()}
```

- [ ] **Step 3: Add `formatAttendanceText` import in calendar.tsx**

At the top of `app/(tabs)/calendar.tsx`, add alongside the existing imports:

```tsx
import { formatAttendanceText } from "@/utils/attendanceUtils";
```

- [ ] **Step 4: Verify manually**

Launch `npx expo start`. Tap a past event → verify:
- Modal opens
- Absent participants are NOT shown (only online/physical)
- Physical participants appear before online ones
- Each entry shows name, badge, and timestamp
- "Copier" button copies formatted text to clipboard
- After copy: button shows "Copié !" with green checkmark for 2 seconds

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/calendar.tsx"
git commit -m "feat: enrich past event attendance view with counters and copy button"
```

---

## Task 4: Global coverage chart for members + hide slot list

**Files:**
- Modify: `app/(tabs)/calendar.tsx:1194,1200,1227-1234`

- [ ] **Step 1: Update WeeklyCoverageChart data source**

In `app/(tabs)/calendar.tsx` at line 1200, replace:

```tsx
availabilities={canManageSchedule ? allAvailabilities : availabilities}
```

with:

```tsx
availabilities={allAvailabilities}
```

- [ ] **Step 2: Hide slot list data for non-admins**

In `app/(tabs)/calendar.tsx` at line 1194, replace:

```tsx
data={canManageSchedule ? memberGroups : availabilities}
```

with:

```tsx
data={canManageSchedule ? memberGroups : []}
```

- [ ] **Step 3: Hide empty state for non-admins**

In `app/(tabs)/calendar.tsx` at lines 1227–1234, replace:

```tsx
ListEmptyComponent={
  <View style={dynamicStyles.emptyContainer}>
    <Ionicons name="checkmark-circle-outline" size={48} color="#999" />
    <Text style={dynamicStyles.emptyText}>
      Aucune disponibilité enregistrée
    </Text>
  </View>
}
```

with:

```tsx
ListEmptyComponent={
  canManageSchedule ? (
    <View style={dynamicStyles.emptyContainer}>
      <Ionicons name="checkmark-circle-outline" size={48} color="#999" />
      <Text style={dynamicStyles.emptyText}>
        Aucune disponibilité enregistrée
      </Text>
    </View>
  ) : null
}
```

- [ ] **Step 4: Verify manually**

Launch `npx expo start` with a non-admin account:
- Navigate to Calendrier → Disponibilités
- The chart shows coverage from **all members** (not just own slots)
- No slot list is visible below the chart
- The `+` FAB is still present and opens the availability creation modal

Then with an admin account:
- Chart still shows all members' coverage
- Slot list by member is still fully visible
- "Générer l'horaire" button still appears

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/calendar.tsx"
git commit -m "feat: show global coverage chart for all members, hide slot details from non-admins"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|---|---|
| Admin/user can view attendance for past events | Task 2 (tappable) + Task 3 (enriched view) |
| Show online and physical attendees with timestamp | Task 3 |
| Copy attendance list to clipboard | Task 3 |
| Members see global coverage chart | Task 4 |
| Members cannot see individual slot details | Task 4 |
| Past event view is read-only (no status change) | Already gated by phase conditions — Task 2 confirms |

### Placeholder scan

No TBDs, no TODOs, no "similar to task N" references. All code blocks are complete.

### Type consistency

- `formatAttendanceText(eventTitle: string, eventDate: Date, onlineNames: string[], physicalNames: string[])` — used consistently in Task 1 (definition) and Task 3 (call site)
- `copiedAttendance: boolean` — declared in Task 3 Step 1, used in Task 3 Step 2
- `attendanceList` — local variable computed inside the `phase === "past"` IIFE in Task 3 Step 2
