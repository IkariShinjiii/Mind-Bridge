/**
 * Vercel serverless route: POST /api/alert-sweep with `Authorization: Bearer <CRON_SECRET>`.
 * Called every few minutes by .github/workflows/alert-sweep.yml (free). Emails staff about any recent high-risk
 * check-in that was never alerted, so a closed tab can't lose an alert. Inert (503) until configured.
 */
import { timingSafeEqual } from "node:crypto";
import { sweepAlerts } from "./_alertCore.js";
import { buildDeps, configured } from "./alert-high-risk.js";

interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

function secretMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  const config = configured();
  const cronSecret = process.env.CRON_SECRET;
  if (!config || !cronSecret) {
    res.status(503).json({ error: "Alerts are not configured" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const header = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  const given = /^Bearer (.+)$/.exec(header ?? "")?.[1];
  if (!given || !secretMatches(given, cronSecret)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const summary = await sweepAlerts(buildDeps(config));
    res.status(summary.failed ? 502 : 200).json(summary);
  } catch {
    res.status(502).json({ error: "Sweep failed" });
  }
}
