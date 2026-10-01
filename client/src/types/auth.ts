import type { User } from "firebase/auth";
import type { UserProfile, UserRole } from "./models";

/** Value provided by `AuthProvider` and read with `useAuth()`. */
export interface AuthContextValue {
  currentUser: User | null;
  userRole: UserRole | null;
  userData: (UserProfile & { role: UserRole }) | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}
