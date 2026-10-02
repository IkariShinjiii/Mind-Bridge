import { describe, it, expect } from "vitest";
import {
  isEmail,
  isSchoolEmail,
  isPhone,
  validateSignup,
  validateLogin,
  validateEmergencyContact,
  validatePasswordChange,
  validateAvailabilityWindow,
  SCHOOL_EMAIL_DOMAIN,
  MIN_PASSWORD_LENGTH,
} from "./validation";

describe("isEmail edge cases", () => {
  it.each(["a@b.co", "first.last+tag@sub.domain.ph", "  a@b.co  ", "a@b.c"])("accepts %j", (v) =>
    expect(isEmail(v)).toBe(true),
  );
  it.each([
    "",
    "   ",
    null,
    undefined,
    0,
    "a",
    "a@",
    "@b.co",
    "a@b",
    "a@b.",
    "a@.co",
    "a b@c.com",
    "a@@b.co",
    "a@b@c.co",
    "a@b .co",
    "a\n@b.co",
  ])("rejects %j", (v) => expect(isEmail(v)).toBe(false));
});

describe("isSchoolEmail edge cases", () => {
  it("tolerates surrounding whitespace and mixed case", () => {
    expect(isSchoolEmail("  Ana@Usa.Edu.Ph ")).toBe(true);
  });
  it.each([
    "ana@usa.edu.ph.evil.com",
    "ana@evilusa.edu.ph",
    "ana@usa.edu.phx",
    "ana@usa.edu",
    "usa.edu.ph",
    "@usa.edu.ph",
    "",
    null,
    undefined,
  ])("rejects %j", (v) => expect(isSchoolEmail(v)).toBe(false));
  it("the domain constant is what the check enforces", () => {
    expect(isSchoolEmail(`x${SCHOOL_EMAIL_DOMAIN}`)).toBe(true);
  });
});

describe("isPhone edge cases", () => {
  it.each(["1234567", "+639178998727", "0917-899-8727", "(02) 8804.4673", "+1 (555) 010-9999", "1234567890123"])(
    "accepts %j",
    (v) => {
      expect(isPhone(v)).toBe(true);
    },
  );
  it.each([
    "",
    " ",
    null,
    undefined,
    "123456",
    "12345678901234",
    "+",
    "()",
    "abc1234567",
    "0917 123 456x",
    "-1234567",
    ".1234567",
    "٠٩١٧١٢٣٤٥٦٧",
  ])("rejects %j", (v) => expect(isPhone(v)).toBe(false));
  it("counts digits, not characters (punctuation does not pad the length)", () => {
    expect(isPhone("(1)-(2)-(3)-(4)-(5)-(6)")).toBe(false); // 6 digits
    expect(isPhone("(1)-(2)-(3)-(4)-(5)-(6)-(7)")).toBe(true); // 7 digits
  });
});

describe("validateSignup edge cases", () => {
  const ok = { name: "Ana", email: "ana@usa.edu.ph", password: "secret12" };
  it("accepts a password of exactly the minimum length and rejects one shorter", () => {
    expect(validateSignup({ ...ok, password: "x".repeat(MIN_PASSWORD_LENGTH) })).toEqual({});
    expect(validateSignup({ ...ok, password: "x".repeat(MIN_PASSWORD_LENGTH - 1) })).toHaveProperty("password");
  });
  it("treats whitespace-only name and email as empty", () => {
    const e = validateSignup({ ...ok, name: "   ", email: "  " });
    expect(e.name).toMatch(/full name/);
    expect(e.email).toMatch(/Enter your school email/);
  });
  it("does not trim the password (spaces count as characters)", () => {
    expect(validateSignup({ ...ok, password: "        " })).toEqual({});
  });
  it("consent defaults to true when omitted, but an explicit false or null fails", () => {
    expect(validateSignup(ok)).toEqual({});
    expect(validateSignup({ ...ok, consent: false })).toHaveProperty("consent");
    expect(validateSignup({ ...ok, consent: null })).toHaveProperty("consent");
  });
  it("copes with missing fields without throwing", () => {
    expect(() => validateSignup({})).not.toThrow();
    expect(Object.keys(validateSignup({})).sort()).toEqual(["email", "name", "password"]);
  });
  it("reports only the empty-email message (not the domain message) for a blank email", () => {
    expect(validateSignup({ ...ok, email: "" }).email).not.toMatch(/usa\.edu\.ph/);
  });
});

describe("validateLogin edge cases", () => {
  it("rejects a malformed email but not a non-school one", () => {
    expect(validateLogin({ email: "nope", password: "x" })).toHaveProperty("email");
    expect(validateLogin({ email: "staff@gmail.com", password: "x" })).toEqual({});
  });
  it("does not enforce a password length at login", () => {
    expect(validateLogin({ email: "a@b.co", password: "1" })).toEqual({});
  });
  it("copes with missing fields", () => {
    expect(Object.keys(validateLogin({})).sort()).toEqual(["email", "password"]);
  });
});

describe("validateEmergencyContact edge cases", () => {
  it("treats a whitespace-only alternate phone as blank", () => {
    expect(validateEmergencyContact({ name: "Mom", phone: "0917 123 4567", alternatePhone: "   " })).toEqual({});
  });
  it("accepts a valid alternate phone", () => {
    expect(validateEmergencyContact({ name: "Mom", phone: "0917 123 4567", alternatePhone: "(02) 8804-4673" })).toEqual(
      {},
    );
  });
  it("reports name, phone and bad alternate independently", () => {
    const e = validateEmergencyContact({ name: " ", phone: "12", alternatePhone: "x" });
    expect(Object.keys(e).sort()).toEqual(["alternatePhone", "name", "phone"]);
  });
  it("a missing phone says 'Enter', an invalid one says 'valid'", () => {
    expect(validateEmergencyContact({ name: "M", phone: "" }).phone).toMatch(/^Enter a phone/);
    expect(validateEmergencyContact({ name: "M", phone: "12" }).phone).toMatch(/valid/);
  });
});

describe("validatePasswordChange edge cases", () => {
  it("an entirely empty form flags all three fields", () => {
    expect(Object.keys(validatePasswordChange({})).sort()).toEqual([
      "confirmPassword",
      "currentPassword",
      "newPassword",
    ]);
  });
  it("length is checked before 'same as current'", () => {
    expect(
      validatePasswordChange({ currentPassword: "abc", newPassword: "abc", confirmPassword: "abc" }).newPassword,
    ).toMatch(/at least/);
  });
  it("accepts the minimum length", () => {
    const p = "x".repeat(MIN_PASSWORD_LENGTH);
    expect(validatePasswordChange({ currentPassword: "old-one", newPassword: p, confirmPassword: p })).toEqual({});
  });
  it("confirmation is compared exactly (case and trailing space matter)", () => {
    expect(
      validatePasswordChange({ currentPassword: "old-one", newPassword: "Secret12", confirmPassword: "secret12" }),
    ).toHaveProperty("confirmPassword");
    expect(
      validatePasswordChange({ currentPassword: "old-one", newPassword: "Secret12", confirmPassword: "Secret12 " }),
    ).toHaveProperty("confirmPassword");
  });
});

describe("validateAvailabilityWindow edge cases", () => {
  const now = new Date("2026-10-02T08:00:00");
  it("a start exactly at 'now' is allowed", () => {
    expect(validateAvailabilityWindow("2026-10-02T08:00", "2026-10-02T09:00", now)).toEqual({});
  });
  it("a zero-length window is rejected", () => {
    expect(validateAvailabilityWindow("2026-10-03T09:00", "2026-10-03T09:00", now)).toHaveProperty("end");
  });
  it("an unparseable start or end is reported on that field only", () => {
    expect(validateAvailabilityWindow("garbage", "2026-10-03T09:00", now)).toEqual({ start: "Choose a start time." });
    expect(validateAvailabilityWindow("2026-10-03T09:00", "garbage", now)).toEqual({ end: "Choose an end time." });
  });
  it("when the start is already invalid, end ordering is not also reported", () => {
    expect(validateAvailabilityWindow("2026-10-01T09:00", "2026-10-01T08:00", now)).toEqual({
      start: "The start time is in the past.",
    });
  });
  it("missing arguments are treated as empty", () => {
    expect(Object.keys(validateAvailabilityWindow(undefined, undefined, now)).sort()).toEqual(["end", "start"]);
  });
  it("defaults 'now' to the real clock", () => {
    expect(validateAvailabilityWindow("2000-01-01T09:00", "2000-01-01T10:00")).toHaveProperty("start");
  });
});
