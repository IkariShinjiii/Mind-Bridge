# ADR-0001: Migrate the client to strict TypeScript and validate forms with Zod

**Status:** Accepted
**Date:** 2026-10-02
**Deciders:** Project maintainers

## Context

The client was plain JavaScript. Every Firestore document, form value and error was an untyped object, so
mistakes such as a misspelled field, a missing null check or an unhandled error shape only showed up at
runtime. Form validation lived in hand-written functions, and error handling mixed Firebase codes,
plain `Error` messages and ad-hoc strings. The app handles student wellness data, where a silent failure is
costly.

## Decision

1. Convert `client/` (source, tests, stories, e2e, configs) to TypeScript with `strict` plus
   `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` and `noImplicitOverride`.
2. Describe the data in `src/types/` (Firestore documents, auth context, errors).
3. Validate every form with a Zod schema in `src/lib/schemas/`, through one helper (`lib/validate.ts`).
   Existing `validateX` functions stay as thin wrappers so call sites and messages are unchanged.
4. Standardise failures on an `AppError` (`utils/errors.ts`) thrown by the data layer.
5. Organise `src/` as `components/`, `pages/`, `hooks/`, `types/`, `utils/`, `lib/`, `styles/`.

## Options Considered

### Option A: Strict TypeScript + Zod (chosen)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium: one-time migration, then less ceremony per form |
| Cost | One dependency (Zod, ~13 kB gzip, only loaded with the forms) |
| Type safety | Compile-time for code, runtime for user input |
| Team familiarity | High: both are the usual choice for a React + Vite app |

**Pros:** schemas are the single source of truth for a form's rules and its type; errors are consistent.
**Cons:** stricter code takes longer to write; Firestore reads are still cast (`as UserProfile`) because the
SDK cannot know document shapes.

### Option B: JSDoc types with `// @ts-check`
Lower migration cost, but weaker guarantees: no `strict` checks on `.jsx`, no typed props or state, and the
editor support is patchier. Rejected.

### Option C: TypeScript only, keep hand-written validators
Gets compile-time safety but leaves validation rules and their types defined in two places. Rejected.

## Trade-off Analysis

The extra rigour is worth it here because the failure modes are user-facing (a student cannot book, or a
check-in is saved with an invalid answer). The runtime cost is small: Zod ships in the route chunks that use
forms, not in the first paint.

## Consequences

- Easier: refactoring, catching a wrong field name or a missing `null` check, adding a form with its rules.
- Harder: Firestore reads trust document shape. A malformed stored document can still reach the UI.
- To revisit: parse documents read from Firestore with schemas (a `parse` step in `mapDocs`), and make
  slot booking a Firestore transaction so two students cannot book one slot.

## Action Items

1. [x] Convert source, tests, stories, e2e and config files; fix all type errors.
2. [x] Add schemas for login, signup, check-in, booking, counselor forms, profile and chat.
3. [x] Add `AppError`, `toAppError` and a typed `ErrorBoundary`.
4. [x] Run `tsc --noEmit` in CI before tests and the build.
5. [ ] Parse Firestore documents with schemas at the data-layer boundary.
6. [ ] Move slot booking into a transaction.
