import { createContext } from "react";
import type { AuthContextValue } from "../types";

/** Raw context. Components should call `useAuth()` instead of reading this directly. */
export const AuthContext = createContext<AuthContextValue | null>(null);
