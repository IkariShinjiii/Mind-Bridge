import { Link } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  FileCheck2,
  CalendarCheck,
  MessageCircle,
  GraduationCap,
  Stethoscope,
  ShieldCheck,
} from "lucide-react";
import PublicShell from "../components/ui/PublicShell";

const STOPS = [
  { n: 1, icon: ClipboardList, title: "Check in", body: "Seven short questions about the last two weeks. About a minute." },
  { n: 2, icon: FileCheck2, title: "See your result", body: "Guidance and next steps based on your answers. It is a screening aid, not a diagnosis." },
  { n: 3, icon: CalendarCheck, title: "Book a counselor", body: "Pick an open time from the campus counselors' calendars." },
  { n: 4, icon: MessageCircle, title: "Talk it through", body: "Meet your counselor and follow up in confidential chat." },
];

const DOORS = [
  { icon: GraduationCap, who: "Students", what: "Check in, book a time, message your counselor.", to: "/signup", cta: "Create student account" },
  { icon: Stethoscope, who: "Counselors", what: "Review flagged check-ins and set your availability.", to: "/login", cta: "Log in" },
  { icon: ShieldCheck, who: "Administrators", what: "Approve counselor accounts and review activity.", to: "/login", cta: "Log in" },
];

export default function HomePage() {
  return (
    <PublicShell>
      {/* THESIS: a first-time visitor sees the route to help as a signposted path, not a pitch.
          OWN-WORLD: hospital-style wayfinding; teal signage plates, amber for urgent exits only, Barlow numerals.
          STORY: you are here, four stops to a counselor, and the crisis line is always one tap away.
          FIRST VIEWPORT: amber crisis strip, headline and two actions left, four-stop route board right.
          FORM: calm wayfinding (assigned roll, seed ea2f1600). */}
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-20">
        <div>
          <h1 className="mb-sign text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl [text-wrap:balance]">
            Ask for help quietly. Reach a counselor sooner.
          </h1>
          <p className="mt-6 max-w-[60ch] text-lg text-[color:var(--mb-muted)]">
            Mind Bridge is the University of San Agustin check-in for student wellbeing. Answer a short private
            screening, see what it suggests, and book a time with a campus counselor.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="mb-btn mb-btn-solid">
              Log in to check in <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link to="/signup" className="mb-btn mb-btn-line">
              Create student account
            </Link>
          </div>
          <p className="mt-4 text-sm text-[color:var(--mb-muted)]">Student accounts need your @usa.edu.ph email.</p>
        </div>

        <ol className="mb-route m-0 list-none space-y-4 p-0" aria-label="How Mind Bridge works, in four steps">
          {STOPS.map(({ n, icon: Icon, title, body }) => (
            <li key={n} className="mb-stop mb-plate relative flex items-start gap-4 p-4">
              <span
                className="mb-sign grid h-12 w-12 shrink-0 place-items-center rounded bg-[color:var(--mb-panel-ink)] text-3xl font-bold text-[color:var(--mb-panel)]"
                aria-hidden="true"
              >
                {n}
              </span>
              <div className="min-w-0">
                <h2 className="mb-sign flex items-center gap-2 text-2xl font-bold">
                  {title} <Icon className="h-5 w-5 opacity-80" aria-hidden="true" />
                </h2>
                <p className="text-[color:var(--mb-panel-soft)]">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-labelledby="doors-h">
        <h2 id="doors-h" className="mb-sign text-3xl font-bold sm:text-4xl">
          Pick your door
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {DOORS.map(({ icon: Icon, who, what, to, cta }) => (
            <Link
              key={who}
              to={to}
              className="group flex flex-col justify-between gap-6 rounded-md border-2 border-[color:var(--mb-ink)] bg-[color:var(--mb-surface)] p-5 text-[color:var(--mb-ink)] no-underline transition-colors hover:bg-[color:var(--mb-panel)] hover:text-[color:var(--mb-panel-ink)]"
            >
              <div>
                <Icon className="h-8 w-8" aria-hidden="true" />
                <h3 className="mb-sign mt-3 text-2xl font-bold">{who}</h3>
                <p className="mt-1 opacity-80">{what}</p>
              </div>
              <span className="mb-sign inline-flex items-center gap-2 text-lg font-bold">
                {cta}{" "}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6" aria-labelledby="private-h">
        <div className="grid gap-6 rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-6 md:grid-cols-[auto_1fr] md:gap-10 md:p-8">
          <h2 id="private-h" className="mb-sign text-3xl font-bold">
            Who can see your answers
          </h2>
          <p className="max-w-[65ch] text-[color:var(--mb-muted)]">
            Your check-in answers are visible to you and to approved guidance staff. Other students never see them. Read
            the{" "}
            <Link to="/privacy-policy" className="text-[color:var(--mb-ink)]">
              Privacy Policy
            </Link>{" "}
            for how your data is handled.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
