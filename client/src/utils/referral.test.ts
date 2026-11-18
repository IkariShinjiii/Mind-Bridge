import { describe, it, expect } from "vitest";
import { shouldReferOut, PATNUBAY_BOOKING_URL } from "./referral";

describe("referral", () => {
  it("suggests formal counseling for elevated concern", () => {
    expect(shouldReferOut("high")).toBe(true);
    expect(shouldReferOut("medium")).toBe(true);
  });

  it("does not suggest a referral for a low result", () => {
    expect(shouldReferOut("low")).toBe(false);
  });

  it("points at the PATNUBAY booking page and carries no personal data in the URL", () => {
    expect(PATNUBAY_BOOKING_URL).toContain("usagstc");
    expect(PATNUBAY_BOOKING_URL).not.toContain("?");
  });
});
