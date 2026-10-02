import { describe, it, expect, afterEach, vi } from "vitest";
import handler from "./alert-high-risk";

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
