// collection("users").where(...).get() -> the staff documents the test put in globalThis.__fn.users
export const getFirestore = () => ({
  collection: (name) => ({
    where: (field, op, values) => ({
      get: async () => {
        globalThis.__fn.queries.push({ name, field, op, values });
        return { docs: (globalThis.__fn.users ?? []).map((u) => ({ data: () => u })) };
      },
    }),
  }),
});
