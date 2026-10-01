import { load, save, nextId, type FakeAccount } from "./store";

/** The slice of the Firebase `User` the app reads. */
export interface FakeUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  providerData: Array<{ providerId: string }>;
}

type AuthListener = (user: FakeUser | null) => void;

// Same shape as the Firebase error the app reads `.code` and `.message` from.
function authError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

const toUser = (account: FakeAccount): FakeUser => ({
  uid: account.uid,
  email: account.email,
  displayName: account.displayName || null,
  photoURL: null,
  providerData: [{ providerId: "password" }],
});

const listeners = new Set<AuthListener>();
const auth = {
  get currentUser(): FakeUser | null {
    const { session, accounts } = load();
    if (!session) return null;
    const account = Object.values(accounts).find((a) => a.uid === session);
    return account ? toUser(account) : null;
  },
};

// Real Firebase notifies on a later tick, never synchronously inside the sign-in call.
function notify(): void {
  setTimeout(() => listeners.forEach((cb) => cb(auth.currentUser)), 0);
}

export class GoogleAuthProvider {}

export function getAuth() {
  return auth;
}

export function onAuthStateChanged(_auth: unknown, cb: AuthListener): () => void {
  listeners.add(cb);
  setTimeout(() => cb(auth.currentUser), 0);
  return () => {
    listeners.delete(cb);
  };
}

export async function createUserWithEmailAndPassword(_auth: unknown, email: string, password: string) {
  const state = load();
  const key = email.toLowerCase();
  if (state.accounts[key]) {
    throw authError("auth/email-already-in-use", "Firebase: Error (auth/email-already-in-use).");
  }
  if (password.length < 6) {
    throw authError("auth/weak-password", "Firebase: Password should be at least 6 characters (auth/weak-password).");
  }
  const account: FakeAccount = { uid: nextId(state, "uid-"), email, password, displayName: null };
  state.accounts[key] = account;
  state.session = account.uid;
  save(state);
  notify();
  return { user: auth.currentUser };
}

export async function signInWithEmailAndPassword(_auth: unknown, email: string, password: string) {
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

export async function updateProfile(user: { uid: string }, { displayName }: { displayName: string }): Promise<void> {
  const state = load();
  const account = Object.values(state.accounts).find((a) => a.uid === user.uid);
  if (account) account.displayName = displayName;
  save(state);
}

export async function signOut(): Promise<void> {
  const state = load();
  state.session = null;
  save(state);
  notify();
}

// Google sign-in needs a real popup; the E2E suite does not cover it.
export async function signInWithPopup(): Promise<never> {
  throw authError("auth/popup-closed-by-user", "Popup closed");
}

export async function sendPasswordResetEmail(): Promise<void> {}

// --- Password change (Settings). Mirrors the real flow: re-authenticate with the current password, then update.
export const EmailAuthProvider = {
  credential: (email: string, password: string) => ({ email, password }),
};

export async function reauthenticateWithCredential(user: { uid: string }, credential: { password: string }): Promise<void> {
  const account = Object.values(load().accounts).find((a) => a.uid === user.uid);
  if (!account || account.password !== credential.password) {
    throw authError("auth/invalid-credential", "Firebase: Error (auth/invalid-credential).");
  }
}

export async function updatePassword(user: { uid: string }, password: string): Promise<void> {
  if (password.length < 6) {
    throw authError("auth/weak-password", "Firebase: Password should be at least 6 characters (auth/weak-password).");
  }
  const state = load();
  const account = Object.values(state.accounts).find((a) => a.uid === user.uid);
  if (account) account.password = password;
  save(state);
}
