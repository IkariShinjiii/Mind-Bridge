import { load, save, nextId } from "./store.js";

// Same shape as the Firebase error the app reads `.code` and `.message` from.
function authError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

const listeners = new Set();
const auth = {
  get currentUser() {
    const { session, accounts } = load();
    if (!session) return null;
    const account = Object.values(accounts).find((a) => a.uid === session);
    return account
      ? { uid: account.uid, email: account.email, displayName: account.displayName || null, photoURL: null }
      : null;
  },
};

// Real Firebase notifies on a later tick, never synchronously inside the sign-in call.
function notify() {
  setTimeout(() => listeners.forEach((cb) => cb(auth.currentUser)), 0);
}

export class GoogleAuthProvider {}

export function getAuth() {
  return auth;
}

export function onAuthStateChanged(_auth, cb) {
  listeners.add(cb);
  setTimeout(() => cb(auth.currentUser), 0);
  return () => listeners.delete(cb);
}

export async function createUserWithEmailAndPassword(_auth, email, password) {
  const state = load();
  const key = email.toLowerCase();
  if (state.accounts[key]) {
    throw authError("auth/email-already-in-use", "Firebase: Error (auth/email-already-in-use).");
  }
  if (password.length < 6) {
    throw authError("auth/weak-password", "Firebase: Password should be at least 6 characters (auth/weak-password).");
  }
  state.accounts[key] = { uid: nextId(state, "uid-"), email, password, displayName: null };
  state.session = state.accounts[key].uid;
  save(state);
  notify();
  return { user: auth.currentUser };
}

export async function signInWithEmailAndPassword(_auth, email, password) {
  const state = load();
  const account = state.accounts[email.toLowerCase()];
  if (!account || account.password !== password) {
    throw authError("auth/invalid-credential", "Firebase: Error (auth/invalid-credential).");
  }
  state.session = account.uid;
  save(state);
  notify();
  return { user: auth.currentUser };
}

export async function updateProfile(user, { displayName }) {
  const state = load();
  const account = Object.values(state.accounts).find((a) => a.uid === user.uid);
  if (account) account.displayName = displayName;
  save(state);
}

export async function signOut() {
  const state = load();
  state.session = null;
  save(state);
  notify();
}

// Google sign-in needs a real popup; the E2E suite does not cover it.
export async function signInWithPopup() {
  throw authError("auth/popup-closed-by-user", "Popup closed");
}

export async function sendPasswordResetEmail() {}
