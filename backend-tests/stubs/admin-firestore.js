// collection("users").where(...).get() -> the staff documents the test put in globalThis.__fn.users.
// runTransaction runs the callback against the trigger's own document (a plain object in the test's event).
export const FieldValue = { delete: () => ({ __delete: true }) };

export const applyUpdate = (doc, data) => {
  for (const [k, v] of Object.entries(data)) {
    if (v && v.__delete) delete doc[k];
    else doc[k] = v;
  }
};

export const getFirestore = () => ({
  runTransaction: async (fn) =>
    fn({
      get: async (ref) => ({ get: (k) => ref.doc[k] }),
      update: (ref, data) => applyUpdate(ref.doc, data),
    }),
  collection: (name) => ({
    where: (field, op, values) => ({
      get: async () => {
        globalThis.__fn.queries.push({ name, field, op, values });
        return { docs: (globalThis.__fn.users ?? []).map((u) => ({ data: () => u })) };
      },
    }),
  }),
});
