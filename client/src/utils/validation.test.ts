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
  passwordStrength,
} from "./validation.js";
import { friendlyError, isPopupDismissed } from "./errors";

describe("email and phone checks", () => {
  it("accepts normal emails and rejects malformed ones", () => {
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("a@b")).toBe(false);
    expect(isEmail("a b@c.com")).toBe(false);
    expect(isEmail("")).toBe(false);
  });
  it("only accepts the school domain, case-insensitively", () => {
    expect(isSchoolEmail("ana@usa.edu.ph")).toBe(true);
    expect(isSchoolEmail("ANA@USA.EDU.PH")).toBe(true);
    expect(isSchoolEmail("ana@gmail.com")).toBe(false);
    expect(isSchoolEmail("ana@usa.edu.ph.evil.com")).toBe(false);
  });
  it("validates phone numbers", () => {
    expect(isPhone("0917-899-8727")).toBe(true);
    expect(isPhone("+63 917 899 8727")).toBe(true);
    expect(isPhone("(02) 8804-4673")).toBe(true);
    expect(isPhone("abc")).toBe(false);
    expect(isPhone("123")).toBe(false);
  });
});

describe("form validators", () => {
  it("flags every empty sign-up field", () => {
    const e = validateSignup({ name: "", email: "", password: "", consent: false });
    expect(Object.keys(e).sort()).toEqual(["consent", "email", "name", "password"]);
  });
  it("passes a valid sign-up", () => {
    expect(validateSignup({ name: "Ana", email: "ana@usa.edu.ph", password: "secret12", consent: true })).toEqual({});
  });
  it("rejects a non-school email and a short password at sign-up", () => {
    const e = validateSignup({ name: "Ana", email: "ana@gmail.com", password: "123" });
    expect(e.email).toMatch(/usa\.edu\.ph/);
    expect(e.password).toMatch(/at least 8/);
  });
  it("login requires both fields", () => {
    expect(validateLogin({ email: "", password: "" })).toHaveProperty("email");
    expect(validateLogin({ email: "", password: "" })).toHaveProperty("password");
    expect(validateLogin({ email: "a@b.co", password: "x" })).toEqual({});
  });
  it("emergency contact needs name and phone, alternate is optional", () => {
    expect(validateEmergencyContact({ name: "", phone: "" })).toHaveProperty("name");
    expect(validateEmergencyContact({ name: "Mom", phone: "0917 123 4567" })).toEqual({});
    expect(validateEmergencyContact({ name: "Mom", phone: "0917 123 4567", alternatePhone: "nope" })).toHaveProperty(
      "alternatePhone",
    );
  });
  it("password change checks length, difference and match", () => {
    expect(
      validatePasswordChange({ currentPassword: "old12345", newPassword: "old12345", confirmPassword: "old12345" }),
    ).toHaveProperty("newPassword");
    expect(
      validatePasswordChange({ currentPassword: "old12345", newPassword: "new12345", confirmPassword: "new123456" }),
    ).toHaveProperty("confirmPassword");
    expect(
      validatePasswordChange({ currentPassword: "old12345", newPassword: "new12345", confirmPassword: "new12345" }),
    ).toEqual({});
  });
  it("availability window must be in the future and ordered", () => {
    const now = new Date("2026-10-02T08:00:00");
    expect(validateAvailabilityWindow("2026-10-02T07:00", "2026-10-02T09:00", now)).toHaveProperty("start");
    expect(validateAvailabilityWindow("2026-10-03T10:00", "2026-10-03T09:00", now)).toHaveProperty("end");
    expect(validateAvailabilityWindow("", "", now)).toHaveProperty("start");
    expect(validateAvailabilityWindow("2026-10-03T09:00", "2026-10-03T10:00", now)).toEqual({});
  });
});

describe("passwordStrength", () => {
  it("is level 0 when empty", () => {
    expect(passwordStrength("")).toEqual({ level: 0, label: "" });
  });
  it("rates anything under the minimum length as weak", () => {
    expect(passwordStrength("Ab1!")).toEqual({ level: 1, label: "Weak" });
  });
  it("climbs with length, case, digits and symbols", () => {
    expect(passwordStrength("abcdefgh").level).toBe(1);
    expect(passwordStrength("abcdefg1").level).toBe(2);
    expect(passwordStrength("Abcdefg1").level).toBe(3);
    expect(passwordStrength("Abcdefghij1!").level).toBe(4);
    expect(passwordStrength("Abcdefghij1!").label).toBe("Strong");
  });
});

describe("friendlyError", () => {
  it("maps known codes and hides unknown ones", () => {
    expect(friendlyError({ code: "auth/invalid-credential" })).toMatch(/do not match/);
    expect(friendlyError({ code: "firestore/permission-denied" })).toMatch(/permission/);
    expect(friendlyError({ code: "weird/thing", message: "secret internals" })).toBe(
      "Something went wrong. Please try again.",
    );
    expect(friendlyError(null, "Custom")).toBe("Custom");
  });
  it("recognises dismissed popups", () => {
    expect(isPopupDismissed({ code: "auth/popup-closed-by-user" })).toBe(true);
    expect(isPopupDismissed({ code: "auth/other" })).toBe(false);
  });
});
