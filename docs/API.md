# Mind Bridge backend API

Mind Bridge has **no REST server**. The browser talks straight to Firebase, and
`firestore.rules` is the only server-side gate. So an "endpoint" here is one of:

| Kind | Where it lives | How it is called |
|---|---|---|
| Firebase Auth | `client/src/pages/auth/*`, `components/AuthProvider.tsx` | Firebase Auth SDK |
| Firestore operation | `client/src/lib/api.ts` | Firestore SDK, checked by `firestore.rules` |
| Cloud Function trigger | `functions/index.js` (**not deployed yet**) | fires on `assessments/{id}` create |

Sections 1-6 describe each operation; section 7 gives a curl example for every one, 8 covers
errors and 9 rate limits. Auth flow: 7.1.

"Status codes" map onto Firestore like this. The tests assert these outcomes.

| HTTP-style | Firestore / SDK result |
|---|---|
| 200 / 201 | the promise resolves (writes resolve with a ref or `undefined`) |
| 400 | `invalid-argument` (e.g. an `undefined` field, rejected client-side before the network) |
| 401 | no `request.auth`; the rules deny it as `permission-denied` |
| 403 | `permission-denied` |
| 404 | `getDoc` resolves with `exists() === false` (`api.ts` returns `null` for settings) |

## Roles

| Role | Profile (`users/{uid}`) | Access |
|---|---|---|
| student | `role: "student", approved: true, active: true` | own data only |
| counselor | `role: "counselor", approved: true` | staff access only **after** an admin approves |
| admin | `role: "admin"` | staff access + user management |
| deactivated | `active: false` | treated as signed out for everything |

Staff = admin, or counselor with `approved == true`. Self-signup can only create
an active, approved **student**; counselors and admins are provisioned out of band.

---

## 1. Auth

### Sign up (email): `Signup.tsx`
`createUserWithEmailAndPassword` → `updateProfile` → `setDoc(users/{uid})`

```js
await setDoc(doc(db, "users", uid), {
  name: "Ana Student", email: "ana@usa.edu.ph",
  role: "student", emailVerified: false, approved: true, active: true,
  createdAt: serverTimestamp(),
});
```
| Case | Result |
|---|---|
| own uid, `role: "student"`, `approved: true`, `active: true` | 200 |
| other uid, or `role` ≠ student, or `approved`/`active` false | 403 |
| signed out | 403 |

### Sign in (email / Google): `Login.tsx`
`signInWithEmailAndPassword` or `signInWithPopup`, then `getDoc(users/{uid})`.
Missing profile or `active === false` → the client signs the user out. First Google
sign-in creates the student profile (same rule as sign up).
Role routing: `admin`/`counselor` → `/admin/dashboard`, otherwise `/student/dashboard`.

### Password reset
`sendPasswordResetEmail(auth, email)`. Handled entirely by Firebase Auth, nothing to test here.

---

## 2. User profiles: `users/{uid}`

| Function | Operation | student | counselor (approved) | admin |
|---|---|---|---|---|
| `getUserSettings(uid?)` | get | own | any | any |
| `saveUserSettings(uid?, data)` | update | own, **not** `role, approved, active, assignedCounselorId, assignedCounselorName, assignedAt` | – | any field |
| `getAdminUsers()` | list | 403 | 200 | 200 |
| `approveCounselor(id)` / `rejectCounselor(id)` | update `approved` | 403 | 403 | 200 |
| `deactivateUser(id)` / `reactivateUser(id)` | update `active` | 403 | 403 | 200 |
| `assignCounselorToStudent(studentId, counselorId, counselorName)` | update assignment fields only | 403 | 200 | 200 |
| – | delete | 403 | 403 | 403 (nobody) |

```js
await getUserSettings();
// { id: "stu1", name: "Ana Student", email: "ana@usa.edu.ph",
//   role: "student", approved: true, active: true }
await getUserSettings("nobody");        // null
await saveUserSettings(undefined, { name: "Ana B." });
await saveUserSettings("stu1", { role: "admin" });   // rejects: permission-denied
await saveUserSettings();               // no user → throws Error("No authenticated user")

await assignCounselorToStudent("stu1", "cou1", "Dr. Cruz");
// users/stu1 → { assignedCounselorId: "cou1", assignedCounselorName: "Dr. Cruz", assignedAt: "<ISO>" }
await assignCounselorToStudent("stu1", null);       // clears all three to null
```

---

## 3. Assessments: `assessments/{id}`

Document shape:
```jsonc
{
  "studentId": "stu1", "studentName": "Ana Student", "studentEmail": "ana@usa.edu.ph",
  "answers": [0, 1, 0, 1, 0, 0, 0],
  "questionSummary": [{ "id": "q7", "text": "Safety", "score": 0, "isCrisisItem": true }],
  "total": 2, "maxScore": 21,
  "riskLevel": "low | medium | high", "flaggedForImmediateReview": false,
  "status": "open", "counselorNotes": "", "createdAt": "<ISO>",
  "reviewedAt": "<ISO, set on review>"
}
```

| Function | Operation | student | counselor / admin |
|---|---|---|---|
| `submitResponse(answers, {questions, flaggedForImmediateReview})` | create | own `studentId`, `status: "open"` | same rule (studentId must be their own uid) |
| `getMyAssessments()` | list `where studentId == uid` | 200 | 200 |
| `getAssessments()` | list all (+ name enrichment from `users`) | **403** | 200 |
| `updateAssessmentStatus(id, status, notes?)` | update | **403** | 200 |
| – | delete | 403 | 403 |

Scoring (`utils/scoring.ts`): `maxScore = 3 × questions`; **high** if any crisis item > 0 or
total ≥ 60 % of max; **medium** at ≥ 30 %; else **low**.

```js
await submitResponse([0,0,0,0,0,0,1], { questions });
// → { id: "TAbT…", studentId: "stu1", total: 1, maxScore: 21,
//     riskLevel: "high", flaggedForImmediateReview: true, status: "open", … }

await updateAssessmentStatus("a1", "reviewed", "called student");
// → doc gains { status: "reviewed", counselorNotes: "called student", reviewedAt: "<ISO>" }
```
`getAssessments()` replaces placeholder names (`"Student"`, `"No email"`) with the value from the
student's profile.

---

## 4. Appointments & availability

### `availability/{id}`: counselor slots
```jsonc
{ "counselorId": "cou1", "counselorName": "Dr. Cruz", "start": "<ISO>", "end": "<ISO>",
  "isBooked": false, "createdAt": "<ISO>" }
```
| Function | student | counselor / admin |
|---|---|---|
| `getAvailability()` list | 200 | 200 |
| `getMyAvailability()` list `where counselorId == uid` | – | 200 |
| `addAvailability(start, end)` create | 403 | 200, `counselorId` must be own uid |
| booking flips `isBooked` | 200 (**only** that field) | 200 |
| `removeAvailability(id)` delete | 403 | only the slot's owner |

### `appointments/{id}`
```jsonc
{ "studentId": "stu1", "studentName": "…", "studentEmail": "…", "slotId": "slot1",
  "counselorId": "cou1", "counselorName": "Dr. Cruz", "title": "Session with Dr. Cruz",
  "start": "<ISO>", "end": "<ISO>",
  "status": "Pending Review | Confirmed | Declined | Cancelled",
  "createdAt": "<ISO>", "updatedAt": "<ISO>" }
```
| Function | student | counselor / admin |
|---|---|---|
| `bookAppointment(slot?)` create | 200, `studentId` must be own uid | – |
| `getAppointments()` list `where studentId == uid` | 200 | – |
| `getAllAppointments()` list all (+ name enrichment) | **403** | 200 |
| `updateAppointmentStatus(id, status, extra)` | only → `Cancelled`, touching only `status, updatedAt, cancellationReason, cancelledBy` | any change |
| delete | 403 | 403 |

```js
await bookAppointment({ id: "slot1", counselorId: "cou1", counselorName: "Dr. Cruz", start, end });
// slot1.isBooked → true; creates appointment with status "Pending Review"

await updateAppointmentStatus("ap1", "Cancelled",
  { slotId: "slot1", cancellationReason: "sick", cancelledBy: "student" });   // student, frees slot1
await updateAppointmentStatus("ap1", "Confirmed");                            // student → 403
```
Declining or cancelling with `extraData.slotId` also sets that slot's `isBooked` back to `false`.

---

## 5. Confidential messages: `messages/{id}`
```jsonc
{ "studentId": "stu1", "senderId": "stu1", "senderName": "Ana", "senderRole": "student",
  "text": "hi", "timestamp": "<ISO>" }
```
| Function | student | counselor / admin |
|---|---|---|
| `listenToStudentMessages(studentId, onUpdate, onError)` | own thread; otherwise `onError({code:"permission-denied"})` | any thread |
| `sendStudentMessage({studentId, senderId, senderName, senderRole, text})` | own thread, `senderId` must be own uid | any thread, `senderId` own uid |
| update / delete | 403 (messages are immutable) | 403 |

`sendStudentMessage` returns `null` without writing when `text` is blank or `studentId` is empty;
otherwise it resolves `{ id, ...payload }` with `text` trimmed. `listenToStudentMessages` returns an
unsubscribe function and delivers messages sorted oldest-first.

Any collection not listed above is closed to everyone (`match /{document=**} → false`).

---

## 6. Cloud Function: `alertOnHighRisk` (not deployed)

Trigger: `assessments/{id}` onCreate. It recomputes risk itself from `total`, `maxScore` and
`questionSummary` (it ignores the client's `riskLevel`). If high, it emails every active, approved
counselor/admin (deduplicated, lower-cased):

```
Subject: High-risk wellness alert: Ana
Student: Ana / Score: 14/21 / Immediate review flag: No|YES / link → <APP_URL>/admin/dashboard
```
No answers or question text are placed in the email. Config: secret `SMTP_URL`, params `SMTP_FROM`, `APP_URL`.

---

## 7. REST reference (curl)

Every operation above can also be made over Google's public REST APIs, with the same rules
applying. The app itself never does this (it uses the SDKs), so treat these as equivalent
calls for testing and scripting. Two things the SDK wrappers do that raw REST does **not**:
scoring a check-in (`riskLevel`, `total`) and freeing a slot when an appointment is
declined or cancelled. A REST caller has to do both itself.

```bash
export PROJECT=mind-bridge-50970                 # Firebase project id
export API_KEY=<web API key>                     # VITE_FIREBASE_API_KEY (identifies the project, not a secret)
export DB="https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents"
```

### 7.1 Authentication flow

```
sign up / sign in ──► idToken (1 h) + refreshToken ──► Authorization: Bearer <idToken>
        │                                                      │
        └─ create users/{uid} (students only)                  └─ firestore.rules reads request.auth.uid,
                                                                  then users/{uid}.role / approved / active
```

Authentication proves who you are. Authorization lives in `users/{uid}`: a valid token for a
deactivated user (`active: false`) still authenticates but every Firestore call is denied.

**Sign up**
```bash
curl -s "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@usa.edu.ph","password":"s3cret-pass","returnSecureToken":true}'
# → { "idToken": "eyJ…", "refreshToken": "AMf…", "expiresIn": "3600", "localId": "<uid>", "email": "…" }
```

**Create the profile** (required, or `isActive()` is false and everything else is denied)
```bash
export TOKEN=<idToken>; export UID_=<localId>
curl -s -X PATCH "$DB/users/$UID_" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fields":{
        "name":{"stringValue":"Ana Student"}, "email":{"stringValue":"ana@usa.edu.ph"},
        "role":{"stringValue":"student"}, "approved":{"booleanValue":true},
        "active":{"booleanValue":true}, "emailVerified":{"booleanValue":false},
        "createdAt":{"timestampValue":"2026-10-02T00:00:00Z"}}}'
```
A `PATCH` on a missing document creates it, and the `create` rule applies. Any other `role`, or
`approved`/`active` false, returns 403.

**Sign in**
```bash
curl -s "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@usa.edu.ph","password":"s3cret-pass","returnSecureToken":true}'
```
Google sign-in is browser-only (`signInWithPopup`); there is no curl equivalent for the popup step.

**Refresh an expired token**
```bash
curl -s "https://securetoken.googleapis.com/v1/token?key=$API_KEY" \
  -d "grant_type=refresh_token&refresh_token=$REFRESH_TOKEN"
# → { "id_token": "eyJ…", "refresh_token": "…", "expires_in": "3600", "user_id": "<uid>" }
```

**Password reset email**
```bash
curl -s "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"requestType":"PASSWORD_RESET","email":"ana@usa.edu.ph"}'
```

### 7.2 Value encoding

Firestore REST wraps every value in a type: `{"stringValue":"x"}`, `{"booleanValue":true}`,
`{"integerValue":"3"}` (integers are strings), `{"timestampValue":"<RFC 3339>"}`,
`{"nullValue":null}`, `{"arrayValue":{"values":[…]}}`, `{"mapValue":{"fields":{…}}}`.
The app stores dates as ISO strings, so use `stringValue` for `createdAt`, `start`, `end` etc. when
matching app data (only `users.createdAt` is a real timestamp).

Partial update = `PATCH` with `updateMask.fieldPaths` for each field you send; without a mask the
whole document is replaced.

Queries use `POST $DB:runQuery`. The examples below use this template:
```bash
curl -s -X POST "$DB:runQuery" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"structuredQuery":{"from":[{"collectionId":"<collection>"}],
       "where":{"fieldFilter":{"field":{"fieldPath":"<field>"},"op":"EQUAL","value":{"stringValue":"<v>"}}}}}'
```

### 7.3 Users

```bash
# getUserSettings: read a profile (own, or any if staff)
curl -s "$DB/users/$UID_" -H "Authorization: Bearer $TOKEN"

# saveUserSettings: student updating own name (touching role/approved/active/assignment* → 403)
curl -s -X PATCH "$DB/users/$UID_?updateMask.fieldPaths=name" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fields":{"name":{"stringValue":"Ana B."}}}'

# getAdminUsers: list all profiles (staff only)
curl -s "$DB/users?pageSize=100" -H "Authorization: Bearer $ADMIN_TOKEN"

# approveCounselor / rejectCounselor (admin only); deactivate/reactivate are the same with "active"
curl -s -X PATCH "$DB/users/$COUNSELOR_UID?updateMask.fieldPaths=approved" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"fields":{"approved":{"booleanValue":true}}}'

# assignCounselorToStudent (staff): only these three fields are allowed
curl -s -X PATCH "$DB/users/$STUDENT_UID?updateMask.fieldPaths=assignedCounselorId&updateMask.fieldPaths=assignedCounselorName&updateMask.fieldPaths=assignedAt" \
  -H "Authorization: Bearer $STAFF_TOKEN" -H "Content-Type: application/json" \
  -d '{"fields":{"assignedCounselorId":{"stringValue":"cou1"},
                 "assignedCounselorName":{"stringValue":"Dr. Cruz"},
                 "assignedAt":{"stringValue":"2026-10-02T08:00:00.000Z"}}}'
```
Deleting a user (`DELETE $DB/users/<id>`) is always 403.

### 7.4 Assessments

```bash
# submitResponse: create a check-in. You must score it yourself (see §3) and send status "open".
curl -s -X POST "$DB/assessments" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"fields\":{
    \"studentId\":{\"stringValue\":\"$UID_\"}, \"studentName\":{\"stringValue\":\"Ana Student\"},
    \"studentEmail\":{\"stringValue\":\"ana@usa.edu.ph\"},
    \"answers\":{\"arrayValue\":{\"values\":[{\"integerValue\":\"0\"},{\"integerValue\":\"1\"},{\"integerValue\":\"0\"}]}},
    \"questionSummary\":{\"arrayValue\":{\"values\":[{\"mapValue\":{\"fields\":{
        \"id\":{\"stringValue\":\"q1\"},\"text\":{\"stringValue\":\"Sleep\"},
        \"score\":{\"integerValue\":\"0\"},\"isCrisisItem\":{\"booleanValue\":false}}}}]}},
    \"total\":{\"integerValue\":\"1\"}, \"maxScore\":{\"integerValue\":\"9\"},
    \"riskLevel\":{\"stringValue\":\"low\"}, \"flaggedForImmediateReview\":{\"booleanValue\":false},
    \"status\":{\"stringValue\":\"open\"}, \"counselorNotes\":{\"stringValue\":\"\"},
    \"createdAt\":{\"stringValue\":\"2026-10-02T08:00:00.000Z\"}}}"
# → 200 { "name": "projects/…/documents/assessments/<id>", "fields": {…}, "createTime": "…" }

# getMyAssessments: own check-ins
curl -s -X POST "$DB:runQuery" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"assessments\"}],
       \"where\":{\"fieldFilter\":{\"field\":{\"fieldPath\":\"studentId\"},\"op\":\"EQUAL\",\"value\":{\"stringValue\":\"$UID_\"}}}}}"

# getAssessments: all check-ins (staff only; student → 403)
curl -s "$DB/assessments?pageSize=100" -H "Authorization: Bearer $STAFF_TOKEN"

# updateAssessmentStatus: review a case (staff only)
curl -s -X PATCH "$DB/assessments/$ID?updateMask.fieldPaths=status&updateMask.fieldPaths=counselorNotes&updateMask.fieldPaths=reviewedAt" \
  -H "Authorization: Bearer $STAFF_TOKEN" -H "Content-Type: application/json" \
  -d '{"fields":{"status":{"stringValue":"reviewed"},"counselorNotes":{"stringValue":"called student"},
                 "reviewedAt":{"stringValue":"2026-10-02T09:00:00.000Z"}}}'
```

### 7.5 Availability and appointments

```bash
# getAvailability: all slots
curl -s "$DB/availability?pageSize=200" -H "Authorization: Bearer $TOKEN"

# addAvailability (staff; counselorId must equal the caller's uid)
curl -s -X POST "$DB/availability" \
  -H "Authorization: Bearer $STAFF_TOKEN" -H "Content-Type: application/json" \
  -d '{"fields":{"counselorId":{"stringValue":"cou1"},"counselorName":{"stringValue":"Dr. Cruz"},
                 "start":{"stringValue":"2026-10-05T09:00:00.000Z"},"end":{"stringValue":"2026-10-05T10:00:00.000Z"},
                 "isBooked":{"booleanValue":false},"createdAt":{"stringValue":"2026-10-02T08:00:00.000Z"}}}'

# removeAvailability (only the slot's owner)
curl -s -X DELETE "$DB/availability/$SLOT_ID" -H "Authorization: Bearer $STAFF_TOKEN"

# bookAppointment, step 1: take the slot (a student may change ONLY isBooked)
curl -s -X PATCH "$DB/availability/$SLOT_ID?updateMask.fieldPaths=isBooked" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fields":{"isBooked":{"booleanValue":true}}}'

# step 2: create the appointment (studentId must be the caller)
curl -s -X POST "$DB/appointments" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"fields\":{\"studentId\":{\"stringValue\":\"$UID_\"},\"studentName\":{\"stringValue\":\"Ana Student\"},
        \"studentEmail\":{\"stringValue\":\"ana@usa.edu.ph\"},\"slotId\":{\"stringValue\":\"$SLOT_ID\"},
        \"counselorId\":{\"stringValue\":\"cou1\"},\"counselorName\":{\"stringValue\":\"Dr. Cruz\"},
        \"title\":{\"stringValue\":\"Session with Dr. Cruz\"},
        \"start\":{\"stringValue\":\"2026-10-05T09:00:00.000Z\"},\"end\":{\"stringValue\":\"2026-10-05T10:00:00.000Z\"},
        \"status\":{\"stringValue\":\"Pending Review\"},\"createdAt\":{\"stringValue\":\"2026-10-02T08:00:00.000Z\"}}}"

# getAppointments: own bookings (same query as getMyAssessments, with collectionId "appointments")
# getAllAppointments: staff only
curl -s "$DB/appointments?pageSize=200" -H "Authorization: Bearer $STAFF_TOKEN"

# updateAppointmentStatus, staff: any status
curl -s -X PATCH "$DB/appointments/$APT_ID?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt" \
  -H "Authorization: Bearer $STAFF_TOKEN" -H "Content-Type: application/json" \
  -d '{"fields":{"status":{"stringValue":"Confirmed"},"updatedAt":{"stringValue":"2026-10-02T09:00:00.000Z"}}}'

# updateAppointmentStatus, student: Cancelled only, and only these fields. Then free the slot yourself.
curl -s -X PATCH "$DB/appointments/$APT_ID?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=cancellationReason&updateMask.fieldPaths=cancelledBy" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fields":{"status":{"stringValue":"Cancelled"},"updatedAt":{"stringValue":"2026-10-02T09:00:00.000Z"},
                 "cancellationReason":{"stringValue":"sick"},"cancelledBy":{"stringValue":"student"}}}'
curl -s -X PATCH "$DB/availability/$SLOT_ID?updateMask.fieldPaths=isBooked" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fields":{"isBooked":{"booleanValue":false}}}'
```

### 7.6 Messages

```bash
# sendStudentMessage: senderId must be the caller; students may only post to their own thread
curl -s -X POST "$DB/messages" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"fields\":{\"studentId\":{\"stringValue\":\"$UID_\"},\"senderId\":{\"stringValue\":\"$UID_\"},
        \"senderName\":{\"stringValue\":\"Ana\"},\"senderRole\":{\"stringValue\":\"student\"},
        \"text\":{\"stringValue\":\"hi\"},\"timestamp\":{\"stringValue\":\"2026-10-02T08:00:00.000Z\"}}}"

# listenToStudentMessages: REST has no live listener; poll this query and sort by timestamp client-side
curl -s -X POST "$DB:runQuery" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"messages\"}],
       \"where\":{\"fieldFilter\":{\"field\":{\"fieldPath\":\"studentId\"},\"op\":\"EQUAL\",\"value\":{\"stringValue\":\"$UID_\"}}}}}"
```
`PATCH` or `DELETE` on a message is always 403.

---

## 8. Error handling

### Firestore REST errors
Failures return a JSON body: `{"error":{"code":403,"message":"Missing or insufficient permissions.","status":"PERMISSION_DENIED"}}`.

| HTTP | `status` | SDK code | Typical cause here | What to do |
|---|---|---|---|---|
| 400 | `INVALID_ARGUMENT` | `invalid-argument` | Bad value encoding, unknown mask path, or (SDK) an `undefined` field | Fix the payload; don't retry |
| 401 | `UNAUTHENTICATED` | `unauthenticated` | Malformed or expired `idToken` | Refresh the token, retry once |
| 403 | `PERMISSION_DENIED` | `permission-denied` | A rule denied it: wrong role, unapproved counselor, deactivated user, no profile doc, forbidden field | Don't retry; check `users/{uid}` and §2–5 |
| 404 | `NOT_FOUND` | `not-found` | `PATCH` with a mask on a missing doc | Create it first or handle as empty |
| 409 | `ABORTED` | `aborted` | Transaction contention | Retry with backoff |
| 429 | `RESOURCE_EXHAUSTED` | `resource-exhausted` | Quota or per-document write rate | Back off exponentially |
| 503 | `UNAVAILABLE` | `unavailable` | Transient outage / offline | Retry with backoff |

The rules cannot tell "not signed in" from "not allowed", so a request with no token at all
normally comes back as 403, not 401.

### Auth REST errors
Returned as `{"error":{"code":400,"message":"EMAIL_EXISTS"}}`. The SDK's `auth/*` code and the
user-facing text from `client/src/utils/errors.ts` are shown alongside.

| REST `message` | SDK code | User-facing text |
|---|---|---|
| `EMAIL_EXISTS` | `auth/email-already-in-use` | An account with that email already exists. Try logging in instead. |
| `INVALID_LOGIN_CREDENTIALS` | `auth/invalid-credential` | That email and password do not match. Check them and try again. |
| `INVALID_EMAIL` | `auth/invalid-email` | That does not look like a valid email address. |
| `WEAK_PASSWORD : …` | `auth/weak-password` | Password must be at least 6 characters. |
| `USER_DISABLED` | `auth/user-disabled` | This account has been deactivated. Contact an administrator. |
| `TOO_MANY_ATTEMPTS_TRY_LATER` | `auth/too-many-requests` | Too many attempts. Wait a few minutes, then try again. |

`USER_DISABLED` is Firebase-level disabling. The app's own deactivation (`users.active = false`)
is different: sign-in succeeds, then `Login.tsx` signs the user out and every Firestore call is denied.

In the UI, `errors.ts` maps these codes to friendly messages and never shows raw codes or stack text.

---

## 9. Rate limits

**Mind Bridge enforces none of its own.** There is no API server to hold a limiter, and
`firestore.rules` has no rate logic. Limits come from Firebase. They change, so confirm the
numbers on the current Firebase quota pages before relying on them.

| Layer | Limit | Behavior |
|---|---|---|
| Firebase Auth sign-in | Throttling after repeated failures (no fixed published number) | `TOO_MANY_ATTEMPTS_TRY_LATER` / `auth/too-many-requests`; wait a few minutes |
| Firebase Auth emails (password reset) | Per-project daily quota | Requests fail once exhausted |
| Firestore, single document | About 1 sustained write per second | `RESOURCE_EXHAUSTED` or contention; relevant for a hot `availability` slot |
| Firestore daily quota (Spark/free plan) | 50,000 reads, 20,000 writes, 20,000 deletes per day | Calls fail until the daily reset |
| Firestore rules | 10 `get()`/`exists()` calls per single-document request, 20 for multi-document | Each rule here costs 1–2 lookups of `users/{uid}` |
| Cloud Function `alertOnHighRisk` | Not deployed | Would run once per new assessment |

Client guidance: back off exponentially on 429/503, prefer the SDK's `onSnapshot` over polling
`messages`, and never fan out `getAssessments()` per user. A custom limit (for example on check-in
submissions per student) would need a server route or a rule that compares timestamps. Neither exists today.

---

## Known gaps (verified by `rules/known-gaps.test.js`)

These writes **succeed today**. They are rule-level gaps, not test failures:

1. A student can create an appointment already `Confirmed`.
2. A student can book any `slotId`/`counselorId`, even a slot already booked (no double-booking guard).
3. A student can set any slot's `isBooked` back to `false`, un-booking another student's slot.
4. `riskLevel` / `flaggedForImmediateReview` are client-supplied, so a max-score check-in can be filed as `low`.
   (The Cloud Function recomputes, but the dashboards display the stored value.)
5. A student can post a message with `senderRole: "counselor"` and any `senderName`.

When one is fixed in `firestore.rules`, its test fails; flip it to `assertFails`.

Smaller note: `submitResponse` passes `question.text` straight through, so a question with no `text`
makes Firestore reject the write (`invalid-argument`, unsupported `undefined`). `bookAppointment`
signed out fails the same way client-side.

## Running the tests

```bash
cd backend-tests
npm install
npm test        # starts the Firestore emulator, runs everything, shuts it down
```
Needs **JDK 21+** on `PATH` (firebase-tools requirement). No Firebase project or network is
needed after install; it uses the demo project `demo-mindbridge`.

| Suite | File | What it checks |
|---|---|---|
| Rules | `rules/users`, `assessments`, `scheduling` | role × operation matrix against the real `firestore.rules` |
| Contract | `api/api.test.js` | every export of `lib/api.ts`: return shapes, persisted data, 403s |
| Function | `functions/alertOnHighRisk.test.js` | alert logic, recipients, escaping, parity with `scoring.ts` |
| Gaps | `rules/known-gaps.test.js` | the five gaps above |
