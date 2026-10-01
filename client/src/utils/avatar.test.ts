import { describe, it, expect } from "vitest";
import { AVATAR_COLORS, avatarColor } from "./avatar";

// WCAG relative luminance / contrast ratio of white text on a hex background.
const channel = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

describe("AVATAR_COLORS", () => {
  it("keeps the ids already saved in users/{uid}.avatarGradient", () => {
    expect(AVATAR_COLORS.map((c) => c.id)).toEqual(["cyan", "purple", "emerald", "amber", "rose"]);
  });
  it("has unique ids, display names and valid 6-digit hex colours", () => {
    expect(new Set(AVATAR_COLORS.map((c) => c.id)).size).toBe(AVATAR_COLORS.length);
    expect(new Set(AVATAR_COLORS.map((c) => c.name)).size).toBe(AVATAR_COLORS.length);
    for (const c of AVATAR_COLORS) expect(c.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it.each(AVATAR_COLORS)("$name ($color) gives white initials at least 4.5:1 contrast", ({ color }) => {
    expect(contrastWithWhite(color)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("avatarColor", () => {
  it.each(AVATAR_COLORS)("maps $id to $color", ({ id, color }) => {
    expect(avatarColor(id)).toBe(color);
  });
  it.each([[undefined], [null], [""], ["unknown"], ["CYAN"], [42], [{}]])("falls back to teal for %j", (id) => {
    expect(avatarColor(id as never)).toBe(AVATAR_COLORS[0]!.color);
  });
});
