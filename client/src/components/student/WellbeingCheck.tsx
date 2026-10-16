import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Smile } from "lucide-react";
import { getMyWellbeing, submitWellbeing } from "../../lib/api";
import { wellbeingSchema } from "../../lib/schemas";
import { validate } from "../../lib/validate";
import { friendlyError } from "../../utils/errors";
import { scoreWho5, WHO5_OPTIONS, WHO5_QUESTIONS } from "../../utils/clinical";
import { useToast } from "../ui/Toast";
import type { WellbeingEntry } from "../../types";

const blank = (): Array<number | null> => WHO5_QUESTIONS.map(() => null);

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

/**
 * Optional WHO-5 Well-Being Index: five positive statements about the last two weeks, scored 0 to 100. It is kept
 * apart from the check-in and never changes a check-in's risk level; it is a gentle look at how things have been going.
 */
export default function WellbeingCheck() {
  const toast = useToast();
  const [entries, setEntries] = useState<WellbeingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Array<number | null>>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getMyWellbeing()
      .then((list) => {
        if (mounted) setEntries(list);
      })
      .catch((err: unknown) => {
        if (mounted) toast.error(friendlyError(err, "Your wellbeing scores could not be loaded."));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [toast]);

  const latest = entries[0];
  const low = latest ? scoreWho5(latest.answers).low : false;

  async function save() {
    const check = validate(wellbeingSchema, { answers });
    if (!check.ok) {
      setError(check.error.userMessage);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await submitWellbeing(check.data.answers);
      setEntries((prev) => [saved, ...prev]);
      setOpen(false);
      setAnswers(blank());
      toast.success("Your wellbeing score was saved.");
    } catch (err) {
      console.error("Failed to save wellbeing", err);
      setError(friendlyError(err, "Your answers could not be saved. They are still here. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-card" aria-labelledby="wellbeing-h">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)]">
          <Smile className="h-5 w-5 text-[color:var(--mb-brand)]" aria-hidden="true" />
        </span>
        <h2 id="wellbeing-h" className="text-2xl font-bold text-[color:var(--mb-ink)]">
          Wellbeing
        </h2>
      </div>
      <p className="mt-1 text-[color:var(--mb-muted)]">
        Five optional statements about the positive side of the last two weeks. Takes under a minute. This does not
        change your check-in result.
      </p>

      {!open && !loading && latest && (
        <div className="mt-4">
          <p className="mb-sign text-3xl font-bold text-[color:var(--mb-ink)]">
            {latest.score} <span className="text-lg font-normal text-[color:var(--mb-muted)]">out of 100</span>
          </p>
          <p className="text-[color:var(--mb-muted)]">Saved {when(latest.createdAt)}. Higher means better wellbeing.</p>
          {low ? (
            <p className="mt-2 text-[color:var(--mb-ink)]">
              A score under 50 suggests things have felt low lately. That is not a diagnosis, and a counselor can help.{" "}
              <Link to="/appointments" className="font-bold underline">
                Book a counselor
              </Link>
            </p>
          ) : (
            <p className="mt-2 text-[color:var(--mb-ink)]">A score of 50 or more suggests your wellbeing has been fairly good.</p>
          )}
          {entries.length > 1 && (
            <p className="mt-2 text-sm text-[color:var(--mb-muted)]">
              Earlier scores: {entries.slice(1, 6).map((e) => e.score).join(", ")}
            </p>
          )}
        </div>
      )}

      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="mb-btn mb-btn-line mt-4" disabled={loading}>
          {latest ? "Answer again" : "Answer the five statements"}
        </button>
      )}

      {open && (
        <form
          className="mt-4 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <p className="font-bold text-[color:var(--mb-ink)]">Over the last two weeks…</p>
          {WHO5_QUESTIONS.map((text, i) => (
            <fieldset key={text}>
              <legend className="mb-2 font-bold text-[color:var(--mb-ink)]">{text}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {WHO5_OPTIONS.map((opt) => (
                  <label key={opt.value} className="block cursor-pointer">
                    <input
                      type="radio"
                      name={`who5-${i}`}
                      value={opt.value}
                      checked={answers[i] === opt.value}
                      onChange={() => setAnswers((prev) => prev.map((v, k) => (k === i ? opt.value : v)))}
                      className="peer sr-only"
                    />
                    <span className="flex min-h-[44px] items-center rounded-md border border-[color:var(--mb-line)] px-3 text-[color:var(--mb-ink)] peer-checked:border-[color:var(--mb-brand)] peer-checked:bg-[color:var(--mb-brand-bg)] peer-checked:font-bold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {error && (
            <p role="alert" className="font-bold text-[color:var(--mb-urgent)]">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="mb-btn mb-btn-solid" disabled={saving}>
              {saving ? "Saving…" : "Save my wellbeing score"}
            </button>
            <button
              type="button"
              className="mb-btn mb-btn-line"
              disabled={saving}
              onClick={() => {
                setOpen(false);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <p className="mt-4 text-sm text-[color:var(--mb-muted)]">
        WHO-5 Well-Being Index, Psychiatric Research Unit, WHO Collaborating Centre for Mental Health, Frederiksborg General
        Hospital, Hillerød, Denmark.
      </p>
    </section>
  );
}
