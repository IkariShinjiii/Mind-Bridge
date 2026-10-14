import { describe, it, expect } from "vitest";
import { firstName } from "./names";

describe("firstName", () => {
  it("takes the first word", () => expect(firstName("Ana Student")).toBe("Ana"));
  it("skips a leading title, with or without a period", () => {
    expect(firstName("Dr. Reyes")).toBe("Reyes");
    expect(firstName("dr Maria Reyes")).toBe("Maria");
    expect(firstName("Prof. Ana Cruz")).toBe("Ana");
  });
  it("keeps a title that is the only word", () => expect(firstName("Dr.")).toBe("Dr."));
  it("handles extra spaces", () => expect(firstName("  Ben   Cruz ")).toBe("Ben"));
  it("falls back for empty or missing names", () => {
    expect(firstName("")).toBe("there");
    expect(firstName(undefined, "Student")).toBe("Student");
  });
});
