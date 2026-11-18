import { ExternalLink, LifeBuoy } from "lucide-react";
import type { RiskLevel } from "../../types";
import { PATNUBAY_BOOKING_URL, shouldReferOut } from "../../utils/referral";

interface ReferralCardProps {
  level: RiskLevel;
  /** Short context the student can mention when booking, e.g. "Full check-in on Nov 18, 2026". */
  context?: string;
}

/**
 * The "bridge" to formal counseling. Mind Bridge connects students with peer facilitators;
 * when a check-in shows elevated concern this card points the student to the USA Guidance
 * Center's own PATNUBAY system to book a session with a licensed guidance counselor. Shown
 * only for medium/high results; nothing renders otherwise.
 */
export default function ReferralCard({ level, context }: ReferralCardProps) {
  if (!shouldReferOut(level)) return null;
  return (
    <div className="mb-tile">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]">
          <LifeBuoy className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-bold text-[color:var(--mb-ink)]">Want to talk to a professional counselor?</p>
          <p className="mt-1 text-[color:var(--mb-muted)]">
            Mind Bridge connects you with peer facilitators. For formal counseling with a licensed guidance counselor,
            you can book directly with the USA Guidance Center through their PATNUBAY system.
          </p>
          {context && (
            <p className="mt-2 text-sm text-[color:var(--mb-ink)]">
              You can mention your latest check-in when you book: <strong>{context}</strong>
            </p>
          )}
          <a
            href={PATNUBAY_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-btn mb-btn-line mt-3 inline-flex items-center gap-2"
          >
            Book formal counseling (PATNUBAY)
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <p className="mt-2 text-xs text-[color:var(--mb-muted)]">
            Opens the USA Guidance Center's booking site in a new tab. Your Mind Bridge data is not shared
            automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
