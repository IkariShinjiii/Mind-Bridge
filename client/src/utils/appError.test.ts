import { describe, it, expect } from "vitest";
import { AppError, friendlyError, toAppError } from "./errors";

describe("AppError", () => {
  it("keeps the technical message, the safe user message and the cause apart", () => {
    const cause = new Error("INTERNAL: db password=hunter2");
    const e = new AppError("unknown", "Something went wrong.", { message: cause.message, cause });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("AppError");
    expect(e.message).toContain("INTERNAL");
    expect(e.userMessage).toBe("Something went wrong.");
    expect(e.cause).toBe(cause);
  });
});

describe("toAppError", () => {
  it("maps Firebase codes to app codes with a safe message", () => {
    const e = toAppError(Object.assign(new Error("denied"), { code: "permission-denied" }));
    expect(e).toMatchObject({ code: "permission-denied", sourceCode: "permission-denied", message: "denied" });
    expect(e.userMessage).toBe("You do not have permission to do that.");
  });

  it.each([
    ["auth/invalid-credential", "unauthenticated"],
    ["auth/email-already-in-use", "conflict"],
    ["auth/too-many-requests", "rate-limited"],
    ["auth/network-request-failed", "network"],
    ["firestore/unavailable", "network"],
    ["auth/weak-password", "validation"],
  ])("%s becomes %s", (sourceCode, code) => {
    expect(toAppError({ code: sourceCode }).code).toBe(code);
  });

  it("returns an existing AppError unchanged", () => {
    const e = new AppError("conflict", "Taken.");
    expect(toAppError(e)).toBe(e);
  });

  it("never exposes unknown error text to users", () => {
    const e = toAppError(new Error("stack: at secret.js:1"));
    expect(e.code).toBe("unknown");
    expect(e.userMessage).toBe("Something went wrong. Please try again.");
    expect(e.message).toBe("stack: at secret.js:1"); // kept for logs only
  });

  it("copes with non-error values", () => {
    expect(toAppError(null).code).toBe("unknown");
    expect(toAppError("boom").message).toBe("boom");
    expect(toAppError(42).userMessage).toBe("Something went wrong. Please try again.");
  });
});

describe("friendlyError with AppError", () => {
  it("uses the AppError user message, and the caller fallback only for the generic one", () => {
    expect(friendlyError(new AppError("permission-denied", "Not allowed."), "Fallback.")).toBe("Not allowed.");
    expect(friendlyError(toAppError(new Error("x")), "Could not save.")).toBe("Could not save.");
  });
});
