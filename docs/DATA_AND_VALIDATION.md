# Data types and validation

Mind Bridge is a **strict TypeScript** project and validates every form with **Zod**
(see [ADR 0001](adr/0001-typescript-and-zod.md)). This page says where each thing lives and what
the rules are, so you do not have to read the schemas to know them.

- **Types**: the shape of every Firestore document is a TypeScript `interface` in
  [`client/src/types/models.ts`](../client/src/types/models.ts). That file is the source of truth;
  this page does not repeat the fields, so it cannot drift.
- **Validation**: Zod schemas in [`client/src/lib/schemas/`](../client/src/lib/schemas/), one file per
  area, with shared field rules in `fields.ts`.

Validation here is a **usability** layer (clear messages next to the field). It is not a security
layer: anyone can bypass the browser and call Firestore directly, so the real gate is
[`firestore.rules`](../firestore.rules). See [`API.md`](API.md).

Related: [`ARCHITECTURE.md`](ARCHITECTURE.md#3-data-model) (ER diagram),
[`IPOO.md`](IPOO.md#3-risk-scoring-algorithm) (scoring), [`API.md`](API.md) (operations).

---

## 1. Document types

| Collection | Type in `models.ts` | Notes |
|---|---|---|
| `users/{uid}` | `UserProfile` | Document id is the Firebase Auth uid. `role` is `student`, `counselor` or `admin`; a counselor is treated as `admin` once loaded. |
| `assessments/{id}` | `Assessment` (with `QuestionSummary`) | A scored check-in. `riskLevel` is saved by the browser but never trusted: staff views and the alert recompute it (`utils/risk.ts`). |
| `appointments/{id}` | `Appointment` | `status` is free text with known values (`Pending Review`, `Confirmed`, `Rescheduled`, `Completed`, `Declined`, `Cancelled`). |
| `availability/{id}` | `AvailabilitySlot` | A bookable counselor time window. |
| `messages/{id}` | `ChatMessage` | One message in a student-counselor thread, keyed by `studentId`. |

Timestamps are **ISO-8601 strings** (`new Date().toISOString()`), except `users.createdAt`, which is
written with `serverTimestamp()` at sign-up. The `StoredDate` type covers both. Optional fields may
be absent.

---

## 2. Validation schemas

Each schema turns a form value into either parsed data or a `{ field: message }` map.
`lib/validate.ts` has three helpers: `validate(schema, input)` returns `{ ok, data }` or
`{ ok: false, error }`, `fieldErrorsOf(schema, input)` returns only the message map (empty when
valid), and `toFieldErrors(zodError)` does the conversion. Nested paths are joined with dots
(`answers.3`) and only the first message per field is kept.

| Schema | Used by | Rules |
|---|---|---|
| `signupSchema` | Sign-up | Name required (max 200). School email required (`@usa.edu.ph`). Password at least **8** characters. `consent` must be true (defaults to true when the form has no checkbox). |
| `loginSchema` | Log in | Well-formed email; password required, with no length rule (Firebase decides if it is right). |
| `passwordChangeSchema` | Settings > Password | Current password required. New password at least 8 characters and different from the current one. Confirmation must match. |
| `profileSchema` | Settings > Profile | Name required (max 80). Phone optional but valid if present. About-you text up to 500 characters. |
| `emergencyContactSchema` | Settings > Emergency contact | Name and phone required; alternate phone optional but valid if present; notes up to 500. |
| `goalsSchema` / `goalSchema` | Settings > Goals | Each goal 1 to 120 characters; at most 5 goals. |
| `checkInSchema` | Check-in | Exactly 7 answers, each a whole number from 0 to 3. |
| `bookingSlotSchema` | Booking | Slot id, counselor and valid start and end; the end must be after the start. |
| `timeWindowSchema(now)` | Availability, reschedule | Both times parse; start not in the past; end strictly after start. `now` is injectable so tests do not depend on the clock. |
| `appointmentActionSchema` | Decline, cancel, reschedule dialog | Decline needs a reason (max 500). Cancel's reason is optional. Reschedule needs a start time. |
| `caseReviewSchema` | Case inspector | Case id; status `open`, `reviewed` or `escalated`; notes up to 2000. |
| `counselorAssignmentSchema`, `accountActionSchema` | Accounts tab | Ids must be present. |
| `chatMessageSchema` | Chat | Text trimmed, 1 to 2000 characters. |

The messages are written for students and are part of the UI contract: the e2e suite asserts several
of them, so change them together.

### Edge cases worth knowing

- Missing values are treated as empty, so a form shows "Enter your email." instead of a technical
  "expected string" message.
- Passwords are never trimmed; names, notes and chat text are.
- A phone number may start with `+`, a digit or `(`, may contain spaces, dots, dashes and parentheses, and must have 7 to 13 digits (for example `0917 123 4567` or `+63 917 123 4567`).

### Turning errors into sentences

`utils/errors.ts` has `friendlyError(error, fallback?)`, which maps Firebase error codes to a
sentence a student can act on, and `AppError`, the one error shape the API layer throws.

### Tests

Schemas are covered in `client/src/lib/schemas/schemas.test.ts`, the predicates in
`utils/validation*.test.ts`, and the forms end to end in the Playwright specs under `client/e2e/`.

---

## 3. Risk scoring in one screen

Full write-up with worked examples: [`IPOO.md` section 3](IPOO.md#3-risk-scoring-algorithm).

```
maxScore = 3 x number of questions
high     if any crisis item > 0, or total >= 60% of maxScore
medium   if total >= 30% of maxScore
low      otherwise
```

Implemented in `client/src/utils/scoring.ts`. The alert code recomputes "high" from the saved
answers (`client/api/_alertCore.ts`, mirrored by `functions/index.js`), and tests fail if the rules
drift apart.
