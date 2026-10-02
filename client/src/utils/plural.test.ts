import { describe, it, expect } from "vitest";
import { plural } from "./plural";

describe("plural", () => {
  it("uses the singular only for exactly one", () => {
    expect(plural(1, "check-in")).toBe("1 check-in");
    expect(plural(0, "check-in")).toBe("0 check-ins");
    expect(plural(2, "check-in")).toBe("2 check-ins");
  });

  it("accepts an irregular plural", () => {
    expect(plural(1, "person", "people")).toBe("1 person");
    expect(plural(3, "person", "people")).toBe("3 people");
  });
});
