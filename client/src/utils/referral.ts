import type { RiskLevel } from "../types";

/**
 * The USA Guidance Center's own booking system (PATNUBAY). Mind Bridge is a peer-support
 * platform; when a check-in shows elevated concern it bridges the student to PATNUBAY for
 * formal counseling with a licensed guidance counselor. No personal data is placed in this
 * link — it opens the booking page, and the student shares their own context there.
 */
export const PATNUBAY_BOOKING_URL = "https://usagstc.42web.io/dashboard/add-appointment/";

/** Suggest formal counseling only when a check-in shows elevated concern (medium or high). */
export function shouldReferOut(level: RiskLevel): boolean {
  return level === "high" || level === "medium";
}
