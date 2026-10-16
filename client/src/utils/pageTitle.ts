const SITE = "Mind Bridge";

const TITLES: Readonly<Record<string, string>> = {
  "/login": "Log in",
  "/signup": "Create account",
  "/student/dashboard": "Dashboard",
  "/admin/dashboard": "Staff dashboard",
  "/appointments": "Appointments",
  "/resources": "Crisis resources",
  "/settings": "Settings",
  "/privacy-policy": "Privacy Policy",
  "/terms": "Terms and Conditions",
  "/cookie-policy": "Cookie Policy",
};

/** Browser tab and screen-reader title for a route, e.g. "Settings | Mind Bridge". Unknown paths read as not found. */
export function pageTitle(pathname: string): string {
  if (pathname === "/") return `${SITE} | University of San Agustin Guidance Services`;
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const title = Object.hasOwn(TITLES, trimmed) ? TITLES[trimmed] : "Page not found";
  return `${title} | ${SITE}`;
}

const DEFAULT_DESCRIPTION =
  "A private wellness check-in for University of San Agustin students: see what your answers suggest, find crisis support, and book a time with a campus guidance counselor.";

const DESCRIPTIONS: Readonly<Record<string, string>> = {
  "/login": "Log in to Mind Bridge with your University of San Agustin account.",
  "/signup": "Create a Mind Bridge account with your University of San Agustin email to start a private check-in.",
  "/resources": "Free crisis hotlines and support services in the Philippines, open 24/7.",
  "/privacy-policy": "How Mind Bridge collects, uses and protects your information.",
  "/terms": "The terms for using Mind Bridge, the University of San Agustin guidance check-in app.",
  "/cookie-policy": "How Mind Bridge uses cookies and local storage.",
};

/** Meta description for a route. Signed-in pages are private, so they share the generic site description. */
export function pageDescription(pathname: string): string {
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return Object.hasOwn(DESCRIPTIONS, trimmed) ? DESCRIPTIONS[trimmed] : DEFAULT_DESCRIPTION;
}
