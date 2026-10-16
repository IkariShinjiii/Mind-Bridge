import { useState, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, m } from "framer-motion";
import { Settings, LogOut, ChevronsUpDown } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { transition, useMotionPreset, type MotionPreset } from "../../lib/motion";
import Spinner from "../ui/Spinner";
import { avatarColor } from "../../utils/avatar";

/** Account dropdown: slides 4px and fades in (150ms), fades out in 120ms. */
const menuPreset: MotionPreset = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0, transition: transition.fast },
  exit: { opacity: 0, transition: transition.exit },
};

export interface AccountMenuProps {
  /** Which way the menu opens: below the avatar in the phone top bar, above the row at the foot of the sidebar. */
  placement: "below" | "above";
  /** Sidebar style: avatar plus name and role in a full-width button. Otherwise just the round avatar. */
  showName?: boolean;
}

/** The signed-in person's avatar button and its menu (account settings, sign out). */
export default function AccountMenu({ placement, showName = false }: AccountMenuProps) {
  const { currentUser, userRole, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menu = useMotionPreset(menuPreset);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const safeName = userData?.name || currentUser?.displayName || "Student";
  const roleLabel = userRole === "admin" ? "Staff" : "Student";
  const initials = (safeName || "U").slice(0, 2).toUpperCase();
  const showGoogleAvatar = userData?.useGoogleAvatar !== false && currentUser?.photoURL;
  const avatarBg = avatarColor(userData?.avatarGradient);

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen((open) => {
          if (open) menuButtonRef.current?.focus();
          return false;
        });
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Open menu: focus the first item; arrow keys move between items
  useEffect(() => {
    if (menuOpen) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [menuOpen]);

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (!items.length) return;
    event.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(i + step + items.length) % items.length]?.focus();
  }

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
      setLoggingOut(false);
    }
  };

  const avatar = (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[color:var(--mb-brand)]">
      {showGoogleAvatar ? (
        <img src={currentUser.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span
          aria-hidden="true"
          style={{ backgroundColor: avatarBg }}
          className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
        >
          {initials}
        </span>
      )}
    </span>
  );

  return (
    <div className={`relative ${showName ? "w-full" : "shrink-0"}`} ref={menuRef}>
      <button
        type="button"
        ref={menuButtonRef}
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        // WCAG 2.5.3: the avatar-only button names itself with its initials as a word. The sidebar row has no aria-label:
        // its name is built from the visible text, with a screen-reader-only prefix, so it can never disagree with it.
        aria-label={showName ? undefined : `Account menu for ${initials}`}
        className={
          showName
            ? "flex min-h-[56px] w-full items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-[color:var(--mb-brand-bg)]"
            : "rounded-full transition-shadow hover:shadow-mb-md"
        }
      >
        {avatar}
        {showName && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="sr-only">Account menu for </span>
              <span className="block truncate font-bold text-[color:var(--mb-ink)]">{safeName}</span>{" "}
              <span className="block text-sm text-[color:var(--mb-muted)]">{roleLabel}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-[color:var(--mb-muted)]" aria-hidden="true" />
          </>
        )}
      </button>

      <AnimatePresence>
        {menuOpen && (
          <m.div
            role="menu"
            aria-label="Account"
            onKeyDown={onMenuKeyDown}
            {...menu}
            className={`absolute z-50 w-64 rounded-lg border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-2 shadow-mb-lg ${
              placement === "above" ? "bottom-full left-0 mb-2" : "right-0 top-14"
            }`}
          >
            <div className="border-b border-[color:var(--mb-line)] px-3 py-2">
              <p className="truncate font-bold">{safeName}</p>
              <p className="truncate text-sm text-[color:var(--mb-muted)]">{currentUser?.email}</p>
              <p className="text-sm font-bold text-[color:var(--mb-muted)]">{roleLabel}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                navigate("/settings");
              }}
              className="mt-1 flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 font-bold transition-colors hover:bg-[color:var(--mb-brand-bg)]"
            >
              <Settings className="h-5 w-5" aria-hidden="true" /> Account settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 font-bold text-[color:var(--mb-error-ink)] transition-colors hover:bg-[color:var(--mb-error-bg)]"
            >
              {loggingOut ? <Spinner size={18} /> : <LogOut className="h-5 w-5" aria-hidden="true" />}
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
