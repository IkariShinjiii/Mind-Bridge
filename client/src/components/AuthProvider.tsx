import { useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { AuthContext } from "../lib/auth-context";
import { normalizeRole } from "../utils/roles";
import { accountStatus as statusOf, type AccountStatus } from "../utils/accountStatus";
import type { AuthContextValue, UserProfile, UserRole } from "../types";

type LoadedProfile = UserProfile & { role: UserRole };
type Loaded = { profile: LoadedProfile; status: AccountStatus };

/** Reads `users/{uid}` and normalises the role. Returns null when the document does not exist. */
async function loadProfile(uid: string): Promise<Loaded | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as UserProfile;
  // The status is read from the stored role: `normalizeRole` folds counselor into admin and would hide it.
  return { profile: { ...data, role: normalizeRole(data.role) }, status: statusOf(data) };
}

/**
 * Tracks the signed-in Firebase user and their profile/role, and exposes them through `useAuth()`.
 * A signed-in user whose profile cannot be read is treated as a student (least privilege).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userData, setUserData] = useState<LoadedProfile | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("active");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      void (async () => {
        if (user) {
          setCurrentUser(user);
          try {
            const loaded = await loadProfile(user.uid);
            if (loaded) {
              setUserRole(loaded.profile.role);
              setUserData(loaded.profile);
              setAccountStatus(loaded.status);
            } else {
              console.error(`No document found in 'users' collection for UID: ${user.uid}`);
              setUserRole("student");
            }
          } catch (error) {
            console.error("Error fetching user role:", error);
            setUserRole("student");
          }
        } else {
          setCurrentUser(null);
          setUserRole(null);
          setUserData(null);
          setAccountStatus("active");
        }
        setLoading(false);
      })();
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      userRole,
      userData,
      accountStatus,
      loading,
      logout: () => signOut(auth),
      refreshUserData: async () => {
        if (!auth.currentUser) return;
        try {
          const loaded = await loadProfile(auth.currentUser.uid);
          if (loaded) {
            setUserRole(loaded.profile.role);
            setUserData(loaded.profile);
            setAccountStatus(loaded.status);
          }
        } catch (error) {
          console.error("Error refreshing user data:", error);
        }
      },
    }),
    [currentUser, userRole, userData, accountStatus, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
