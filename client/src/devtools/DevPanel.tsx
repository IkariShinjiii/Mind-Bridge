import { useState } from "react";
import { STORAGE_KEY } from "../../e2e/fakes/store";

// Dev-tools build only (`vite --mode devtools`): Firebase is the in-memory fake, so these accounts exist only in this
// browser and nothing here can reach the real project. Passwords are listed so the login form can be tested too.
const PEOPLE = {
  student: {
    uid: "uid-student",
    name: "Ana Student",
    email: "ana@usa.edu.ph",
    password: "Student#123",
    role: "student",
  },
  peer: {
    uid: "uid-peer-facilitator",
    name: "Dr. Reyes",
    email: "reyes@usa.edu.ph",
    password: "Peer Facilitator#123",
    role: "counselor",
  },
} as const;
type Who = keyof typeof PEOPLE;

function seedState(session: Who | null) {
  const accounts = Object.fromEntries(
    Object.values(PEOPLE).map((p) => [
      p.email,
      { uid: p.uid, email: p.email, password: p.password, displayName: p.name },
    ]),
  );
  const users = Object.fromEntries(
    Object.values(PEOPLE).map((p) => [
      p.uid,
      { name: p.name, email: p.email, role: p.role, approved: true, active: true, emailVerified: true },
    ]),
  );
  return { seq: 100, session: session ? PEOPLE[session].uid : null, accounts, docs: { users } };
}

function apply(session: Who | null, { freshTour = false, keepData = false } = {}) {
  try {
    localStorage.setItem("mindbridge_cookie_consent", "accepted");
    for (const p of Object.values(PEOPLE)) {
      if (freshTour) localStorage.removeItem(`mindbridge_onboarded_${p.uid}`);
      else localStorage.setItem(`mindbridge_onboarded_${p.uid}`, "1");
    }
    const fresh = seedState(session);
    const old = keepData ? JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") : null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(old ? { ...old, session: fresh.session } : fresh));
  } catch {
    /* storage blocked: the panel cannot work, the page still loads */
  }
  window.location.assign(session === "student" ? "/student/dashboard" : session === "peer" ? "/admin/dashboard" : "/");
}

export default function DevPanel() {
  const [open, setOpen] = useState(false);
  const btn = "block w-full rounded border border-neutral-500 px-2 py-1 text-left text-xs hover:bg-neutral-200";
  return (
    <div
      style={{ position: "fixed", left: 8, bottom: 88, zIndex: 99999, font: "12px system-ui" }}
      data-testid="dev-panel"
    >
      <button onClick={() => setOpen(!open)} className="rounded bg-black px-2 py-1 text-white" aria-expanded={open}>
        Dev tools
      </button>
      {open && (
        <div className="mt-1 w-56 space-y-1 rounded border border-neutral-600 bg-white p-2 text-black shadow-lg">
          <p className="text-xs">Test build: fake backend, no real accounts.</p>
          <button className={btn} onClick={() => apply("student", { keepData: true })}>
            Sign in as student
          </button>
          <button className={btn} onClick={() => apply("student", { freshTour: true })}>
            Student, first visit (tour)
          </button>
          <button className={btn} onClick={() => apply("peer", { keepData: true })}>
            Sign in as peer facilitator
          </button>
          <button className={btn} onClick={() => apply(null, { keepData: true })}>
            Sign out
          </button>
          <button className={btn} onClick={() => apply(null)}>
            Reset all data
          </button>
          <p className="text-xs">
            Login form: {PEOPLE.student.email} / {PEOPLE.student.password}
          </p>
        </div>
      )}
    </div>
  );
}
