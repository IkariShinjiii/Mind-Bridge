import { describe, it, expect } from "vitest";
import { pageTitle } from "./pageTitle";

describe("pageTitle", () => {
  it("names the home page after the service", () => {
    expect(pageTitle("/")).toBe("Mind Bridge | University of San Agustin Guidance Services");
  });

  it.each([
    ["/login", "Log in | Mind Bridge"],
    ["/signup", "Create account | Mind Bridge"],
    ["/student/dashboard", "Dashboard | Mind Bridge"],
    ["/admin/dashboard", "Staff dashboard | Mind Bridge"],
    ["/appointments", "Appointments | Mind Bridge"],
    ["/resources", "Crisis resources | Mind Bridge"],
    ["/settings", "Settings | Mind Bridge"],
    ["/privacy-policy", "Privacy Policy | Mind Bridge"],
    ["/terms", "Terms and Conditions | Mind Bridge"],
    ["/cookie-policy", "Cookie Policy | Mind Bridge"],
  ])("titles %s", (path, expected) => {
    expect(pageTitle(path)).toBe(expected);
  });

  it("ignores a trailing slash", () => {
    expect(pageTitle("/settings/")).toBe("Settings | Mind Bridge");
  });

  it("says not found for unknown paths, including inherited object keys", () => {
    expect(pageTitle("/nope")).toBe("Page not found | Mind Bridge");
    expect(pageTitle("/constructor")).toBe("Page not found | Mind Bridge");
    expect(pageTitle("/__proto__")).toBe("Page not found | Mind Bridge");
  });
});
