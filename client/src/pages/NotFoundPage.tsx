import { Link } from "react-router-dom";
import PublicShell from "../components/ui/PublicShell";

export default function NotFoundPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="mb-plate p-8">
          <p className="mb-sign text-7xl font-bold leading-none">404</p>
          <h1 className="mb-sign mt-4 text-4xl font-bold">This page is not on the map</h1>
          <p className="mt-2 max-w-[45ch] text-[color:var(--mb-panel-soft)]">
            The page you are looking for does not exist or may have moved.
          </p>
          <Link
            to="/"
            className="mb-btn mt-6 border-[color:var(--mb-panel-ink)] bg-[color:var(--mb-panel-ink)] text-[color:var(--mb-panel)]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
