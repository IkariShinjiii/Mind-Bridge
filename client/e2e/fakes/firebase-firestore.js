import { load, save, nextId } from "./store.js";

// Only the slice of Firestore the app uses: collections, docs, equality `where`, and live queries.
const watchers = new Set();

const col = (name) => load().docs[name] || {};

function run(ref) {
  const rows = Object.entries(col(ref.name)).map(([id, data]) => ({ id, data }));
  return rows.filter(({ data }) => (ref.wheres || []).every((w) => data[w.field] === w.value));
}

function snapshot(ref) {
  const docs = run(ref).map(({ id, data }) => ({ id, data: () => ({ ...data }), exists: () => true }));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) };
}

function changed() {
  watchers.forEach((w) => w());
}

// Firestore rejects `undefined` field values; mirror that so app bugs surface in tests.
function clean(data) {
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined) throw new Error(`Unsupported field value: undefined (found in field ${k})`);
  });
  return JSON.parse(JSON.stringify(data));
}

export function getFirestore() {
  return {};
}

export const collection = (_db, name) => ({ kind: "collection", name });
export const doc = (_db, name, id) => ({ kind: "doc", name, id });
export const where = (field, op, value) => {
  if (op !== "==") throw new Error(`E2E Firestore fake only supports "==", got "${op}"`);
  return { field, value };
};
export const query = (ref, ...wheres) => ({ ...ref, wheres });
export const serverTimestamp = () => new Date().toISOString();

export async function getDocs(ref) {
  return snapshot(ref);
}

export async function getDoc(ref) {
  const data = col(ref.name)[ref.id];
  return { id: ref.id, exists: () => data !== undefined, data: () => (data ? { ...data } : undefined) };
}

export async function setDoc(ref, data) {
  const state = load();
  (state.docs[ref.name] ||= {})[ref.id] = clean(data);
  save(state);
  changed();
}

export async function addDoc(ref, data) {
  const state = load();
  const id = nextId(state, "doc-");
  (state.docs[ref.name] ||= {})[id] = clean(data);
  save(state);
  changed();
  return { id };
}

export async function updateDoc(ref, patch) {
  const state = load();
  const existing = state.docs[ref.name]?.[ref.id];
  if (!existing) throw new Error(`No document to update: ${ref.name}/${ref.id}`);
  state.docs[ref.name][ref.id] = { ...existing, ...clean(patch) };
  save(state);
  changed();
}

export async function deleteDoc(ref) {
  const state = load();
  delete state.docs[ref.name]?.[ref.id];
  save(state);
  changed();
}

export function onSnapshot(ref, onNext) {
  const push = () => onNext(snapshot(ref));
  watchers.add(push);
  setTimeout(push, 0);
  return () => watchers.delete(push);
}
