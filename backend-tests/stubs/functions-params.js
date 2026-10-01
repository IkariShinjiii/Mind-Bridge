export const defineSecret = (name) => ({ value: () => (globalThis.__fn?.secrets ?? {})[name] ?? "smtps://u:p@smtp.test:465" });
export const defineString = (name, opts = {}) => ({ value: () => (globalThis.__fn?.params ?? {})[name] ?? opts.default });
