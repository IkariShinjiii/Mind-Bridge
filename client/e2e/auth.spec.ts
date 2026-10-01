import { test, expect, type Page } from "@playwright/test";
import { seed, readCollection, logIn, signOut, STUDENT, COUNSELOR } from "./helpers";

async function fillSignup(
  page: Page,
  { name = "Ben New", email = "ben@usa.edu.ph", password = "secret123", consent = true }: { name?: string; email?: string; password?: string; consent?: boolean } = {}
) {
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("School email").fill(email);
  await page.getByLabel("Password").fill(password);
  if (consent) await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
}

test.describe("Student signup", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page);
    await page.goto("/signup");
  });

  test("a new student with a school email can create an account and lands on their dashboard", async ({ page }) => {
    await fillSignup(page);

    await expect(page).toHaveURL(/\/student\/dashboard$/);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();

    // The profile is created as a plain student with no elevated access.
    const users = await readCollection(page, "users");
    const created = users.find((u) => u.email === "ben@usa.edu.ph");
    expect(created).toMatchObject({ name: "Ben New", role: "student", active: true });
  });

  test("signup is refused for an email outside @usa.edu.ph", async ({ page }) => {
    await fillSignup(page, { email: "ben@gmail.com" });

    await expect(page.getByRole("alert")).toHaveText("Student registrations must use an @usa.edu.ph email address.");
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("signup is refused when the password is shorter than 6 characters", async ({ page }) => {
    await fillSignup(page, { password: "abc12" });

    await expect(page.getByRole("alert")).toHaveText("Password must be at least 6 characters.");
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("signup is refused when an account already exists for the email", async ({ page }) => {
    await fillSignup(page, { name: "Someone Else", email: STUDENT.email });

    await expect(page.getByRole("alert")).toHaveText(/account with that email already exists/i);
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("the terms and privacy consent checkbox is required before an account is created", async ({ page }) => {
    await fillSignup(page, { consent: false });

    await expect(page).toHaveURL(/\/signup$/);
    const users = await readCollection(page, "users");
    expect(users.find((u) => u.email === "ben@usa.edu.ph")).toBeUndefined();
  });

  test("a student can switch from the signup page to the login page", async ({ page }) => {
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("Login and logout", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page);
  });

  test("a student logs in with valid credentials and reaches the student dashboard", async ({ page }) => {
    await logIn(page, STUDENT);

    await expect(page).toHaveURL(/\/student\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Welcome back, Ana" })).toBeVisible();
  });

  test("a wrong password shows an error and keeps the user on the login page", async ({ page }) => {
    await logIn(page, { email: STUDENT.email, password: "not-the-password" });

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("an unknown account cannot log in", async ({ page }) => {
    await logIn(page, { email: "ghost@usa.edu.ph", password: "whatever1" });

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a counselor logs in and is sent to the staff dashboard", async ({ page }) => {
    await logIn(page, COUNSELOR);

    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Staff dashboard" })).toBeVisible();
  });

  test("signing out ends the session and protects the dashboard again", async ({ page }) => {
    await logIn(page, STUDENT);
    await expect(page).toHaveURL(/\/student\/dashboard$/);

    await signOut(page);
    await page.goto("/student/dashboard");

    await expect(page).toHaveURL(/\/login$/);
  });

  test("a logged-in student who opens the login page is sent straight to their dashboard", async ({ page }) => {
    await logIn(page, STUDENT);
    await expect(page).toHaveURL(/\/student\/dashboard$/);

    await page.goto("/login");

    await expect(page).toHaveURL(/\/student\/dashboard$/);
  });

  test("protected pages redirect visitors who are not logged in to the login page", async ({ page }) => {
    for (const path of ["/student/dashboard", "/admin/dashboard", "/resources", "/appointments", "/settings"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/login$/);
    }
  });
});

test.describe("Deactivated accounts", () => {
  test("a deactivated account is blocked with a clear message", async ({ page }) => {
    const deactivated = { uid: "uid-gone", name: "Old Student", email: "old@usa.edu.ph", password: "Student#123" };
    await seed(page, {
      accounts: [deactivated],
      docs: {
        users: {
          [deactivated.uid]: {
            name: deactivated.name, email: deactivated.email, role: "student", active: false, approved: true,
          },
        },
      },
    });

    await logIn(page, deactivated);

    await expect(page.getByRole("alert")).toHaveText(/account has been deactivated/i);
  });
});
