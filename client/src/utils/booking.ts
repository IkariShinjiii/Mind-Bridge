import { bookingSlotSchema } from "../lib/schemas";
import { validate } from "../lib/validate";
import type { AvailabilitySlot, Result } from "../types";

/**
 * Checks that a slot has what a booking needs (id, counselor, a readable start and a later end) before it is sent.
 * Older slots stored their times under `date`/`time`/`to`; those names are honoured.
 */
export function validateSlotForBooking(slot: AvailabilitySlot): Result<unknown> {
  return validate(bookingSlotSchema, {
    id: slot.id,
    counselorId: slot.counselorId,
    counselorName: slot.counselorName,
    start: slot.start || slot.date || slot.time,
    end: slot.end || slot.to,
  });
}
