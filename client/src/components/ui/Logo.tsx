import logo from "../../assets/usa-logo.png";

/** The University of San Agustin crest. Dark theme seats it on a white tile so its black outlines stay readable. */
export default function Logo({ className = "" }: { className?: string }) {
  return <img src={logo} alt="" className={`mb-logo object-contain ${className}`} />;
}
