export type AccountStatus = "active" | "pending-approval" | "deactivated" | "unverified" | "unavailable";
// "unavailable" is set by AuthProvider when the profile read fails, so the role is unknown rather than guessed.

interface ProfileLike {
  role?: string | null | undefined;
  approved?: boolean | null | undefined;
  active?: boolean | null | undefined;
}

/**
 * What the signed-in account may do, read the way `firestore.rules` reads it: a deactivated profile has no access,
 * and a stored `counselor` has none until an admin approves it, a student has none until the email is verified (`admin` needs no approval). This only decides
 * what screen to show; the rules still enforce access.
 */
export function accountStatus(profile: ProfileLike | null | undefined, emailVerified = true): AccountStatus {
  if (!profile) return "active";
  if (profile.active === false) return "deactivated";
  if (String(profile.role ?? "").toLowerCase() === "counselor" && profile.approved !== true) return "pending-approval";
  // A student must prove they own the school address (Google sign-in is verified already). Staff are provisioned by an admin.
  const role = String(profile.role ?? "student").toLowerCase();
  if (!emailVerified && role === "student") return "unverified";
  return "active";
}
