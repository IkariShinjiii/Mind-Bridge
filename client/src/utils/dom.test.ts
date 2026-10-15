import { describe, it, expect, vi, afterEach } from "vitest";
import { focusById, valueById } from "./dom";

afterEach(() => vi.unstubAllGlobals());

describe("focusById", () => {
  it("focuses the element with that id", () => {
    const focus = vi.fn();
    vi.stubGlobal("document", { getElementById: (id: string) => (id === "email" ? { focus } : null) });
    focusById("email");
    expect(focus).toHaveBeenCalledOnce();
  });
  it("does nothing for a missing id or element", () => {
    const getElementById = vi.fn(() => null);
    vi.stubGlobal("document", { getElementById });
    expect(() => focusById(undefined)).not.toThrow();
    expect(getElementById).not.toHaveBeenCalled();
    expect(() => focusById("ghost")).not.toThrow();
  });
});

describe("valueById", () => {
  class FakeInput {
    constructor(public value: string) {}
  }
  it("reads an input's value and returns an empty string otherwise", () => {
    vi.stubGlobal("HTMLInputElement", FakeInput);
    vi.stubGlobal("HTMLTextAreaElement", class {});
    vi.stubGlobal("document", {
      getElementById: (id: string) => (id === "a" ? new FakeInput("hello") : id === "div" ? {} : null),
    });
    expect(valueById("a")).toBe("hello");
    expect(valueById("div")).toBe("");
    expect(valueById("missing")).toBe("");
  });
});
