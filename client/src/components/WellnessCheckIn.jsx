import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// WellnessCheckIn.jsx
// - Dark-mode themed single-question-at-a-time wellness check-in
// - useState for index/answers/submission state
// - Mock questions (5) with one urgent-flagging option
// - Rule-based scoring to determine Low / Medium / High risk
// - Post-submission empathetic feedback and actions

const QUESTIONS = [
  {
    id: "q1",
    text: "Over the past week, how often have you felt overwhelmed by your responsibilities?",
    options: [
      { label: "Never", value: 0 },
      { label: "Sometimes", value: 1 },
      { label: "Often", value: 2 },
      { label: "Always", value: 3 },
    ],
  },
  {
    id: "q2",
    text: "How frequently have you had trouble sleeping due to stress or worry?",
    options: [
      { label: "Not at all", value: 0 },
      { label: "Occasionally", value: 1 },
      { label: "Regularly", value: 2 },
      { label: "Nearly every night", value: 3 },
    ],
  },
  {
    id: "q3",
    text: "How often have you felt unable to cope with everyday tasks?",
    options: [
      { label: "Never", value: 0 },
      { label: "Sometimes", value: 1 },
      { label: "Often", value: 2 },
      { label: "Always", value: 3 },
    ],
  },
  {
    id: "q4",
    text: "In the past week have you felt hopeless or had thoughts that worried you?",
    options: [
      { label: "No", value: 0 },
      { label: "A little", value: 1 },
      { label: "Moderately", value: 2 },
      // The following option should trigger urgent flagging in scoring
      { label: "Yes — I need support now", value: 3, urgent: true },
    ],
  },
  {
    id: "q5",
    text: "How supported do you feel by friends, family, or campus resources right now?",
    options: [
      { label: "Very supported", value: 0 },
      { label: "Somewhat supported", value: 1 },
      { label: "Not much support", value: 2 },
      { label: "No support", value: 3 },
    ],
  },
];

function Spinner({ size = 18, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path
        d="M22 12a10 10 0 00-10-10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="opacity-100 animate-spin"
      />
    </svg>
  );
}

export default function WellnessCheckIn({ onReturn, onBook, onSubmitted }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));
  const [state, setState] = useState("idle"); // idle | submitting | completed
  const [result, setResult] = useState(null);

  const current = QUESTIONS[index];

  function choose(value) {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  }

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function next() {
    if (index < QUESTIONS.length - 1) setIndex((i) => i + 1);
  }

  function score(answersArray) {
    let total = 0;
    let flagged = false;
    QUESTIONS.forEach((q, i) => {
      const a = answersArray[i];
      if (typeof a === "number") {
        total += a;
        const opt = q.options.find((o) => o.value === a);
        if (opt && opt.urgent) flagged = true;
      }
    });

    // Transparent thresholds (tunable):
    // 0 - 4: Low, 5 - 9: Medium, >=10: High
    let level = "low";
    if (flagged) level = "high";
    else if (total >= 10) level = "high";
    else if (total >= 5) level = "medium";

    return { total, flagged, level };
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    // Basic validation: make sure all questions answered
    if (answers.some((a) => a === null)) {
      // jump to first unanswered question for better UX
      const first = answers.findIndex((a) => a === null);
      setIndex(first >= 0 ? first : 0);
      return;
    }

    setState("submitting");

    const outcome = score(answers);
    const payload = {
      answers: QUESTIONS.map((q, i) => ({ id: q.id, answer: answers[i] })),
      totalScore: outcome.total,
      riskLevel: outcome.level,
      urgentFlag: outcome.flagged,
      submittedAt: new Date().toISOString(),
    };

    // Log payload instead of sending to backend per requirements
    console.log("Wellness check submitted:", payload);

    // emulate async latency for a polished UX
    await new Promise((r) => setTimeout(r, 700));

    setResult(payload);
    setState("completed");
    if (typeof onSubmitted === "function") {
      try {
        onSubmitted(payload);
      } catch (e) {
        // swallow errors from consumer callback to avoid crashing the form
        console.warn("onSubmitted callback error", e);
      }
    }
  }

  function handleReturn() {
    if (typeof onReturn === "function") return onReturn();
    navigate("/");
  }

  function handleBook() {
    if (typeof onBook === "function") return onBook();
    navigate("/schedule");
  }

  const answeredCount = answers.filter((a) => a !== null).length;
  const progressPct = Math.round((answeredCount / QUESTIONS.length) * 100);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-gray-950 border border-gray-800 p-6 shadow-lg">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Wellness Check-in</h2>
            <div className="text-sm text-gray-400">{answeredCount}/{QUESTIONS.length}</div>
          </div>

          <div className="mt-3 h-2 w-full rounded-full bg-gray-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPct}
              role="progressbar"
            />
          </div>
        </div>

        {state !== "completed" ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="text-sm text-gray-300 mb-3">{current.text}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                {current.options.map((opt) => {
                  const selected = answers[index] === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => choose(opt.value)}
                      className={`text-left rounded-lg px-4 py-3 border transition transform duration-150 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60
                        ${selected ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-sm" : "bg-gray-900 text-gray-200 border-gray-800"}`}
                      aria-pressed={selected}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`inline-block w-8 h-8 rounded-full flex items-center justify-center font-medium ${selected ? "bg-white/10 text-white" : "bg-gray-800 text-gray-200"}`}>
                            {opt.value}
                          </span>
                          <span className="text-sm">{opt.label}</span>
                        </div>
                        {opt.urgent && (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-600 text-white">Urgent</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={prev}
                  disabled={index === 0}
                  className="rounded-md px-3 py-2 text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>

                {index < QUESTIONS.length - 1 ? (
                  <button
                    type="button"
                    onClick={next}
                    className="rounded-md px-3 py-2 text-sm bg-indigo-600 text-white hover:brightness-105"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={state === "submitting"}
                    className="rounded-md inline-flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white hover:brightness-105 disabled:opacity-70"
                  >
                    {state === "submitting" ? (
                      <>
                        <Spinner size={16} className="text-white" />
                        Submitting…
                      </>
                    ) : (
                      "Submit"
                    )}
                  </button>
                )}
              </div>

              <div className="text-sm text-gray-500">Progress: {progressPct}%</div>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-4 py-8">
            <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-cyan-400 text-white text-2xl font-bold shadow-md">
              {result?.riskLevel === "high" ? "!" : result?.riskLevel === "medium" ? "~" : "✓"}
            </div>

            <h3 className="text-xl font-semibold text-white">
              {result?.riskLevel === "high"
                ? "We’re here for you — help is recommended"
                : result?.riskLevel === "medium"
                ? "Thanks for checking in — consider a follow-up"
                : "Thanks — you’re doing okay"}
            </h3>

            <p className="text-sm text-gray-300 max-w-xl mx-auto">
              {result?.riskLevel === "high" && (
                <>
                  Based on your responses, a counselor may reach out. If you feel unsafe or are in immediate danger, please contact local emergency services right away.
                </>
              )}
              {result?.riskLevel === "medium" && (
                <>Your responses suggest there may be some stressors — booking a short check-in could help.</>
              )}
              {result?.riskLevel === "low" && (
                <>Your answers indicate low immediate concern. Keep using healthy routines and reach out if things change.</>
              )}
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleReturn}
                className="rounded-md px-4 py-2 bg-gray-800 text-gray-200 hover:bg-gray-700"
              >
                Return to Dashboard
              </button>

              <button
                onClick={handleBook}
                className="rounded-md px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-400 text-white hover:brightness-105"
              >
                Book Counseling Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
