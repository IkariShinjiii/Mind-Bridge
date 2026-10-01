import { describe, it, expect } from "vitest";
import { friendlyError, isPopupDismissed } from "./errors";

const FALLBACK = "Something went wrong. Please try again.";

describe("friendlyError", () => {
  it.each([
    "auth/invalid-credential",
    "auth/wrong-password",
    "auth/user-not-found",
    "auth/invalid-email",
    "auth/user-disabled",
    "auth/email-already-in-use",
    "auth/weak-password",
    "auth/too-many-requests",
    "auth/network-request-failed",
    "auth/requires-recent-login",
    "auth/popup-blocked",
    "permission-denied",
    "unavailable",
  ])("has a readable message for %s", (code) => {
    const msg = friendlyError({ code });
    expect(msg).not.toBe(FALLBACK);
    expect(msg).toMatch(/^[A-Z].*[.]$/); // a sentence, never a raw code
    expect(msg).not.toContain(code);
  });

  it("gives identical text for wrong password, unknown user and invalid credential (no account enumeration)", () => {
    const set = new Set(
      ["auth/wrong-password", "auth/user-not-found", "auth/invalid-credential"].map((code) => friendlyError({ code })),
    );
    expect(set.size).toBe(1);
  });

  it("accepts Firestore-prefixed codes", () => {
    expect(friendlyError({ code: "firestore/permission-denied" })).toBe(friendlyError({ code: "permission-denied" }));
    expect(friendlyError({ code: "firestore/unavailable" })).toBe(friendlyError({ code: "unavailable" }));
  });

  it("never leaks the raw message, stack or code of an unknown error", () => {
    const e = Object.assign(new Error("INTERNAL: db password=hunter2"), { code: "auth/some-new-code" });
    expect(friendlyError(e)).toBe(FALLBACK);
  });

  it("uses the supplied fallback for unknown codes", () => {
    expect(friendlyError({ code: "x/y" }, "Could not save.")).toBe("Could not save.");
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["auth/invalid-credential"],
    [42],
    [{}],
    [new Error("plain")],
    [{ code: "" }],
    [{ code: 0 }],
  ])("returns the fallback for non-coded input %j", (input) => {
    expect(friendlyError(input)).toBe(FALLBACK);
  });

  it("coerces a non-string code before lookup instead of throwing", () => {
    expect(() => friendlyError({ code: 123 })).not.toThrow();
    expect(friendlyError({ code: 123 })).toBe(FALLBACK);
  });

  // Fixed: lookups use Object.hasOwn, so inherited properties are never treated as codes.
  // (a function) instead of the fallback. Real Firebase codes never look like this. Fix with Object.hasOwn.
  it("does not resolve inherited object properties as codes", () => {
    expect(friendlyError({ code: "toString" })).toBe(FALLBACK);
    expect(friendlyError({ code: "constructor" })).toBe(FALLBACK);
  });
});

describe("isPopupDismissed", () => {
  it.each(["auth/popup-closed-by-user", "auth/cancelled-popup-request"])("is true for %s", (code) => {
    expect(isPopupDismissed({ code })).toBe(true);
  });
  it.each([
    [{ code: "auth/popup-blocked" }],
    [{ code: "" }],
    [{}],
    [null],
    [undefined],
    ["auth/popup-closed-by-user"],
    [42],
  ])("is false for %j", (input) => {
    expect(isPopupDismissed(input)).toBe(false);
  });
});
