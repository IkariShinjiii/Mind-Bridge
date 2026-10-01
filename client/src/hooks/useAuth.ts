import { useContext } from "react";
import { AuthContext } from "../lib/auth-context";
import type { AuthContextValue } from "../types";

/**
 * Current user, role and profile. Must be used inside `AuthProvider`.
 * @throws {Error} when called outside the provider (a programming error, not a runtime condition)
 */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
