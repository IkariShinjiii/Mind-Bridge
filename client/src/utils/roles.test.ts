import { describe, it, expect } from "vitest";
import { normalizeRole } from "./roles";

describe("normalizeRole", () => {
  it("keeps students as students", () => expect(normalizeRole("student")).toBe("student"));
  it("treats a counselor as an admin", () => expect(normalizeRole("counselor")).toBe("admin"));
  it("keeps admins as admins", () => expect(normalizeRole("admin")).toBe("admin"));
  it("ignores case", () => {
    expect(normalizeRole("ADMIN")).toBe("admin");
    expect(normalizeRole("Counselor")).toBe("admin");
  });
  it("falls back to the least privilege for missing or unknown roles", () => {
    expect(normalizeRole(undefined)).toBe("student");
    expect(normalizeRole(null)).toBe("student");
    expect(normalizeRole("")).toBe("student");
    expect(normalizeRole("superuser")).toBe("student");
    expect(normalizeRole("administrator")).toBe("student");
  });
});
