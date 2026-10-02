import { useReducedMotion, type TargetAndTransition, type Transition, type Variants } from "framer-motion";

/** Durations in seconds. Mirror --mb-fast / --mb-base in theme.css; DESIGN.md caps everything at 300ms except the landing route. */
export const duration = {
  fast: 0.15,
  base: 0.22,
  page: 0.26,
  step: 0.24,
  exit: 0.12,
  /** The landing route line and its stops: the only long motion allowed. */
  route: 1.4,
} as const;

/** Same curve as --mb-ease. */
export const ease = [0.22, 1, 0.36, 1] as const;

export const transition = {
  fast: { duration: duration.fast, ease } satisfies Transition,
  base: { duration: duration.base, ease } satisfies Transition,
  page: { duration: duration.page, ease } satisfies Transition,
  step: { duration: duration.step, ease } satisfies Transition,
  exit: { duration: duration.exit, ease: "easeIn" } satisfies Transition,
  toastOut: { duration: 0.18, ease: "easeIn" } satisfies Transition,
  dialog: { type: "spring", duration: 0.3, bounce: 0 } satisfies Transition,
} as const;

/** Props to spread onto an `m.*` element. */
export interface MotionPreset {
  initial: TargetAndTransition | false;
  animate: TargetAndTransition;
  exit?: TargetAndTransition;
  transition?: Transition;
}

/** 8px rise and fade: page change, panels, cards entering. */
export const pagePreset: MotionPreset = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transition.page },
  exit: { opacity: 0, transition: transition.exit },
};

/** Plain fade: alerts, field errors, crossfades. */
export const fadePreset: MotionPreset = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transition.base },
  exit: { opacity: 0, transition: transition.exit },
};

/** Dialog card. Backdrop uses `fadePreset`. */
export const dialogPreset: MotionPreset = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: transition.dialog },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: transition.exit },
};

/** Toast: slides in from the right in 240ms, out in 180ms (DESIGN.md). */
export const toastPreset: MotionPreset = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: transition.step },
  exit: { opacity: 0, x: 24, transition: transition.toastOut },
};

/** Check-in / booking step. Pass 1 to move forward, -1 to move back. */
export const stepVariants: Variants = {
  enter: (dir: 1 | -1) => ({ opacity: 0, x: 10 * dir }),
  center: { opacity: 1, x: 0, transition: transition.step },
  exit: (dir: 1 | -1) => ({ opacity: 0, x: -10 * dir, transition: transition.exit }),
};

/** Parent/child pair for lists. Parent only staggers; the child does the lift. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: transition.base },
};

/** Hover lift for cards (220ms, matches .mb-card). */
export const cardHover = { y: -2, transition: transition.base } satisfies TargetAndTransition;
/** Press feedback for buttons (matches active:scale-[0.98]). */
export const buttonTap = { scale: 0.98, transition: transition.fast } satisfies TargetAndTransition;

const none: MotionPreset = { initial: {}, animate: {} };

/**
 * DESIGN.md: with prefers-reduced-motion, animation is removed, not shortened.
 * MotionConfig only strips transforms and keeps opacity fades, so presets go through this hook
 * to drop the motion entirely. Elements render in their final state and still unmount instantly.
 */
export function useMotionPreset(preset: MotionPreset): MotionPreset {
  const reduced = useReducedMotion();
  return reduced ? { ...none, initial: false } : preset;
}

/** True when animation should be skipped. Use for variants, `whileHover` and `whileTap`. */
export function useNoMotion(): boolean {
  return useReducedMotion() ?? false;
}
