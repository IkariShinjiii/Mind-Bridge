import { expect, type Page } from "@playwright/test";

export const STUDENT: TestPerson = {
  uid: "uid-student",
  name: "Ana Student",
  email: "ana@usa.edu.ph",
  password: "Student#123",
};
export const PEER_FACILITATOR: TestPerson = {
  uid: "uid-peer-facilitator",
  name: "Dr. Reyes",
  email: "reyes@usa.edu.ph",
  password: "Peer Facilitator#123",
};

const STORAGE_KEY = "mb_e2e_state";

/** A person in the fake backend: an auth account plus (by default) a matching users/{uid} profile. */
export interface TestPerson {
  uid: string;
  name: string;
  email: string;
  password: string;
}

type Docs = Record<string, Record<string, Record<string, unknown>>>;

/** Shape of a document read back from the fake backend. */
export type StoredDoc = { id: string } & Record<string, unknown>;

/**
 * Pre-loads the fake Firebase backend with a student and an approved peer facilitator, plus any extra
 * Firestore documents. Runs before the app boots; it only seeds an empty browser context, so
 * data written during the test survives reloads and navigations.
 */
export async function seed(
  page: Page,
  { docs = {}, accounts = [], tour = false }: { docs?: Docs; accounts?: TestPerson[]; tour?: boolean } = {},
): Promise<void> {
  const { users: extraUsers = {}, ...otherCollections } = docs;
  const state = {
    seq: 100,
    session: null,
    accounts: Object.fromEntries(
      [STUDENT, PEER_FACILITATOR, ...accounts].map((u) => [
        u.email,
        { uid: u.uid, email: u.email, password: u.password, displayName: u.name },
      ]),
    ),
    docs: {
      users: {
        [STUDENT.uid]: {
          name: STUDENT.name,
          email: STUDENT.email,
          role: "student",
          approved: true,
          active: true,
          emailVerified: true,
        },
        [PEER_FACILITATOR.uid]: {
          name: PEER_FACILITATOR.name,
          email: PEER_FACILITATOR.email,
          role: "counselor",
          approved: true,
          active: true,
          emailVerified: true,
        },
        ...extraUsers,
      },
      ...otherCollections,
    },
  };
  await page.addInitScript(
    ([key, value, skipTourFor]: [string, string, string[]]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
      localStorage.setItem("mindbridge_cookie_consent", "accepted");
      // The first-visit student tour would cover the page under test; `tour: true` leaves it on.
      for (const uid of skipTourFor) localStorage.setItem(`mindbridge_onboarded_${uid}`, "1");
    },
    [
      STORAGE_KEY,
      JSON.stringify(state),
      tour ? [] : [STUDENT, PEER_FACILITATOR, ...accounts].map((u) => u.uid),
    ] as [string, string, string[]],
  );
}

/** Reads a Firestore collection straight out of the fake backend. */
export function readCollection(page: Page, name: string): Promise<StoredDoc[]> {
  return page.evaluate(
    ([key, col]: [string, string]) => {
      const state = JSON.parse(localStorage.getItem(key) ?? "{}") as {
        docs?: Record<string, Record<string, Record<string, unknown>>>;
      };
      return Object.entries(state.docs?.[col] ?? {}).map(([id, d]) => ({ ...d, id }));
    },
    [STORAGE_KEY, name] as [string, string],
  );
}

export async function logIn(page: Page, { email, password }: Pick<TestPerson, "email" | "password">): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

/** Answers every check-in question with the given scores (one per question) and submits. */
export async function completeCheckIn(page: Page, scores: number[]): Promise<void> {
  const checkIn = page.getByRole("region", { name: "Check-in" });
  for (let i = 0; i < scores.length; i++) {
    await expect(checkIn.getByText(`You are on question ${i + 1} of ${scores.length}`)).toBeVisible();
    await checkIn.locator(`input[type=radio][value="${scores[i]}"]`).check({ force: true });
    const last = i === scores.length - 1;
    await checkIn.getByRole("button", { name: last ? "Submit check-in" : /^Next/ }).click();
  }
}

/** Opens every collapsed "More for you" section on the student dashboard, so tests can reach what is inside. */
export async function expandAll(page: Page): Promise<void> {
  await page.locator("details").first().waitFor({ state: "attached" });
  await page.locator("details").evaluateAll((els) => els.forEach((el) => ((el as HTMLDetailsElement).open = true)));
}
