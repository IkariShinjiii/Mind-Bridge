import { describe, it, expect } from "vitest";
import { validateSlotForBooking } from "./booking";
import type { AvailabilitySlot } from "../types";

const slot = (over: Partial<AvailabilitySlot> = {}): AvailabilitySlot =>
  ({
    id: "s1",
    counselorId: "c1",
    counselorName: "Dr. Reyes",
    start: "2026-10-20T09:00:00.000Z",
    end: "2026-10-20T10:00:00.000Z",
    ...over,
  }) as AvailabilitySlot;

describe("validateSlotForBooking", () => {
  it("accepts a complete slot", () => expect(validateSlotForBooking(slot()).ok).toBe(true));

  it("rejects a slot with no id or counselor, naming the problem", () => {
    const r1 = validateSlotForBooking(slot({ id: "" }));
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error.fieldErrors?.id).toBe("Pick a time slot.");
    const r2 = validateSlotForBooking(slot({ counselorId: "" }));
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error.fieldErrors?.counselorId).toBe("That slot has no counselor.");
  });

  it("rejects an end that is not after the start", () => {
    const r = validateSlotForBooking(slot({ end: "2026-10-20T09:00:00.000Z" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.fieldErrors?.end).toBe("The end time must be after the start time.");
  });

  it("rejects a slot with no readable times", () => {
    const r = validateSlotForBooking(slot({ start: undefined, end: undefined }));
    expect(r.ok).toBe(false);
  });

  it("honours the older field names (time and to)", () => {
    const old = slot({
      start: undefined,
      end: undefined,
      time: "2026-10-20T09:00:00.000Z",
      to: "2026-10-20T10:00:00.000Z",
    } as Partial<AvailabilitySlot>);
    expect(validateSlotForBooking(old).ok).toBe(true);
  });
});
