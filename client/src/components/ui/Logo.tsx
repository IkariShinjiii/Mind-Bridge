import logo from "../../assets/usa-logo.webp";

/** The University of San Agustin crest. Its background is transparent, so it sits directly on either theme. */
export default function Logo({ className = "" }: { className?: string }) {
  return <img src={logo} alt="" className={`mb-logo object-contain ${className}`} />;
}
