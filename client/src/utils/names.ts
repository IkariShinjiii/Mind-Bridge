const HONORIFICS = new Set(["dr", "mr", "mrs", "ms", "mx", "prof", "engr", "atty", "sir", "ma'am", "maam", "fr", "rev"]);

/**
 * The name to greet someone by: the first word, skipping a leading title ("Dr. Reyes" gives "Reyes", not "Dr.").
 * @param name - a full display name
 * @param fallback - returned for an empty name
 */
export function firstName(name: string | null | undefined, fallback = "there"): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const first = words.find((w, i) => i === words.length - 1 || !HONORIFICS.has(w.toLowerCase().replace(/\.$/, "")));
  return first ?? fallback;
}
