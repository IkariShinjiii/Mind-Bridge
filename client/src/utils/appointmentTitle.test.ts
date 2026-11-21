import { describe, expect, it } from "vitest";
import { appointmentTitle } from "./appointmentTitle";

describe("appointmentTitle", () => {
  it("replaces legacy peer facilitator titles and empty values", () => {
    for (const t of ["Counseling Session", "counselling session", "Session with Counselor", undefined, null, " "]) {
      expect(appointmentTitle(t)).toBe("Peer support session");
    }
  });

  it("keeps any other title", () => {
    expect(appointmentTitle("Session with Liza Gomez")).toBe("Session with Liza Gomez");
  });
});
