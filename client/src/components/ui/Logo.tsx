import lightIcon from "../../assets/mindbridge-icon.png";
import darkIcon from "../../assets/mindbridge-icon-dark.png";

/** The Mind Bridge mark in the button teal; dark theme swaps to the lighter brand teal so it stays visible. */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <>
      <img src={lightIcon} alt="" className={`mb-logo-light ${className}`} />
      <img src={darkIcon} alt="" className={`mb-logo-dark ${className}`} />
    </>
  );
}
