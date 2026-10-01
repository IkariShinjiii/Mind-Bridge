import type { StoredRole, UserRole } from "../types";

/**
 * Maps a stored role to the app role. `counselor` is treated as `admin`; anything missing or unknown is a
 * student (least privilege).
 */
export function normalizeRole(role: StoredRole | UserRole | string | null | undefined): UserRole {
  const r = String(role ?? "student").toLowerCase();
  return r === "admin" || r === "counselor" ? "admin" : "student";
}
