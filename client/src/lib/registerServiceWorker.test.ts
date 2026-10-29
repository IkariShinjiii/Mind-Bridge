import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./registerServiceWorker";

function setup({ production = true, webdriver = false, supported = true, fails = false, ready = "loading" } = {}) {
  const register = vi.fn(() => (fails ? Promise.reject(new Error("blocked")) : Promise.resolve({} as never)));
  let onLoad: (() => void) | undefined;
  registerServiceWorker({
    production,
    navigator: { webdriver, ...(supported ? { serviceWorker: { register } } : {}) },
    document: { readyState: ready as DocumentReadyState },
    window: {
      addEventListener: ((_: string, fn: () => void) => (onLoad = fn)) as unknown as Window["addEventListener"],
    },
  });
  return { register, load: () => onLoad?.() };
}

describe("registerServiceWorker", () => {
  it("registers /sw.js once the page has loaded in production", () => {
    const { register, load } = setup();
    expect(register).not.toHaveBeenCalled(); // waits for load
    load();
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("registers right away when the page finished loading before the app code ran", () => {
    const { register } = setup({ ready: "complete" });
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("does nothing in development", () => {
    const { register, load } = setup({ production: false });
    load();
    expect(register).not.toHaveBeenCalled();
  });

  it("does nothing under browser automation, so tests never run behind a cache", () => {
    const { register, load } = setup({ webdriver: true });
    load();
    expect(register).not.toHaveBeenCalled();
  });

  it("does nothing in a browser without service workers", () => {
    const { register, load } = setup({ supported: false });
    load();
    expect(register).not.toHaveBeenCalled();
  });

  it("only warns when registration fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { load } = setup({ fails: true });
    load();
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    warn.mockRestore();
  });
});
