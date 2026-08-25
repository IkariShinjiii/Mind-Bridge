import { useEffect, useState } from "react";
import { getSurvey, submitResponse } from "../api";
import { useAuth } from "../AuthContext.jsx";

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
    <div className="max-w-3xl mx-auto px-3 py-8 sm:px-6 sm:py-12">
      <p className="text-teal font-semibold tracking-[0.2em] text-[10px] sm:text-xs mb-2">
        WEEKLY CHECK-IN
      </p>
      <h1 className="font-display text-2xl sm:text-3xl text-ink mb-2">
        How are you doing, {user?.name?.split(" ")[0]}?
      </h1>
      <p className="text-sm sm:text-base text-ink/60 mb-6 sm:mb-8">
        This takes about a minute. Your answers are confidential and only used
        to connect you with support if you need it.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-ink/10">
            <p className="font-medium text-sm sm:text-base mb-3">
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
                  className={`text-[11px] sm:text-xs rounded-lg py-2.5 px-2 border transition ${
                    answers[q.id] === opt.value
                      ? "bg-ink text-white border-ink"
                      : "border-ink/15 hover:border-ink/40"
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
          className="w-full bg-teal text-ink font-semibold rounded-lg py-3 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-95 transition"
        >
          {submitting ? "Submitting…" : "Submit check-in"}
        </button>
      </form>
    </div>
  );
}
