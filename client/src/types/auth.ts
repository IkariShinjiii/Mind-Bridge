import type { User } from "firebase/auth";
import type { UserProfile, UserRole } from "./models";
import type { AccountStatus } from "../utils/accountStatus";

/** Value provided by `AuthProvider` and read with `useAuth()`. */
export interface AuthContextValue {
  currentUser: User | null;
  userRole: UserRole | null;
  userData: (UserProfile & { role: UserRole }) | null;
  /** "pending-approval" or "deactivated" accounts are shown a notice instead of the app. */
  accountStatus: AccountStatus;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}
