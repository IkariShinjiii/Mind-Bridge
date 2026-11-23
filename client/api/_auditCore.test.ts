import { describe, it, expect, vi } from "vitest";
import { handleAudit, type AuditDeps, type AuditUser } from "./_auditCore";

const deps = (user: AuditUser | null, verified = true) => {
  const added: Array<Record<string, string>> = [];
  const d: AuditDeps = {
    verifyIdToken: vi.fn(async () => {
      if (!verified) throw new Error("bad token");
      return { uid: "u1" };
    }),
    getUser: vi.fn(async () => user),
    addEntry: vi.fn(async (e) => void added.push(e)),
  };
  return { d, added };
};
const req = (over = {}) => ({
  method: "POST",
  authorization: "Bearer tok",
  body: { action: "case_viewed", targetId: "a1", detail: "Ana" },
  ...over,
});
const peer = { role: "counselor", approved: true, active: true, name: "Dr. Cruz" };

describe("handleAudit", () => {
  it("records the entry with the actor and time taken from the server", async () => {
    const { d, added } = deps(peer);
    const r = await handleAudit(
      req({ body: { action: "case_viewed", targetId: "a1", detail: "Ana", actorId: "evil", at: "x" } }),
      d,
    );
    expect(r).toEqual({ status: 200, body: { logged: true } });
    expect(added[0]).toMatchObject({ actorId: "u1", actorName: "Dr. Cruz", action: "case_viewed", targetId: "a1" });
    expect(added[0]?.["at"]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it("accepts an admin", async () => {
    expect((await handleAudit(req(), deps({ role: "admin" }).d)).status).toBe(200);
  });
  it("lets a student record their own activity, but not a staff action", async () => {
    const { d, added } = deps({ role: "student", name: "Ana" });
    const ok = await handleAudit(
      req({
        body: { action: "checkin_abandoned", targetId: "u1", detail: "answered 3 of 7 (quick check-in), not finished" },
      }),
      d,
    );
    expect(ok.status).toBe(200);
    expect(added[0]).toMatchObject({ actorId: "u1", actorName: "Ana", action: "checkin_abandoned" });
    const staffAction = { action: "case_viewed", targetId: "a1", detail: "x" };
    expect((await handleAudit(req({ body: staffAction }), deps({ role: "student" }).d)).status).toBe(400);
  });
  it("stops staff from writing student entries", async () => {
    const body = { action: "checkin_submitted", targetId: "a", detail: "d" };
    expect((await handleAudit(req({ body }), deps(peer).d)).status).toBe(400);
  });
  it.each([
    ["a deactivated student", { role: "student", active: false }],
    ["an unapproved peer facilitator", { role: "counselor", approved: false }],
    ["a deactivated admin", { role: "admin", active: false }],
    ["no profile", null],
  ])("refuses %s", async (_n, user) => {
    const { d, added } = deps(user);
    expect((await handleAudit(req(), d)).status).toBe(403);
    expect(added).toEqual([]);
  });
  it("refuses a missing or bad token and a non-POST", async () => {
    expect((await handleAudit(req({ authorization: undefined }), deps(peer).d)).status).toBe(401);
    expect((await handleAudit(req(), deps(peer, false).d)).status).toBe(401);
    expect((await handleAudit(req({ method: "GET" }), deps(peer).d)).status).toBe(405);
  });
  it("rejects an unknown action, a missing field and over-long text", async () => {
    for (const body of [
      { action: "nope", targetId: "a", detail: "d" },
      { action: "case_viewed", detail: "d" },
      { action: "case_viewed", targetId: "a", detail: "x".repeat(301) },
      null,
    ]) {
      const { d, added } = deps(peer);
      expect((await handleAudit(req({ body }), d)).status).toBe(400);
      expect(added).toEqual([]);
    }
  });
});
