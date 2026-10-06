export type AccountStatus = "active" | "pending-approval" | "deactivated" | "unavailable";
// "unavailable" is set by AuthProvider when the profile read fails, so the role is unknown rather than guessed.

interface ProfileLike {
  role?: string | null | undefined;
  approved?: boolean | null | undefined;
  active?: boolean | null | undefined;
}

/**
 * What the signed-in account may do, read the way `firestore.rules` reads it: a deactivated profile has no access,
 * and a stored `counselor` has none until an admin approves it (`admin` needs no approval). This only decides
 * what screen to show; the rules still enforce access.
 */
export function accountStatus(profile: ProfileLike | null | undefined): AccountStatus {
  if (!profile) return "active";
  if (profile.active === false) return "deactivated";
  if (String(profile.role ?? "").toLowerCase() === "counselor" && profile.approved !== true) return "pending-approval";
  return "active";
}
