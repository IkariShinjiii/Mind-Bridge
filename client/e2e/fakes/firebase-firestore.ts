import { load, save, nextId, type FakeDoc } from "./store";

// Only the slice of Firestore the app uses: collections, docs, equality `where`, and live queries.

interface WhereClause {
  field: string;
  value: unknown;
}

interface CollectionRef {
  kind: "collection";
  name: string;
  wheres?: WhereClause[];
}

interface DocRef {
  kind: "doc";
  name: string;
  id: string;
}

interface FakeSnapshot {
  docs: Array<{ id: string; data: () => FakeDoc; exists: () => boolean }>;
  size: number;
  empty: boolean;
  forEach: (fn: (d: FakeSnapshot["docs"][number]) => void) => void;
}

const watchers = new Set<() => void>();

const col = (name: string): Record<string, FakeDoc> => load().docs[name] ?? {};

function run(ref: CollectionRef): Array<{ id: string; data: FakeDoc }> {
  const rows = Object.entries(col(ref.name)).map(([id, data]) => ({ id, data }));
  return rows.filter(({ data }) => (ref.wheres ?? []).every((w) => data[w.field] === w.value));
}

function snapshot(ref: CollectionRef): FakeSnapshot {
  const docs = run(ref).map(({ id, data }) => ({ id, data: () => ({ ...data }), exists: () => true }));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) };
}

function changed(): void {
  watchers.forEach((w) => w());
}

// Firestore rejects `undefined` field values; mirror that so app bugs surface in tests.
function clean(data: FakeDoc): FakeDoc {
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined) throw new Error(`Unsupported field value: undefined (found in field ${k})`);
  });
  return JSON.parse(JSON.stringify(data)) as FakeDoc;
}

export function getFirestore(): Record<string, never> {
  return {};
}

export const collection = (_db: unknown, name: string): CollectionRef => ({ kind: "collection", name });
export const doc = (_db: unknown, name: string, id: string): DocRef => ({ kind: "doc", name, id });
export const where = (field: string, op: string, value: unknown): WhereClause => {
  if (op !== "==") throw new Error(`E2E Firestore fake only supports "==", got "${op}"`);
  return { field, value };
};
export const query = (ref: CollectionRef, ...wheres: WhereClause[]): CollectionRef => ({ ...ref, wheres });
export const serverTimestamp = (): string => new Date().toISOString();

export async function getDocs(ref: CollectionRef): Promise<FakeSnapshot> {
  return snapshot(ref);
}

export async function getDoc(ref: DocRef) {
  const data = col(ref.name)[ref.id];
  return { id: ref.id, exists: () => data !== undefined, data: () => (data ? { ...data } : undefined) };
}

export async function setDoc(ref: DocRef, data: FakeDoc): Promise<void> {
  const state = load();
  (state.docs[ref.name] ||= {})[ref.id] = clean(data);
  save(state);
  changed();
}

export async function addDoc(ref: CollectionRef, data: FakeDoc): Promise<{ id: string }> {
  const state = load();
  const id = nextId(state, "doc-");
  (state.docs[ref.name] ||= {})[id] = clean(data);
  save(state);
  changed();
  return { id };
}

export async function updateDoc(ref: DocRef, patch: FakeDoc): Promise<void> {
  const state = load();
  const existing = state.docs[ref.name]?.[ref.id];
  if (!existing) throw new Error(`No document to update: ${ref.name}/${ref.id}`);
  (state.docs[ref.name] ||= {})[ref.id] = { ...existing, ...clean(patch) };
  save(state);
  changed();
}

export async function deleteDoc(ref: DocRef): Promise<void> {
  const state = load();
  delete state.docs[ref.name]?.[ref.id];
  save(state);
  changed();
}

export function onSnapshot(ref: CollectionRef, onNext: (snap: FakeSnapshot) => void): () => void {
  const push = () => onNext(snapshot(ref));
  watchers.add(push);
  setTimeout(push, 0);
  return () => {
    watchers.delete(push);
  };
}
