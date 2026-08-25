export default function Spinner({ size = 16, color = "currentColor", className = "" }) {
  return (
    <span
      className={`inline-block animate-[spin_0.9s_linear_infinite] rounded-full border-2 border-transparent border-t-current ${className}`}
      style={{
        width: size,
        height: size,
        color,
        borderTopColor: color,
      }}
      aria-label="Loading"
    />
  );
}
