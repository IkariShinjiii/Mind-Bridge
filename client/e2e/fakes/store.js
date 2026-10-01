// Browser-side persistence for the E2E Firebase fakes. Everything lives in one
// localStorage key so state survives full page loads (e.g. the <a href="/terms"> links)
// and is shared by every page in a Playwright browser context, but never between tests.

export const STORAGE_KEY = "mb_e2e_state";

const empty = () => ({ accounts: {}, docs: {}, session: null, seq: 0 });

export function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || empty();
  } catch {
    return empty();
  }
}

export function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function nextId(state, prefix) {
  state.seq += 1;
  return `${prefix}${state.seq}`;
}
