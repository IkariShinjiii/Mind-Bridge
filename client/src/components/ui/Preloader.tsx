import { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";

/** Port of the "Web Preload" Framer layout: name, a cycling slogan, two blurred colour glows, then the panel lifts away. */
const SLOGANS = ["Support that meets you where you are", "A bridge to the help you need"];
const NAME = "MIND BRIDGE";
const HOLD_MS = 2700;
const SLOGAN_MS = 1700;
const STORAGE_KEY = "mb-preloaded";
const spring = { type: "spring", damping: 40, stiffness: 400, mass: 1 } as const;
const lift = { duration: 1, ease: [1, 0.01, 0.38, 1.01] } as const;

function skipIntro(): boolean {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Full-screen intro, once per browser session. Skipped for reduced motion (DESIGN.md: removed, not shortened). */
export default function Preloader() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(() => !skipIntro());
  const [slogan, setSlogan] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (reduced) {
      setOpen(false);
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode: the intro just plays again next visit */
    }
    const close = window.setTimeout(() => setOpen(false), HOLD_MS);
    const cycle = window.setInterval(() => setSlogan((i) => (i + 1) % SLOGANS.length), SLOGAN_MS);
    return () => {
      window.clearTimeout(close);
      window.clearInterval(cycle);
    };
  }, [open, reduced]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="preloader"
          className="mb fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ background: "var(--mb-ground)", color: "var(--mb-ink)" }}
          initial={{ y: 0 }}
          exit={{ y: "-100%", transition: lift }}
          role="status"
          aria-label="Loading Mind Bridge"
        >
          <m.div
            aria-hidden
            className="absolute -bottom-[300px] -left-[300px] h-[520px] w-[520px] sm:h-[640px] sm:w-[640px]"
            style={{
              background: "radial-gradient(closest-side, var(--mb-accent) 0%, transparent 100%)",
              filter: "blur(57px)",
            }}
            initial={{ x: 1200, scale: 1.2 }}
            animate={{ x: 0, scale: 1, transition: { type: "spring", bounce: 0.2, duration: 2.2 } }}
          />
          <m.div
            aria-hidden
            className="absolute -right-[300px] -top-[300px] h-[520px] w-[520px] sm:h-[640px] sm:w-[640px]"
            style={{
              background: "radial-gradient(closest-side, var(--mb-brand) 0%, transparent 100%)",
              filter: "blur(57px)",
              opacity: 0.35,
            }}
            initial={{ x: -1200, scale: 1.2 }}
            animate={{ x: 0, scale: 1, transition: { type: "spring", bounce: 0.2, duration: 2.2 } }}
          />
          <div className="relative z-10 flex flex-col items-center gap-2 px-4 text-center">
            {/* Not a heading: the page behind it owns the h1. The overlay's role=status label already names it. */}
            <p aria-hidden className="flex font-display text-5xl font-bold tracking-tight sm:text-7xl">
              {NAME.split("").map((ch, i) => (
                <m.span
                  key={i}
                  className="inline-block whitespace-pre"
                  initial={{ opacity: 0, x: 200, scale: 3, skewY: 3, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, scale: 1, skewY: 0, filter: "blur(0px)" }}
                  transition={{ ...spring, delay: 0.5 + i * 0.05 }}
                >
                  {ch}
                </m.span>
              ))}
            </p>
            <div className="h-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <m.p
                  key={slogan}
                  aria-hidden
                  className="text-base font-medium"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.2, delay: slogan === 0 ? 0.9 : 0 }}
                >
                  {SLOGANS[slogan]}
                </m.p>
              </AnimatePresence>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
