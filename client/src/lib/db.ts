import { getFirestore } from "firebase/firestore";
import { app } from "./firebase";

/** Firestore is kept out of lib/firebase so the landing page, which only needs auth, does not download it. */
export const db = getFirestore(app);
