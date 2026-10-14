import { describe, it, expect, afterEach, vi } from "vitest";
import handler from "./alert-high-risk";
import sweep from "./alert-sweep";

function fakeRes() {
  const res = {
    code: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(c: number) {
      res.code = c;
      return res;
    },
    json(b: unknown) {
      res.body = b;
    },
    setHeader(k: string, v: string) {
      res.headers[k] = v;
    },
  };
  return res;
}

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/alert-high-risk when not configured", () => {
  it("answers 503, sends nothing and is never cached", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "");
    vi.stubEnv("SMTP_URL", "");
    const res = fakeRes();
    await handler({ method: "POST", headers: { authorization: "Bearer x" }, body: { assessmentId: "a1" } }, res);
    expect(res.code).toBe(503);
    expect(res.body).toEqual({ sent: false, error: "Alerts are not configured" });
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });

  it("stays inert when only one of the two settings is present", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "{}");
    vi.stubEnv("SMTP_URL", "");
    const res = fakeRes();
    await handler({ method: "POST", headers: {}, body: {} }, res);
    expect(res.code).toBe(503);
  });
});

describe("POST /api/alert-sweep", () => {
  it("answers 503 until the alert settings and CRON_SECRET are all present", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "{}");
    vi.stubEnv("SMTP_URL", "smtp://x");
    vi.stubEnv("CRON_SECRET", "");
    const res = fakeRes();
    await sweep({ method: "POST", headers: { authorization: "Bearer x" } }, res);
    expect(res.code).toBe(503);
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });

  it("rejects a wrong or missing secret before touching Firebase", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "{}");
    vi.stubEnv("SMTP_URL", "smtp://x");
    vi.stubEnv("CRON_SECRET", "right-secret");
    for (const authorization of [undefined, "Bearer wrong", "Bearer right-secre", "right-secret"]) {
      const res = fakeRes();
      await sweep({ method: "POST", headers: { authorization } }, res);
      expect(res.code).toBe(401);
    }
  });

  it("only accepts POST", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "{}");
    vi.stubEnv("SMTP_URL", "smtp://x");
    vi.stubEnv("CRON_SECRET", "s");
    const res = fakeRes();
    await sweep({ method: "GET", headers: { authorization: "Bearer s" } }, res);
    expect(res.code).toBe(405);
  });
});
