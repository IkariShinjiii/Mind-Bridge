// Browser-side persistence for the E2E Firebase fakes. Everything lives in one
// localStorage key so state survives full page loads (e.g. the <a href="/terms"> links)
// and is shared by every page in a Playwright browser context, but never between tests.

export const STORAGE_KEY = "mb_e2e_state";

export interface FakeAccount {
  uid: string;
  email: string;
  password: string;
  displayName: string | null;
}

export type FakeDoc = Record<string, unknown>;

export interface FakeState {
  accounts: Record<string, FakeAccount>;
  /** collection name -> document id -> data */
  docs: Record<string, Record<string, FakeDoc>>;
  /** uid of the signed-in account, if any */
  session: string | null;
  seq: number;
}

const empty = (): FakeState => ({ accounts: {}, docs: {}, session: null, seq: 0 });

export function load(): FakeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FakeState) : empty();
  } catch {
    return empty();
  }
}

export function save(state: FakeState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function nextId(state: FakeState, prefix: string): string {
  state.seq += 1;
  return `${prefix}${state.seq}`;
}
