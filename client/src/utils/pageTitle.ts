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
