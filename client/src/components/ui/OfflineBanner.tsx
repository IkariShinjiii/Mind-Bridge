import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useTheme } from "../../hooks/useTheme";

/**
 * A calm notice while the device is offline. It floats clear of the phone top bar (which holds the crisis button) and of
 * the bottom navigation, and leaves on its own when the connection returns. Status role: read out politely, never steals focus.
 */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  const [theme] = useTheme();
  if (online) return null;
  return (
    <div
      className="mb pointer-events-none fixed left-1/2 top-16 z-[55] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 lg:top-4"
      data-theme={theme}
      style={{ background: "transparent" }}
    >
      <p
        role="status"
        className="flex items-center gap-2 rounded-md border border-current bg-[color:var(--mb-warn-bg)] px-4 py-2 text-sm font-bold text-[color:var(--mb-warn)] shadow-mb-lg"
      >
        <WifiOff size={16} aria-hidden="true" className="shrink-0" />
        You are offline. Check-ins and bookings can't be saved until you reconnect.
      </p>
    </div>
  );
}
