# ApplynTrack — Code and Repo Issues

Code and repo issues found in the docs-vs-code audit, deferred until docs are updated.

Date: October 14, 2026
Status of this file: every item is **Open**. None of these items has been fixed. The other docs describe the behavior the code has today and point here for the known issues.

Categories:

- **Bug:** the code does something its own UI, API contract or intent says it should not.
- **Decision:** the behavior is consistent but undefined or risky. The owner must pick an option before any code change.
- **Cleanup:** no user-visible effect. Repo hygiene, dead code or stale comments.

## Summary

| ID | Title | Category | Severity | Status |
|---|---|---|---|---|
| CB-01 | No global error handler, no input validation, no tests, raw error messages returned | Decision | Major | Open |
| CB-02 | Resume upload has no file-size limit and multer errors are not handled | Decision | Major | Open |
| CB-03 | Build output and generated Prisma client are tracked in git, and `.gitignore` files are wrong | Cleanup | Moderate | Open |
| CB-04 | "Stale application" has five different definitions | Decision | Moderate | Open |
| CB-05 | Frontend falls back to `http://localhost:5000` and `next.config.ts` rewrites to localhost | Decision | Moderate | Open |
| CB-06 | Sidebar reads `targetRole` from Clerk `publicMetadata`, which the app never writes | Bug | Minor | Open |
| CB-07 | `GET /api/ai/resume-analysis/:appId` returns `suggestions` as the string `"[]"` | Bug | Minor | Open |
| CB-08 | Reminder tab text promises update and delete that the UI does not offer | Bug | Minor | Open |
| CB-09 | Reminder email interpolates user text into HTML without escaping | Bug | Minor | Open |
| CB-10 | `PUT /api/reminders/:id` does not reset `isSent` | Decision | Minor | Open |
| CB-11 | Unused backend dependencies and a hardcoded ngrok host | Cleanup | Minor | Open |
| CB-12 | Code comments cite `docs/context.md`, which does not exist | Cleanup | Minor | Open |
| CB-13 | Unused frontend `updateReminder`, `deleteReminder` and `Reminder` type | Cleanup | Minor | Open |
| CB-14 | Effectively unreachable "User not found" 404 branch in `getProfileController` | Cleanup | Minor | Open |
| CB-15 | Placeholder home page, and `/sign-up` is public in middleware but no sign-up page exists | Cleanup | Minor | Open |

---

## CB-01 — No global error handler, no input validation, no tests, raw error messages returned

- **Category and severity:** Decision, Major
- **Original audit IDs:** PRD-01, ARCH-07 (error handling and testing debt)

**Current behavior**

- `backend/src/index.ts` registers routes only. There is no Express error-handling middleware and no handler for unknown routes (an unmatched path gets Express's default response).
- Every controller has its own `try/catch`. The pattern differs by module:
  - `ai.controller.ts` (lines 16-22 and 36-42) and `reminders.controller.ts` return `400 { "error": error.message }` for **any** `Error`, including database and Gemini failures. They return `500 { "error": "Internal server error" }` only when something that is not an `Error` is thrown.
  - `applications.controller.ts` returns `500` with the raw error message.
  - `user.controller.ts` returns `500 { "error": "Internal server error" }`.
- There is no request-body validation (no Zod). Invalid enum values or missing fields reach Prisma and surface as whatever message Prisma produces.
- There are no automated tests in either project.
- The reminder cron callback in `backend/src/jobs/reminderJob.ts` (line 6) has no outer `try/catch`; only the per-reminder send has one (line 47). A failure in the initial `findMany` query becomes an unhandled promise rejection. This behavior follows from the code; it was not reproduced by running it.

**Code location**

- `backend/src/index.ts`
- `backend/src/modules/ai/ai.controller.ts:16-22`, `:36-42`
- `backend/src/modules/reminders/reminders.controller.ts`
- `backend/src/modules/applications/applications.controller.ts`
- `backend/src/jobs/reminderJob.ts:6`, `:47`

**Impact**

- Internal error text (Prisma, Gemini, Supabase) can reach the browser and be shown to the user.
- The same kind of failure returns different status codes depending on the module.
- Bad input produces unhelpful errors instead of a clear `400`.
- Regressions have no safety net.

**Expected behavior / options**

- Option A (matches `before-beta.md` §1.1 and §1.2): add a final error-handling middleware and a 404 handler, add Zod validation middleware, wrap the cron body in `try/catch`, add `unhandledRejection` and `uncaughtException` logging. Trade-off: a few hours of work, and every controller's error contract changes, so the frontend error messages need a check.
- Option B: keep per-controller handling and only fix the status codes and messages. Trade-off: smaller change, but there is still no safety net for errors thrown outside a `try/catch`.
- Tests are tracked separately in `before-beta.md` §6.5.

**Docs affected:** `prd.md` §8, `docs/architecture.md` (Error Handling, Known Technical Debt), `docs/backend-api.md` (error sections for AI and reminders), `before-beta.md` §1.1, §1.2, §6.5.

---

## CB-02 — Resume upload has no file-size limit and multer errors are not handled

- **Category and severity:** Decision, Major
- **Original audit IDs:** BAPI-04

**Current behavior**

- `multer` is created as `multer({ storage: multer.memoryStorage() })` with no `limits`. The whole upload is held in memory.
- The `application/pdf` check runs after multer has already accepted the file, on the client-declared `mimetype` only. There is no check of the `%PDF` magic bytes.
- The upload handler is registered as middleware in `user.routes.ts`. A multer error (for example an unexpected field name) is not caught by any controller `try/catch`. The exact status and body that Express sends for it were **not verified by running the server**. It should be treated as Express's default error response, not as the documented `{ "error": ... }` shape.
- A PDF that `pdf2json` cannot parse ends in the controller's `catch` and returns `500 { "error": "Internal server error" }`.
- A scanned or image-only PDF is accepted and stored with empty extracted text.

**Code location**

- `backend/src/modules/user/user.controller.ts:56` (multer setup), `:62-67` (file and mimetype checks), `:119-121` (catch)
- `backend/src/modules/user/user.routes.ts` (`router.post("/resume", requireUser, uploadMiddleware, ...)`)

**Impact**

- Any signed-in user can upload an arbitrarily large file and use server memory.
- Some failures return a response that does not match the API contract.
- Users with image-only PDFs get no clear message, and Resume Analysis later runs on empty text.

**Expected behavior / options**

- Option A (matches `before-beta.md` §1.5): set `limits.fileSize` (for example 5 MB), wrap the multer middleware so its errors return `400 { "error": ... }`, check the `%PDF` bytes, and reject empty extracted text with a clear message. Trade-off: new error responses the frontend should display.
- Option B: only add the size limit. Trade-off: smallest change, but the contract gaps remain.

**Docs affected:** `docs/backend-api.md` (resume upload errors), `docs/modules/profile.md` (§2 errors, §8), `before-beta.md` §1.5.

---

## CB-03 — Build output and generated Prisma client are tracked in git, and `.gitignore` files are wrong

- **Category and severity:** Cleanup, Moderate
- **Original audit IDs:** BB-02

**Current behavior**

- `git ls-files` lists 22 files under `backend/dist/` and 20 files under `backend/src/generated/prisma/` as tracked.
- `backend/.gitignore` contains `node_modules`, `.env` and `/generated/prisma`. The generated client is written to `src/generated/prisma`, so `/generated/prisma` matches nothing.
- `backend/.gitignore` does not ignore `dist`.
- The root `.gitignore` contains only `prd.md` and `chnages.txt`. It has no `.env*`, `node_modules` or `dist` rule. (`frontend/` has its own `.gitignore`.)
- No tracked `.env` file was found (`git ls-files` shows no env files).
- Nothing under `src/` imports from `dist/`, so the tracked `dist/` files are not used at development time. The generated client **is** imported by the source, so it must stay on disk; it only needs to stop being tracked.

**Code location**

- `backend/.gitignore`, `.gitignore` (repo root)
- `backend/dist/**`, `backend/src/generated/prisma/**`

**Impact**

- Noisy diffs and merge conflicts on generated files.
- Stale compiled output can be committed and mistaken for current code.
- The risk of a future secret or build artifact being committed is higher.

**Expected behavior / options**

- Remove the generated files from the git index (keep them on disk), correct the ignore path to `src/generated/prisma`, add `dist` to the backend ignore file, and add `.env*` and `node_modules` to the root ignore file. Trade-off: one cleanup commit; every developer must run `npx prisma generate` and `npm run build` locally, which the README already documents.

**Docs affected:** `docs/architecture.md` (Known Technical Debt), `before-beta.md` §1.3, `docs/backend-api.md` (Remaining Backend Work).

---

## CB-04 — "Stale application" has five different definitions

- **Category and severity:** Decision, Moderate
- **Original audit IDs:** APPS-07, PRD-02, DASH-01

**Current behavior**

| Where | Definition |
|---|---|
| `backend/src/modules/dashboard/dashboard.service.ts:32-39` (`stats.staleApplications`) | Status `APPLIED` and `dateApplied` strictly earlier than "now minus 14 days" (server local time, `<`) |
| `frontend/app/(protected)/dashboard/page.tsx:105-111` | Status `APPLIED` and `floor(days since dateApplied) >= 14`. Does not use `stats.staleApplications` |
| `frontend/app/(protected)/applications/page.tsx:342-346` (header chip) | Status `APPLIED` and milliseconds since `dateApplied` `>= 14 days` |
| `frontend/app/(protected)/applications/page.tsx:81-92`, `:222-224` (card badge) | **Any** status, `floor(days since last status change) >= 14`, using the latest `statusHistory` entry or `updatedAt` |
| `prd.md` §7.6 | "No status change in fourteen plus days" (any status) |

**Impact**

- The dashboard, the applications header chip and the backend stat can disagree by a day or so, because of `<` vs `>=` and local-time vs elapsed-time math.
- A card can show a stale-age badge while the header chip does not count it, for example an `INTERVIEW` application with no change for 14+ days, or `OFFER` and `REJECTED` cards.
- The header text "no update in 14+ days" describes the card-badge meaning, but the count uses the `APPLIED`-only rule.

**Expected behavior / options**

- Option A: stale means `APPLIED` for 14+ days since `dateApplied` everywhere (the backend and dashboard rule). Change the card badge to match, or label it differently. Trade-off: users lose the "no movement" signal for later stages.
- Option B: stale means no status change in 14+ days, for non-terminal statuses only (the PRD rule). Change the backend, dashboard and header chip. Trade-off: needs `statusHistory` in the stats query, and a decision on `OFFER` and `REJECTED`.
- Either way, use one shared threshold and one calculation, and have the dashboard use `stats.staleApplications` or drop that field.

**Docs affected:** `prd.md` §7.6, `docs/backend-api.md` (dashboard stats), `docs/modules/dashboard.md` (§4, §9), `docs/modules/applications.md` (card badge, header chip).

---

## CB-05 — Frontend falls back to `http://localhost:5000` and `next.config.ts` rewrites to localhost

- **Category and severity:** Decision, Moderate
- **Original audit IDs:** ARCH-04 (production configuration debt)

**Current behavior**

- `frontend/app/lib/api.ts:2` is `const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"`. A missing variable silently targets localhost.
- `frontend/next.config.ts:9` rewrites `/api/:path*` to `http://localhost:5000/api/:path*`.

**Impact**

- In a deployment where `NEXT_PUBLIC_API_URL` is missing or misspelled, requests go to the wrong place and fail with no clear error.

**Expected behavior / options**

- Option A: make a missing `NEXT_PUBLIC_API_URL` throw outside development, and remove or env-gate the rewrite (`before-beta.md` §1.3). Trade-off: local setups must keep the variable in `.env.local`.
- Option B: keep the fallback for local convenience and document it. Trade-off: the silent failure mode stays.

**Docs affected:** `docs/architecture.md` (Known Technical Debt), `before-beta.md` §1.3.

---

## CB-06 — Sidebar reads `targetRole` from Clerk `publicMetadata`, which the app never writes

- **Category and severity:** Bug, Minor
- **Original audit IDs:** PROF-03

**Current behavior**

- `frontend/app/components/Sidebar.tsx:39` reads `user?.publicMetadata?.targetRole`.
- The profile page saves `targetRole` to the local database through `PUT /api/user/profile`. Nothing writes it to Clerk metadata.

**Impact**

- The target role entered on the Profile page never appears in the sidebar, unless the value was set in Clerk by hand.

**Expected behavior**

- The sidebar should show the `targetRole` from the cached profile (`useProfile()`), the same source the Profile page uses.

**Docs affected:** `docs/modules/profile.md` (§8 Known Limitations).

---

## CB-07 — `GET /api/ai/resume-analysis/:appId` returns `suggestions` as the string `"[]"`

- **Category and severity:** Bug, Minor
- **Original audit IDs:** BAPI-02, APPS-04

**Current behavior**

- The database stores `missingKeywords`, `strongestPoints`, `redFlags` and `suggestions` as JSON strings.
- `backend/src/modules/ai/ai.service.ts:152-157` (fetch) parses `missingKeywords`, `strongestPoints` and `redFlags`, but **not** `suggestions`. `GET` therefore returns `"suggestions": "[]"` (a string).
- `POST /api/ai/analyze-resume` (`ai.service.ts:123-130`) parses `suggestions` too, so it returns `[]` (an array).
- The frontend never reads `suggestions`. The AI tab does not break after a reload; the only effect is a type mismatch between the documented shape and the real response.

**Impact**

- `docs/backend-api.md` and the module doc promised `suggestions: []`; any future code that uses the field will get a string on reload.

**Expected behavior**

- `GET` should return `suggestions` as an array, the same as `POST`.

**Docs affected:** `docs/backend-api.md` (analysis response), `docs/modules/applications.md` (AI tab), `prd.md` §7.4.

---

## CB-08 — Reminder tab text promises update and delete that the UI does not offer

- **Category and severity:** Bug, Minor
- **Original audit IDs:** APPS-09

**Current behavior**

- `frontend/app/(protected)/applications/[id]/page.tsx:1104` shows the text "You can update or delete a reminder any time before it fires."
- The Reminder tab only creates a reminder (`POST /api/reminders`). No control calls `PUT` or `DELETE`, and there is no list of existing reminders. The backend endpoints exist.

**Impact**

- The user is told about actions that cannot be done in the UI.

**Expected behavior / options**

- Option A: change the text to match the UI. Trade-off: none.
- Option B: build update and delete controls in the Reminder tab (this also uses the client functions in CB-13). Trade-off: new UI, and a list endpoint is still missing (`before-beta.md` §4 P2).

**Docs affected:** `docs/modules/applications.md` (Reminder tab), `prd.md` §7.5.

---

## CB-09 — Reminder email interpolates user text into HTML without escaping

- **Category and severity:** Bug, Minor
- **Original audit IDs:** New in Step 0 of the audit

**Current behavior**

- `backend/src/utils/email.ts` builds the HTML with template literals. `userName` (line 22), `jobTitle` (line 25), `companyName` (line 26) and `notes` (line 27) are inserted as-is. The subject (line 15) also includes `jobTitle` and `companyName`.

**Impact**

- Text containing `<`, `>` or `&` renders as markup in the email. The email goes to the owner of the data, so the practical risk is low, but the output can look broken.

**Expected behavior**

- Escape these four values before inserting them into the HTML.

**Docs affected:** none.

---

## CB-10 — `PUT /api/reminders/:id` does not reset `isSent`

- **Category and severity:** Decision, Minor
- **Original audit IDs:** APPS-10

**Current behavior**

- `backend/src/modules/reminders/reminders.service.ts:43-46` updates only `{ reminderDate, notes }`.
- A reminder with `isSent = true` that is moved to a new date stays `isSent = true`.

**Impact**

- The cron job in `backend/src/jobs/reminderJob.ts:15-22` only selects reminders where `isSent` is `false`. A rescheduled reminder that already fired is therefore never sent again.

**Expected behavior / options**

- Option A: reset `isSent` to `false` whenever `reminderDate` changes, so a rescheduled reminder fires again. Trade-off: a user can receive a second email for the same reminder.
- Option B: keep the current behavior and treat a sent reminder as final (create a new one instead). Trade-off: the update endpoint does not do what a user would expect.

**Docs affected:** `docs/modules/applications.md` (reminder section), `docs/backend-api.md` (PUT reminder).

---

## CB-11 — Unused backend dependencies and a hardcoded ngrok host

- **Category and severity:** Cleanup, Minor
- **Original audit IDs:** BB-03

**Current behavior**

- `backend/package.json` lists `axios` (line 20), `jsonwebtoken` (line 25), `@types/jsonwebtoken` (line 36) and `@types/pdf-parse` (line 39). No source file under `backend/src` uses them; the project uses `pdf2json` and Clerk for tokens.
- `frontend/next.config.ts:4` sets `allowedDevOrigins: ["arrogant-figurine-manor.ngrok-free.dev"]`, a personal tunnel host.

**Impact**

- Larger install and a larger audit surface. The ngrok host is dev-only and is harmless in production, but it is personal config in the repo.

**Expected behavior**

- Remove unused packages. Move the ngrok host to an environment variable or remove it. Remove `@types/pdf-parse` together with any other unused type packages after confirming with a build.

**Docs affected:** `before-beta.md` §2 (`npm audit`).

---

## CB-12 — Code comments cite `docs/context.md`, which does not exist

- **Category and severity:** Cleanup, Minor
- **Original audit IDs:** New in Step 0 of the audit

**Current behavior**

- `frontend/app/(protected)/applications/page.tsx:39` says "Design tokens (docs/context.md §6 + applications-redesign.html)". Neither file is in the repo (`git ls-files` lists no `context.md` and no `applications-redesign.html`).

**Impact**

- Readers look for a document that is not there.

**Expected behavior**

- Update the comments to point at real docs (for example `docs/modules/applications.md`) or remove them.

**Docs affected:** none.

---

## CB-13 — Unused frontend `updateReminder`, `deleteReminder` and `Reminder` type

- **Category and severity:** Cleanup, Minor
- **Original audit IDs:** New in Step 0 of the audit

**Current behavior**

- `frontend/app/lib/api.ts:98` (`updateReminder`) and `:104` (`deleteReminder`) and the `Reminder` interface in `frontend/app/types/index.ts:68` are defined but no component calls or imports them.

**Impact**

- Dead code that suggests a feature exists. It also feeds the misleading text in CB-08.

**Expected behavior / options**

- Option A: remove them until a reminders management view exists. Trade-off: they must be rewritten later.
- Option B: keep them and build the UI (see CB-08 Option B).

**Docs affected:** `docs/modules/applications.md` (reminder section).

---

## CB-14 — Effectively unreachable "User not found" 404 branch in `getProfileController`

- **Category and severity:** Cleanup, Minor
- **Original audit IDs:** BAPI-01 (related), PROF-02 (related)

**Current behavior**

- `backend/src/modules/user/user.controller.ts:44-47` returns `404 { "error": "User not found" }` when the user is missing. The route is protected by `requireUser`, which already returns `401 { "error": "User not found. Please sync first." }` when there is no local user, so the controller branch never runs.

**Impact**

- None at runtime. Earlier docs listed the 404 as a real response.

**Expected behavior**

- Remove the dead branch, or keep it as a defensive check and leave the docs as they are now (401 only).

**Docs affected:** `docs/backend-api.md`, `docs/modules/profile.md` (both now state 401).

---

## CB-15 — Placeholder home page, and `/sign-up` is public in middleware but no sign-up page exists

- **Category and severity:** Cleanup, Minor
- **Original audit IDs:** New in Step 0 of the audit

**Current behavior**

- `frontend/app/page.tsx` renders only `<h1>Job Tracker</h1>`.
- `frontend/middleware.ts` lists `/sign-up(.*)` as a public route, but the frontend has no sign-up page. How new users register was **not verified**.

**Impact**

- Visitors to `/` see a bare heading. A request to `/sign-up` has no page to show.

**Expected behavior / options**

- Build a landing page and a sign-up page, or remove the unused route entry. Confirm first how sign-up is meant to work.

**Docs affected:** `docs/architecture.md` (Known Technical Debt).
