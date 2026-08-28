import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            console.log("Firestore Data Found for User:", data); // Debug log!
            setUserRole(data.role || "student");
            setUserData(data);
          } else {
            console.error(`No document found in 'users' collection for UID: ${user.uid}`); // Debug log!
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
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshUserData = async () => {
    if (!auth.currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserRole(data.role || "student");
        setUserData(data);
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ currentUser, userRole, userData, loading, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}