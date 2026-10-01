import { useEffect } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps keyboard focus inside a dialog while it is open and returns focus to the
 * element that opened it when it closes. Also closes the dialog on Escape.
 * @param {React.RefObject<HTMLElement>} ref - the dialog container
 * @param {boolean} active - true while the dialog is open
 * @param {() => void} onClose - called when Escape is pressed
 */
export default function useFocusTrap(ref, active, onClose) {
  useEffect(() => {
    if (!active) return undefined;
    const opener = document.activeElement;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!ref.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [ref, active, onClose]);
}
