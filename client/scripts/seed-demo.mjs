// Fills a Firebase project with fake demo data for presentations. See docs/DEMO.md.
//
//   node scripts/seed-demo.mjs            dry run: prints what would be written, touches nothing
//   node scripts/seed-demo.mjs --apply    writes the demo accounts and data (replaces earlier demo data)
//   node scripts/seed-demo.mjs --remove   deletes every demo account and document again
//
// Needs the Firebase service account (the same JSON as the FIREBASE_SERVICE_ACCOUNT Vercel variable), either as
// GOOGLE_APPLICATION_CREDENTIALS (a file path) or FIREBASE_SERVICE_ACCOUNT (the JSON itself), and, for --apply,
// DEMO_PASSWORD (12+ characters) which becomes the password of every demo account. The password is never stored in git.
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldPath, getFirestore } from "firebase-admin/firestore";
import { buildDemoData, DEMO_DOMAIN, DEMO_PREFIX } from "./demo-data.mjs";

const COLLECTIONS = ["users", "assessments", "wellbeing", "availability", "appointments", "messages"];
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const remove = args.has("--remove");

const data = buildDemoData(new Date());
const counts = Object.entries(data).map(([name, rows]) => `${rows.length} ${name}`);
console.log(`Demo data: ${counts.join(", ")}.`);

if (!apply && !remove) {
  console.log("\nDry run: nothing was written. Accounts that would be created:");
  for (const u of data.users)
    console.log(`  ${u.role.padEnd(8)} ${u.email}${u.approved ? "" : "  (pending approval)"}`);
  console.log("\nRun with --apply to write it, or --remove to delete it.");
  process.exit(0);
}
if (apply && remove) fail("Pick one of --apply or --remove.");

const password = process.env.DEMO_PASSWORD ?? "";
if (apply && password.length < 12)
  fail("Set DEMO_PASSWORD to at least 12 characters (it is the login for every demo account).");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function serviceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  }
  return fail("Set FIREBASE_SERVICE_ACCOUNT (the JSON) or GOOGLE_APPLICATION_CREDENTIALS (a path to it).");
}

const account = serviceAccount();
const app = initializeApp({ credential: cert(account) });
const auth = getAuth(app);
const db = getFirestore(app);
console.log(`Firebase project: ${account.project_id}`);

/** Deletes every document whose id starts with "demo-" (ids sort, so a range query finds exactly those). */
async function deleteDemoDocs() {
  for (const name of COLLECTIONS) {
    const snap = await db
      .collection(name)
      .where(FieldPath.documentId(), ">=", DEMO_PREFIX)
      .where(FieldPath.documentId(), "<", `${DEMO_PREFIX.slice(0, -1)}.`)
      .get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref);
      await batch.commit();
    }
    console.log(`  removed ${snap.size} from ${name}`);
  }
}

async function writeAll() {
  for (const name of COLLECTIONS) {
    const rows = data[name];
    for (let i = 0; i < rows.length; i += 400) {
      const batch = db.batch();
      for (const { id, ...fields } of rows.slice(i, i + 400)) batch.set(db.collection(name).doc(id), fields);
      await batch.commit();
    }
    console.log(`  wrote ${rows.length} to ${name}`);
  }
}

async function upsertAccounts() {
  for (const u of data.users) {
    const props = { email: u.email, password, displayName: u.name, emailVerified: true, disabled: false };
    try {
      await auth.getUser(u.id);
      await auth.updateUser(u.id, props);
    } catch (error) {
      if (error?.code !== "auth/user-not-found") throw error;
      await auth.createUser({ uid: u.id, ...props });
    }
  }
  console.log(`  ${data.users.length} demo accounts ready (${DEMO_DOMAIN})`);
}

async function removeAccounts() {
  const res = await auth.deleteUsers(data.users.map((u) => u.id));
  console.log(`  removed ${res.successCount} demo accounts`);
}

if (remove) {
  console.log("\nRemoving demo data...");
  await deleteDemoDocs();
  await removeAccounts();
} else {
  console.log("\nWriting demo data (replacing earlier demo data)...");
  await deleteDemoDocs();
  await upsertAccounts();
  await writeAll();
  console.log(
    "\nDone. Sign in with any email above and the DEMO_PASSWORD you set. Re-run before each presentation to refresh the dates.",
  );
}
