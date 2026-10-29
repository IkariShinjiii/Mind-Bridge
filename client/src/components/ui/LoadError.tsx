import { Alert } from "./Alert";

interface LoadErrorProps {
  message: string;
  onRetry: () => void;
  className?: string;
}

/** A failed load, with a way to try again. Shown where the data would have been. */
export function LoadError({ message, onRetry, className = "" }: LoadErrorProps) {
  return (
    <Alert
      role="alert"
      className={`flex flex-wrap items-center justify-between gap-3 font-medium${className ? ` ${className}` : ""}`}
    >
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="mb-btn mb-btn-line !min-h-[44px] !px-4">
        Try again
      </button>
    </Alert>
  );
}
