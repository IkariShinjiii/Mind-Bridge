import React from "react";

// MeshBackground: full-bleed, glowing mesh gradient background
// - Use as a top-level background (placed inside App or page wrappers)
// - pointer-events-none and aria-hidden to avoid interfering with UI
// - Uses layered radial gradients, mix-blend modes, heavy blur, and a subtle SVG noise

export default function MeshBackground({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none ${className}`}
    >
      {/* Deep Prussian / Navy base glow (top-left) */}
      <div
        className="absolute -top-44 -left-56 w-[720px] h-[720px] rounded-full blur-3xl transform-gpu opacity-85"
        style={{
          background:
            "radial-gradient(closest-corner at 20% 20%, rgba(3,18,36,0.96), rgba(6,28,54,0.9) 30%, rgba(8,40,78,0.75) 60%, transparent 72%)",
          mixBlendMode: "normal",
        }}
      />

      {/* Electric cyan / blue accent (top-right) */}
      <div
        className="absolute -top-10 right-[-140px] w-[640px] h-[640px] rounded-full blur-3xl transform-gpu opacity-60"
        style={{
          background:
            "radial-gradient(closest-corner at 70% 25%, rgba(0,216,255,0.22), rgba(0,142,255,0.14) 36%, rgba(2,100,255,0.06) 58%, transparent 72%)",
          mixBlendMode: "screen",
        }}
      />

      {/* Central navy -> cyan overlay to create mesh depth */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[980px] h-[980px] rounded-full blur-3xl transform-gpu opacity-60"
        style={{
          background:
            "radial-gradient(closest-corner at 50% 40%, rgba(6,24,48,0.92), rgba(4,80,155,0.16) 28%, rgba(0,200,255,0.12) 52%, transparent 78%)",
          mixBlendMode: "overlay",
        }}
      />

      {/* Lower-left soft cyan glow */}
      <div
        className="absolute bottom-[-120px] left-[-120px] w-[420px] h-[420px] rounded-full blur-3xl transform-gpu opacity-50 animate-[float_8s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(0,210,255,0.14), rgba(3,102,255,0.08) 36%, transparent 64%)",
          mixBlendMode: "screen",
        }}
      />

      {/* Vertical subtle gradient to pull colors together */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-[#001a3a]/20 to-transparent pointer-events-none" />

      {/* SVG noise / mesh texture overlay for subtle organic feel */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 blur-xl"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mb-g" x1="0" x2="1">
            <stop offset="0" stopColor="#001b3a" stopOpacity="0.65" />
            <stop offset="1" stopColor="#00d8ff" stopOpacity="0.12" />
          </linearGradient>
          <filter id="mb-f" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="1.2" />
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#mb-g)" filter="url(#mb-f)" />
      </svg>

      {/* Soft vignette to anchor content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.00) 30%, rgba(2,6,23,0.06) 70%, rgba(2,6,23,0.12) 100%)",
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
}
