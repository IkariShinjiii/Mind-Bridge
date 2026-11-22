import type { RiskLevel } from "../types";

/**
 * The welcome guide's script as plain data, so the wording lives in one place (for the counseling office to review)
 * and the routing can be unit-tested. The guide is automated and tap-only: no free text, and nothing a student taps
 * is stored. Only the optional goals step writes anything, and only when the student saves it.
 */
export type StepId = "greet" | "help" | "goals" | "handoff";
export type Next = StepId | "checkin" | "done";

export interface Choice {
  id: string;
  label: string;
  /** What the guide says back before moving on. */
  reply?: string;
  next: Next;
}

export interface Step {
  /** `{name}` and `{facilitator}` are filled in by the guide. */
  text: string;
  choices: Choice[];
}

export const SCRIPT: Record<Exclude<StepId, "goals">, Step> = {
  greet: {
    text: "Hi {name}. I'm an automated guide, not a person, and nothing you tap here is shared with staff. Want a quick look around?",
    choices: [
      { id: "tour", label: "Show me around", next: "help" },
      { id: "skip", label: "Go straight to my check-in", next: "checkin" },
    ],
  },
  help: {
    text: "What would help most right now?",
    choices: [
      {
        id: "stress",
        label: "School stress",
        reply: "School pressure is very common. A short check-in can show how heavy it has felt lately.",
        next: "goals",
      },
      {
        id: "sleep",
        label: "Sleep",
        reply:
          "Sleep and mood affect each other. The check-in asks about it, and there are sleep tips under Calm and sleep tools.",
        next: "goals",
      },
      {
        id: "low",
        label: "Feeling low",
        reply: "Thank you for saying so. You do not have to work it out alone. A check-in is a gentle place to start.",
        next: "goals",
      },
      { id: "looking", label: "Just looking", reply: "That is fine. Nothing here is required.", next: "goals" },
    ],
  },
  handoff: {
    text: "A check-in takes about a minute. If you would rather talk to a person, {facilitator} is your assigned peer facilitator.",
    choices: [
      { id: "start", label: "Start my check-in", next: "checkin" },
      { id: "later", label: "Maybe later", next: "done" },
    ],
  },
};

export const CRISIS_TEXT =
  "If you need someone right now, call 1553. It is free and open 24/7. You can also message {facilitator}. This guide cannot alert anyone.";

export type GuideMode = "none" | "full" | "short";

/**
 * Which guide a student gets. Decided only once their history has loaded, so a returning student never sees the
 * first-time guide flash up. "short" skips the welcome for a student who already saw the old welcome tour.
 */
export function guideMode(o: { loading: boolean; checkIns: number; tourSeen: boolean; hidden: boolean }): GuideMode {
  if (o.loading || o.checkIns > 0 || o.hidden) return "none";
  return o.tourSeen ? "short" : "full";
}

/** Order of the returning-student header choices. Only the order changes with the last result; the result is never named. */
export function returningOrder(latestRisk: RiskLevel | null | undefined): ["talk", "calm"] | ["calm", "talk"] {
  return latestRisk === "medium" || latestRisk === "high" ? ["talk", "calm"] : ["calm", "talk"];
}
