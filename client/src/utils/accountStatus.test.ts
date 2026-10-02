import { describe, it, expect } from "vitest";
import { accountStatus } from "./accountStatus";

describe("accountStatus", () => {
  it("treats a missing profile as active, because the rules decide, not this", () => {
    expect(accountStatus(null)).toBe("active");
    expect(accountStatus(undefined)).toBe("active");
  });

  it("is deactivated only when active is explicitly false", () => {
    expect(accountStatus({ role: "student", active: false })).toBe("deactivated");
    expect(accountStatus({ role: "student", active: true })).toBe("active");
    expect(accountStatus({ role: "student" })).toBe("active");
  });

  it("deactivated wins over pending approval", () => {
    expect(accountStatus({ role: "counselor", approved: false, active: false })).toBe("deactivated");
  });

  it("holds a counselor until approved is exactly true", () => {
    expect(accountStatus({ role: "counselor", approved: false })).toBe("pending-approval");
    expect(accountStatus({ role: "counselor" })).toBe("pending-approval");
    expect(accountStatus({ role: "Counselor", approved: false })).toBe("pending-approval");
    expect(accountStatus({ role: "counselor", approved: true })).toBe("active");
  });

  it("never holds an admin or a student for approval", () => {
    expect(accountStatus({ role: "admin" })).toBe("active");
    expect(accountStatus({ role: "admin", approved: false })).toBe("active");
    expect(accountStatus({ role: "student", approved: false })).toBe("active");
    expect(accountStatus({})).toBe("active");
  });
});
