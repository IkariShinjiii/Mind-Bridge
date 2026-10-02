import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * The Calm Wayfinding foundations from DESIGN.md, read live from the `--mb-*` tokens in `styles/theme.css`.
 * Flip Light/Dark in the toolbar: every swatch, contrast ratio and pass/fail mark is recomputed from the
 * rendered theme, so these pages cannot drift from the real values.
 */
const meta = {
  title: "Foundations/Overview",
  tags: ["autodocs"],
  parameters: { layout: "padded", controls: { disable: true } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Reads token values from the nearest `.mb` wrapper and re-reads when the theme attribute changes. */
function useTokens(names: string[]): [RefObject<HTMLDivElement>, Record<string, string>] {
  const ref = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const scope = ref.current?.closest(".mb");
    if (!scope) return undefined;
    const read = () => {
      const style = getComputedStyle(scope);
      setValues(Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--mb-${n}`).trim()])));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(scope, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref as RefObject<HTMLDivElement>, values];
}

// [token, what it is for, token it sits on, minimum ratio it must reach]
/** [token, what it is for, token it sits on, minimum ratio it must reach (null: decorative, no minimum)] */
type TokenRow = [string, string, string, number | null];

const GROUPS: Array<{ title: string; note: string; rows: TokenRow[] }> = [
  {
    title: "Surfaces and text",
    note: "Daytime on campus is the default; the dark theme is for late-night check-ins.",
    rows: [
      ["ink", "Body text and headings", "surface", 4.5],
      ["muted", "Secondary text, hints", "surface", 4.5],
      ["ink", "Text on the page background", "ground", 4.5],
      ["line", "Dividers and card borders", "surface", null],
      ["field-line", "Input borders", "surface", 3],
    ],
  },
  {
    title: "Signage plate",
    note: "The teal plate carries the one key statement on a page.",
    rows: [
      ["panel-ink", "Text on the plate", "panel", 4.5],
      ["panel-soft", "Supporting text on the plate", "panel", 4.5],
      ["brand", "Brand text and icons", "brand-bg", 4.5],
    ],
  },
  {
    title: "Status",
    note: "Risk is always also written in words. Color never carries it alone.",
    rows: [
      ["safe", "Steady, saved, confirmed", "safe-bg", 4.5],
      ["warn", "Waiting, needs a look", "warn-bg", 4.5],
      ["urgent", "Risk and errors", "urgent-bg", 4.5],
      ["error-ink", "Error banner text", "error-bg", 4.5],
      ["violet", "Held for review", "violet-bg", 4.5],
    ],
  },
  {
    title: "Crisis and focus",
    note: "Amber means one thing: the crisis line. Focus is the same 3px ring on every control.",
    rows: [
      ["amber-ink", "Text on the amber crisis strip", "amber", 4.5],
      ["focus", "Focus ring", "surface", 3],
    ],
  },
];

const TOKEN_NAMES = [...new Set(GROUPS.flatMap((g) => g.rows.flatMap(([t, , on]) => [t, on])))];

function Row({
  token,
  use,
  on,
  min,
  v,
}: {
  token: string;
  use: string;
  on: string;
  min: number | null;
  v: Record<string, string>;
}) {
  const fg = v[token];
  const bg = v[on];
  const ready = /^#[0-9a-f]{6}$/i.test(fg || "") && /^#[0-9a-f]{6}$/i.test(bg || "");
  const ratio = ready ? contrast(fg, bg) : null;
  const pass = ratio !== null && min ? ratio >= min : null;
  return (
    <li className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 border-t border-[color:var(--mb-line)] py-3 first:border-t-0">
      <span
        className="grid h-14 w-14 place-items-center rounded-md border border-[color:var(--mb-line)] text-2xl font-bold"
        style={{ background: `var(--mb-${on})`, color: `var(--mb-${token})` }}
        aria-hidden="true"
      >
        Aa
      </span>
      <div className="min-w-0">
        <p className="font-bold">{use}</p>
        <p className="text-sm text-[color:var(--mb-muted)]">
          <code className="whitespace-nowrap">--mb-{token}</code> {fg} on{" "}
          <code className="whitespace-nowrap">--mb-{on}</code>
        </p>
      </div>
      <p className="text-right tabular-nums">
        {ratio === null ? null : (
          <>
            <span className="font-bold">{ratio.toFixed(1)}:1</span>
            {min ? (
              <span
                className={`ml-2 text-sm font-bold ${pass ? "text-[color:var(--mb-safe)]" : "text-[color:var(--mb-urgent)]"}`}
              >
                {pass ? `meets ${min}:1` : `below ${min}:1`}
              </span>
            ) : null}
          </>
        )}
      </p>
    </li>
  );
}

export const Colour: Story = {
  name: "Colour and contrast",
  render: () => {
    const Palette = () => {
      const [ref, values] = useTokens(TOKEN_NAMES);
      return (
        <div ref={ref} className="grid max-w-4xl gap-6 lg:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.title} className="mb-card">
              <h2 className="text-2xl font-bold">{g.title}</h2>
              <p className="mb-3 mt-1 text-[color:var(--mb-muted)]">{g.note}</p>
              <ul>
                {g.rows.map(([token, use, on, min]) => (
                  <Row key={`${token}-${on}`} token={token} use={use} on={on} min={min} v={values} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      );
    };
    return <Palette />;
  },
};

export const Typography: Story = {
  render: () => (
    <div className="max-w-3xl space-y-8">
      <section>
        <p className="text-sm font-bold text-[color:var(--mb-muted)]">
          Barlow Semi Condensed, 700: headings and numerals
        </p>
        <h1 className="mb-sign mt-1 text-6xl font-bold leading-none">You are here</h1>
        <h2 className="mb-sign mt-4 text-4xl font-bold leading-tight">Check-in complete. You&apos;re doing well.</h2>
        <h3 className="mb-sign mt-4 text-2xl font-bold">Upcoming sessions</h3>
        <p className="mb-sign mt-4 text-5xl font-bold tabular-nums">7 / 21</p>
      </section>
      <section>
        <p className="text-sm font-bold text-[color:var(--mb-muted)]">
          Atkinson Hyperlegible Next, 400 and 700: everything else
        </p>
        <p className="mt-2 max-w-[65ch]">
          Seven questions about the last two weeks. About a minute. Your answers are visible to you and approved
          guidance staff only. Body copy stays at 16px or larger on a 1.6 line height, and lines stop at about 65
          characters so a tired reader never loses their place.
        </p>
        <p className="mt-3 max-w-[65ch] font-bold">Bold is for the label or the action, not for whole paragraphs.</p>
        <p className="mt-3 max-w-[65ch] text-sm text-[color:var(--mb-muted)]">
          Small print is for hints and timestamps only.
        </p>
      </section>
    </div>
  ),
};

export const Signage: Story = {
  name: "Plates, shape and focus",
  render: () => (
    <div className="max-w-3xl space-y-6">
      <div className="mb-plate p-8">
        <p className="mb-sign text-xl font-bold opacity-90">You are here</p>
        <h2 className="mb-sign mt-6 text-5xl font-bold leading-none">Welcome back</h2>
        <p className="mt-3 max-w-[40ch] text-lg text-[color:var(--mb-panel-soft)]">
          Log in to check in, see your results, or manage your sessions.
        </p>
      </div>
      <div className="mb-plate-amber p-4">
        <p className="font-semibold">In crisis right now? The NCMH hotline is free and open 24/7.</p>
        <a href="tel:1553" className="mb-sign text-xl font-bold" style={{ color: "inherit" }}>
          Call 1553
        </a>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="mb-card mb-card-sm">
          <p className="font-bold">8 / 12 / 16px corners</p>
          <p className="text-[color:var(--mb-muted)]">Soft but structured. Pills only for filters and badges.</p>
        </div>
        <div className="mb-card mb-card-sm mb-card-interactive">
          <p className="font-bold">1px border, soft shadow</p>
          <p className="text-[color:var(--mb-muted)]">
            Hover to see the lift. Inputs keep a 2px border for 3:1 contrast.
          </p>
        </div>
        <button type="button" className="mb-card mb-card-sm text-left">
          <span className="block font-bold">3px focus ring</span>
          <span className="block text-[color:var(--mb-muted)]">Tab to this card to see it.</span>
        </button>
      </div>
    </div>
  ),
};
