import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiUrl, refreshSession as apiRefreshSession } from "./api";

const AuthContext = createContext(null);

const WARNING_WINDOW_MS = 24 * 60 * 60 * 1000; // show a warning inside the last 24h

function decodeExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");
  const [hoursLeft, setHoursLeft] = useState(null);

  const applySession = useCallback((newToken, newUser) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
    setHoursLeft(null);
  }, []);

  const logout = useCallback((message = "") => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setHoursLeft(null);
    setSessionMessage(message);
  }, []);

  async function refreshUser() {
    const t = localStorage.getItem("token");
    if (!t) return;
    const res = await fetch(apiUrl("/auth/me"), { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  }

  async function extendSession() {
    const data = await apiRefreshSession();
    applySession(data.token, data.user);
  }

  // Initial load: confirm the stored token still maps to a real account.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(apiUrl("/auth/me"), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Session expired");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Listen for any request that came back 401 (token expired mid-session).
  useEffect(() => {
    function handleUnauthorized() {
      logout("Your session expired — please log in again.");
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [logout]);

  // Periodically check how close the current token is to expiring, so we
  // can show a warning banner before the user gets logged out mid-task.
  useEffect(() => {
    if (!token) return;
    function check() {
      const expiresAt = decodeExpiry(token);
      if (!expiresAt) return;
      const msLeft = expiresAt - Date.now();
      if (msLeft <= 0) {
        logout("Your session expired — please log in again.");
      } else if (msLeft < WARNING_WINDOW_MS) {
        setHoursLeft(Math.max(1, Math.round(msLeft / (60 * 60 * 1000))));
      } else {
        setHoursLeft(null);
      }
    }
    check();
    const interval = setInterval(check, 60 * 1000);
    return () => clearInterval(interval);
  }, [token, logout]);

  function login(newToken, newUser) {
    setSessionMessage("");
    applySession(newToken, newUser);
  }

  return (
    <AuthContext.Provider
      value={{ token, user, loading, login, logout, sessionMessage, hoursLeft, extendSession, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


