import { describe, expect, it } from "vitest";
import { SCRIPT, guideMode, returningOrder, type Next } from "./onboardingScript";

describe("guideMode", () => {
  const base = { loading: false, checkIns: 0, tourSeen: false, hidden: false };
  it("first-time student gets the full guide", () => expect(guideMode(base)).toBe("full"));
  it("a student who saw the old tour skips the welcome", () =>
    expect(guideMode({ ...base, tourSeen: true })).toBe("short"));
  it("a hidden guide stays hidden", () => expect(guideMode({ ...base, tourSeen: true, hidden: true })).toBe("none"));
  it("a student with any check-in gets no guide", () => expect(guideMode({ ...base, checkIns: 1 })).toBe("none"));
  it("shows nothing while history is loading, so a returning student never sees it flash", () =>
    expect(guideMode({ ...base, loading: true })).toBe("none"));
});

describe("returningOrder", () => {
  it("puts talking first after a medium or high result", () => {
    expect(returningOrder("medium")[0]).toBe("talk");
    expect(returningOrder("high")[0]).toBe("talk");
  });
  it("puts a calm moment first otherwise, and always offers both", () => {
    for (const r of ["low", null, undefined] as const) expect(returningOrder(r)).toEqual(["calm", "talk"]);
  });
});

describe("script", () => {
  const steps = Object.values(SCRIPT);
  it("every step has choices and every choice leads somewhere that exists", () => {
    const valid: Next[] = ["greet", "help", "goals", "handoff", "checkin", "done"];
    for (const step of steps) {
      expect(step.choices.length).toBeGreaterThan(0);
      for (const c of step.choices) expect(valid).toContain(c.next);
    }
  });
  it("the welcome says it is automated and that taps are not shared", () => {
    expect(SCRIPT.greet.text).toMatch(/automated guide, not a person/);
    expect(SCRIPT.greet.text).toMatch(/shared with staff/);
  });
  it("is short: welcome, help, goals, hand-off is the longest path", () => {
    expect(Object.keys(SCRIPT).length + 1).toBeLessThanOrEqual(4); // the goals step is built into the guide
  });
  it("a route to the check-in exists from the welcome and the hand-off", () => {
    expect(SCRIPT.greet.choices.some((c) => c.next === "checkin")).toBe(true);
    expect(SCRIPT.handoff.choices.some((c) => c.next === "checkin")).toBe(true);
  });
});
