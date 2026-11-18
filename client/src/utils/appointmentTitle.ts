const DEFAULT_TITLE = "Peer support session";

/** Display title for an appointment. Bookings saved before the Peer Facilitator rebrand still hold counselor wording. */
export function appointmentTitle(title?: string | null): string {
  const t = (title || "").trim();
  if (!t || /^counsell?ing session$/i.test(t) || /^session with (assigned )?counselor$/i.test(t)) return DEFAULT_TITLE;
  return t;
}
