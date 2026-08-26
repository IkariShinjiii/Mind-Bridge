import { useEffect, useState } from "react";
import { getSurvey, submitResponse } from "../api";
import { useAuth } from "../AuthContext.jsx";
import Spinner from "./Spinner";

const SCALE = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
];

export default function SurveyForm({ onSubmitted }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getSurvey().then((data) => setQuestions(data.questions));
  }, []);

  const allAnswered =
    questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const result = await submitResponse(answers);
    setSubmitting(false);
    onSubmitted?.(result);
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-8 animate-fade-up sm:px-6 sm:py-12">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal sm:text-xs">
        WEEKLY CHECK-IN
      </p>
      <h1 className="mb-2 font-display text-2xl text-ink sm:text-3xl">
        How are you doing, {user?.name?.split(" ")[0]}?
      </h1>
      <p className="text-sm sm:text-base text-ink/60 mb-6 sm:mb-8">
        This takes about a minute. Your answers are confidential and only used
        to connect you with support if you need it.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {questions.map((q, i) => (
          <div key={q.id} className="card-surface p-4 sm:p-5">
            <p className="mb-3 text-sm font-medium sm:text-base">
              {i + 1}. {q.text}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {SCALE.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))
                  }
                  className={`action-button rounded-lg border px-2 py-2.5 text-[11px] transition-all duration-200 sm:text-xs ${
                    answers[q.id] === opt.value
                      ? "border-ink bg-ink text-white shadow-sm"
                      : "border-ink/15 hover:border-ink/40 hover:bg-mist"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={!allAnswered || submitting}
          className="action-button inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal py-3 font-semibold text-ink shadow-sm transition-all duration-200 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? (
            <>
              <Spinner size={15} className="text-ink" />
              <span>Submitting…</span>
            </>
          ) : (
            "Submit check-in"
          )}
        </button>
      </form>
    </div>
  );
}
