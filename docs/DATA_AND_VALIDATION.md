# Data types and validation

Mind Bridge is a **plain JavaScript** project. There is no TypeScript and no Zod (or any schema
library). This page documents the two things those tools would normally cover:

- **Types**: the shape of every Firestore document, written as JSDoc `@typedef`s and tables.
- **Validation**: the hand-written, pure functions in `client/src/lib/validation.js` that check
  form input before anything is sent.

Validation here is a **usability** layer (clear messages next to the field). It is not a security
layer: anyone can bypass the browser and call Firestore directly, so the real gate is
[`firestore.rules`](../firestore.rules). See [`API.md`](API.md) and the known gaps listed there.

Related: [`ARCHITECTURE.md`](ARCHITECTURE.md#3-data-model) (ER diagram),
[`IPOO.md`](IPOO.md#3-risk-scoring-algorithm) (scoring), [`API.md`](API.md) (operations).

---

## 1. Document types

Timestamps are **ISO-8601 strings** (`new Date().toISOString()`), except `users.createdAt`, which
is written with `serverTimestamp()` at sign-up. Optional fields may be absent.

```js
/** users/{uid}: document id is the Firebase Auth uid */
/**
 * @typedef {Object} UserProfile
 * @property {string} id                       added by api.js from the document id
 * @property {string} name
 * @property {string} email
 * @property {"student"|"counselor"|"admin"} role
 * @property {boolean} approved                counselors need an admin; students are created true
 * @property {boolean} active                  false = treated as signed out everywhere
 * @property {boolean} [emailVerified]
 * @property {string} [phone]
 * @property {string} [bio]
 * @property {string} [avatarGradient]         an AVATAR_COLORS id: cyan|purple|emerald|amber|rose
 * @property {boolean} [useGoogleAvatar]
 * @property {EmergencyContact} [emergencyContact]
 * @property {string[]} [wellnessGoals]
 * @property {string|null} [assignedCounselorId]    staff-only fields (the three below)
 * @property {string|null} [assignedCounselorName]
 * @property {string|null} [assignedAt]
 * @property {string} [updatedAt]
 */

/** @typedef {{ name: string, phone: string, alternatePhone?: string }} EmergencyContact */
```

```js
/** assessments/{autoId} */
/**
 * @typedef {Object} Assessment
 * @property {string} id
 * @property {string} studentId                must equal the creator's uid (rules)
 * @property {string} studentName
 * @property {string} studentEmail
 * @property {Array<number|null>} answers      one 0-3 value per question; null = unanswered
 * @property {QuestionSummary[]} questionSummary
 * @property {number} total                    sum of answers
 * @property {number} maxScore                 3 x number of questions
 * @property {"low"|"medium"|"high"} riskLevel
 * @property {boolean} flaggedForImmediateReview
 * @property {string} status                   "open" on create (rules); staff change it later
 * @property {string} counselorNotes           "" on create
 * @property {string} createdAt
 * @property {string} [reviewedAt]             set by updateAssessmentStatus
 */

/** @typedef {{ id: string, text: string, score: number|null, isCrisisItem: boolean }} QuestionSummary */
```

```js
/** availability/{autoId}: a counselor's open slot */
/**
 * @typedef {Object} AvailabilitySlot
 * @property {string} id
 * @property {string} counselorId              must equal the creator's uid (rules)
 * @property {string} counselorName
 * @property {string} start                    datetime-local or ISO string
 * @property {string} end
 * @property {boolean} isBooked                students may change ONLY this field
 * @property {string} createdAt
 */

/** appointments/{autoId} */
/**
 * @typedef {Object} Appointment
 * @property {string} id
 * @property {string} studentId                must equal the creator's uid (rules)
 * @property {string} studentName
 * @property {string} studentEmail
 * @property {string|null} slotId              null for a generic request
 * @property {string} [counselorId]
 * @property {string} [counselorName]
 * @property {string} title
 * @property {string} [start]
 * @property {string} [end]
 * @property {string} [date]                   only on generic requests (tomorrow)
 * @property {"Pending Review"|"Confirmed"|"Declined"|"Cancelled"|"Rescheduled"} status
 * @property {string} createdAt
 * @property {string} [updatedAt]
 * @property {string} [cancellationReason]
 * @property {string} [cancelledBy]
 */

/** messages/{autoId}: immutable once written */
/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} studentId                the thread owner
 * @property {string} senderId                 must equal the writer's uid (rules)
 * @property {string} senderName
 * @property {"student"|"counselor"} senderRole
 * @property {string} text                     trimmed, never empty
 * @property {string} timestamp
 */
```

`Appointment.status` values are strings the UI uses; the rules only enforce that a **student** may
set `"Cancelled"` and nothing else. The `Rescheduled` value comes from the counselor flow.

### Using the types

JSDoc typedefs give editor hints without a build step. To get them in VS Code, annotate a variable:

```js
/** @type {import("./types").Assessment[]} */
const rows = await getMyAssessments();
```

(The typedefs above are documentation; there is no `types.d.ts` file. Add one only if you decide
to migrate, see §4.)

---

## 2. Validation functions

All live in `client/src/lib/validation.js`, are pure, and return **an object of `field -> message`**.
An empty object means valid.

| Function | Used by | Rules |
|---|---|---|
| `isEmail(v)` | login, signup | one `@`, a dot in the domain, no whitespace; surrounding spaces ignored |
| `isSchoolEmail(v)` | signup | `isEmail` and ends with `@usa.edu.ph` (case-insensitive) |
| `isPhone(v)` | emergency contact | starts with `+`, a digit or `(`; only digits, spaces, `().-`; 7 to 13 digits |
| `validateSignup({ name, email, password, consent? })` | `Signup.jsx` | name required; school email required; password at least **6** characters; `consent` defaults to `true` when omitted |
| `validateLogin({ email, password })` | `Login.jsx` | well-formed email; password required (no length rule) |
| `validateEmergencyContact({ name, phone, alternatePhone? })` | `UserSettings.jsx` | name and phone required; alternate phone optional but valid if present |
| `validatePasswordChange({ currentPassword, newPassword, confirmPassword })` | `UserSettings.jsx` | new password at least 6 characters and different from the current one; confirmation must match exactly |
| `validateAvailabilityWindow(start, end, now?)` | `ManageAvailability.jsx`, `Appointments.jsx` | both parse; start not in the past; end strictly after start |

Constants: `SCHOOL_EMAIL_DOMAIN = "@usa.edu.ph"`, `MIN_PASSWORD_LENGTH = 6`.

### Example

```js
import { validateSignup } from "../lib/validation";

validateSignup({ name: "Ana", email: "ana@gmail.com", password: "123" });
// {
//   email:    "Student registrations must use an @usa.edu.ph email address.",
//   password: "Password must be at least 6 characters."
// }

validateSignup({ name: "Ana", email: "ana@usa.edu.ph", password: "secret1" });
// {}  -> valid
```

```js
import { validateAvailabilityWindow } from "../lib/validation";

validateAvailabilityWindow("2026-10-03T10:00", "2026-10-03T09:00", new Date("2026-10-02T08:00"));
// { end: "The end time must be after the start time." }
```

### Edge cases worth knowing

- Whitespace-only `name` / `email` count as empty. Passwords are **not** trimmed.
- If the start time is already invalid, the end-ordering error is not also reported.
- `validateAvailabilityWindow` accepts a start exactly equal to `now`.
- Forms use `noValidate` and render these messages beside the field (see `README.md`, Contributing).

### Turning errors into sentences

`lib/errors.js` has `friendlyError(error, fallback?)`, which maps Firebase codes
(`auth/invalid-credential`, `permission-denied`, ...) to student-readable text and never shows raw
codes or messages. Wrong-password, unknown-user and invalid-credential deliberately share one
message so the form does not reveal which emails have accounts. `isPopupDismissed(error)` is true
when the user simply closed the Google sign-in window, so no error should be shown.

### Tests

`client/src/lib/validation.test.js` and `validation.edge.test.js` cover every function above,
including boundaries (6-character passwords, 7 and 13 digit phones, `start === now`).
Run with `cd client && npm test`.

---

## 3. Risk scoring in one screen

Full write-up with worked examples: [`IPOO.md` section 3](IPOO.md#3-risk-scoring-algorithm).

```
maxScore = 3 x number of questions
high     if any crisis item > 0, or total >= 60% of maxScore
medium   if total >= 30% of maxScore
low      otherwise
```

Implemented once in `client/src/lib/scoring.js` and mirrored in `functions/index.js`; a test in
`backend-tests/functions/alertOnHighRisk.test.js` fails if the two drift apart.

---

## 4. If you later migrate to TypeScript / Zod

Not needed for the current scope, but this is the order that would cost least:

1. Rename `lib/*.js` to `.ts` leaf-first (`dates`, `errors`, `scoring`, `validation`); they are pure
   and already covered by tests.
2. Turn the typedefs in section 1 into `export type` declarations in `lib/types.ts`.
3. Replace `validation.js` with Zod schemas **per form**; keep the same `field -> message` output
   (`schema.safeParse(v).error.flatten().fieldErrors`) so the screens do not change.
4. Validate documents **read** from Firestore with the same schemas at the `api.js` boundary, which
   also fixes the stored-`id`-overrides-doc-id quirk noted in the unit tests.
5. Keep `firestore.rules` as the authority; schemas in the browser can never replace it.
