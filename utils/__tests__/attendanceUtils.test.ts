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
