import { expect } from "@playwright/test";

export const STUDENT = { uid: "uid-student", name: "Ana Student", email: "ana@usa.edu.ph", password: "Student#123" };
export const COUNSELOR = { uid: "uid-counselor", name: "Dr. Reyes", email: "reyes@usa.edu.ph", password: "Counselor#123" };

const STORAGE_KEY = "mb_e2e_state";

/**
 * Pre-loads the fake Firebase backend with a student and an approved counselor, plus any extra
 * Firestore documents. Runs before the app boots; it only seeds an empty browser context, so
 * data written during the test survives reloads and navigations.
 */
export async function seed(page, { docs = {}, accounts = [] } = {}) {
  const { users: extraUsers = {}, ...otherCollections } = docs;
  const state = {
    seq: 100,
    session: null,
    accounts: Object.fromEntries(
      [STUDENT, COUNSELOR, ...accounts].map((u) => [
        u.email,
        { uid: u.uid, email: u.email, password: u.password, displayName: u.name },
      ])
    ),
    docs: {
      users: {
        [STUDENT.uid]: {
          name: STUDENT.name, email: STUDENT.email, role: "student", approved: true, active: true,
          emailVerified: true,
        },
        [COUNSELOR.uid]: {
          name: COUNSELOR.name, email: COUNSELOR.email, role: "counselor", approved: true, active: true,
          emailVerified: true,
        },
        ...extraUsers,
      },
      ...otherCollections,
    },
  };
  await page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
      localStorage.setItem("mindbridge_cookie_consent", "accepted");
    },
    [STORAGE_KEY, JSON.stringify(state)]
  );
}

/** Reads a Firestore collection straight out of the fake backend. */
export function readCollection(page, name) {
  return page.evaluate(
    ([key, col]) =>
      Object.entries(JSON.parse(localStorage.getItem(key)).docs[col] || {}).map(([id, d]) => ({ id, ...d })),
    [STORAGE_KEY, name]
  );
}

export async function logIn(page, { email, password }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
}

export async function signOut(page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

/** Answers every check-in question with the given scores (one per question) and submits. */
export async function completeCheckIn(page, scores) {
  const checkIn = page.getByRole("region", { name: "Check-in" });
  for (let i = 0; i < scores.length; i++) {
    await expect(checkIn.getByText(`You are on question ${i + 1} of ${scores.length}`)).toBeVisible();
    await checkIn.locator(`input[type=radio][value="${scores[i]}"]`).check({ force: true });
    const last = i === scores.length - 1;
    await checkIn.getByRole("button", { name: last ? "Submit check-in" : /^Next/ }).click();
  }
}
