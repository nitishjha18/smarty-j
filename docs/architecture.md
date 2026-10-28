# ApplynTrack — Technical Architecture

**Document location:** `docs/architecture.md`
**Last updated:** October 29, 2026
**Author:** Nitish Jha

---

## 1. Project Overview

ApplynTrack is a full-stack web application that helps final-year students and freshers manage job applications. The target user applies to 20–50 companies simultaneously and loses track of where they are in each process.

The system solves three specific engineering problems:

1. **Structured tracking** — storing application state with a full status transition history, not just a current status field
2. **AI-assisted resume fit** — comparing resume text against job descriptions with local keyword extraction and Gemini-generated recruiter feedback
3. **Automated follow-up** — a scheduled background job that sends email reminders without user action

The backend is a REST API monolith. There are no microservices. The frontend is a Next.js application. They communicate over HTTP with Clerk-issued JWT tokens.

---

## 2. System Architecture

### Overview

```
Browser (Next.js)
      │
      │ HTTPS + Clerk Bearer Token
      ▼
Express REST API (Node.js)
      │
      ├── Prisma ORM ──────────────── PostgreSQL (Supabase)
      ├── Supabase Storage ────────── PDF files
      ├── Google Gemini API ───────── AI completions
      ├── Resend API ──────────────── Transactional email
      └── node-cron ───────────────── Scheduled jobs (in-process)
```

### Frontend

| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router) | File-based routing, built-in TypeScript support, and layout-level auth wrapping. All data-driven pages are client components; see Section 2b. |
| Language | TypeScript | Type safety across the frontend-backend boundary. Field name mismatches become compile errors. |
| Styling | Tailwind CSS 4 | Utility-first, no context switching between CSS files and components. |
| Auth | Clerk (`@clerk/nextjs`) | Handles Google OAuth, token issuance, session management, and route protection with minimal configuration. |
| Board drag-and-drop | `@dnd-kit/core` + `@dnd-kit/utilities` | Mouse, touch and keyboard sensors with accessible announcements, and auto-scroll, without a UI framework. Used only on the applications board. |
| Client data | TanStack Query v5 | The provider creates one QueryClient for the browser session. It was chosen over SWR for its query-key factory, mutation cache APIs, and Devtools. |
| Company logos | Brandfetch (Logo API + Brand Search API) | Free tier with no attribution requirement. Returned logos for the large Indian companies tested. Called directly from the browser. See Section 6b. |

### Backend

| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js | Same language as the frontend reduces cognitive overhead. |
| Framework | Express 5 | Minimal, well-understood, explicit. No magic. Every route and middleware is visible. Alternatives like Fastify or NestJS add abstractions that aren't justified at this scale. |
| Language | TypeScript | Prisma's generated types propagate through the service layer. Type errors in DB queries are caught at compile time. |
| ORM | Prisma | Generates TypeScript types from the schema. Query builder is readable. Migration system is explicit. Raw SQL alternatives like Drizzle were considered but Prisma's generated types provide better safety for a solo project. |
| Database | PostgreSQL via Supabase | Relational model fits the data — users, applications, status history, reminders all have foreign key relationships. Supabase provides the managed PostgreSQL instance, Storage, and a dashboard for inspecting data during development. |
| Auth middleware | Clerk Express SDK | Validates Clerk-issued JWTs without implementing token verification manually. |
| AI | Google Gemini (`gemini-3.6-flash`) | Available via REST API, no self-hosting required, free tier sufficient for development. Model selected by trial — earlier models (1.5-flash, 2.0-flash) returned 404 at the time of development. The model name is hardcoded in `backend/src/config/gemini.ts`. |
| Email | Resend | Simple REST API for transactional email. Custom domain (applyntrack.online) verified for professional sender identity. |
| File storage | Supabase Storage | Already using Supabase for the database. Using the same platform for file storage avoids a second vendor. |
| Logging | Pino + pino-http (`pino-pretty` in development) | Structured JSON logs with a per-request id, redacted `Authorization` and `Cookie` headers, and level control through `LOG_LEVEL`. See Section 11. |
| Scheduler | node-cron | Runs inside the Express process. No external scheduler (like Vercel Cron or AWS EventBridge) required. Acceptable for a monolith deployed on a single Railway instance. |

---

## 2b. Frontend Architecture

Layout: protected routes are wrapped in `app/(protected)/layout.tsx`. It runs `useUserSync()` and keeps the sidebar and route content rendered while the user-sync query is in flight.

State management: `app/providers.tsx` creates one `QueryClient` with React state and renders it inside `ClerkProvider`. `app/lib/queryKeys.ts` creates user-scoped keys; `app/lib/queries.ts` contains the query and mutation hooks. Page components keep only UI state such as active tabs, modal visibility, form inputs, and temporary success feedback.

API calls: all calls to the Express backend go through `frontend/app/lib/api.ts`, from query and mutation functions in `frontend/app/lib/queries.ts`. No page makes raw fetch calls directly. Resume upload bypasses `apiFetch` and uses raw fetch with FormData inside `api.ts`; do not set Content-Type manually. The one other `fetch` call is the Brandfetch Brand Search request in `components/CompanySearchInput.tsx`, which goes straight from the browser to Brandfetch (see Section 6b).

Auth: `useAuth()` provides `getToken()`. Every query and mutation gets a fresh token immediately before its API call. `useUserSync()` is enabled only for a loaded, signed-in Clerk user; all other queries are enabled only after that shared sync query succeeds. `useUser()` provides user display name for the greeting.

Component structure:
- `components/Sidebar.tsx` — shared across all protected pages via the protected layout: a 240px sidebar from `lg` up, and a top bar with a menu button and slide-in drawer below `lg`. The footer shows the user's avatar, name and email with a sign-out button.
- `components/BrandLogo.tsx` — orange check tile and wordmark, used by the sidebar, the landing navbar and footer
- `components/ui/` — shared UI primitives (`Button`, `Card`, `Chip`, `Tag`, `Field` inputs, `Modal`, `Tabs`, `Stepper`, `ScoreMeter`, `StatusBadge` family, `Eyebrow`, `Avatar`, `EmptyState`)
- `lib/status.ts`, `lib/dates.ts`, `lib/cn.ts` — shared status maps and color classes, date helpers, and a class joiner
- `(marketing)/` — public landing page: `layout.tsx` (navbar and footer), `page.tsx`, and `_components/` (Navbar, Footer, Hero, OldWay, Track, AiFit, FollowUp, Steps, ClosingCta, plus sample data and mockup primitives). See `docs/modules/landing.md`.
- `components/Skeleton.tsx` — neutral first-load placeholder primitive
- `components/CompanyLogo.tsx` — company logo with letter-avatar fallback, used on the board, detail page, dashboard, create form and the landing-page mockups
- `components/CompanySearchInput.tsx` — company name autocomplete on the create page, backed by the Brandfetch Brand Search API
- `providers.tsx` — QueryClient provider and development-only React Query Devtools
- Every data-driven page and the protected layout are client components (`"use client"`)
- Server components are used only for static shells with no data fetching: the root `app/layout.tsx`, the landing page `app/(marketing)/page.tsx` and its sections (only `Navbar` is a client component, for its scroll state), the sign-in page, and `components/Skeleton.tsx`
- Route protection is also enforced in `frontend/middleware.ts` (Clerk `clerkMiddleware`): every route except `/`, `/sign-in(.*)` and `/sign-up(.*)` calls `auth.protect()`

Design system: colors, radii, shadows and type are design tokens defined once under `@theme` in `app/globals.css` and used as Tailwind utilities (`bg-brand`, `text-ink`, `border-line`, `rounded-card`, `shadow-pop`, `bg-st-applied`). The brand color is orange `#F25A1D` (hover `#E04E14`), with ink `#171717`, muted `#737373`, warm borders `#EDE7E3`, a sidebar tint `#FFF8F4`, and a peach landing background `#FFD8AE`. Each status has a color, tint and text variant: Applied blue, Screening amber, Interview purple, Assignment teal, Offer green, Rejected rose. Fonts are Geist (UI), Geist Mono (eyebrows and meta), and Caveat (handwritten landing annotations), loaded with `next/font/google` in `app/layout.tsx`. The app is light-mode only; the earlier dark system-color override was removed.

Presentation of detail and create: `/applications/new` and `/applications/[id]` render the applications board and then a `Modal` on top of it. They stay real routes (shareable URLs, browser back works), and closing navigates away instead of toggling state.

Routing: `/` is the public landing page (`app/(marketing)/page.tsx`). Its calls to action go to `/sign-in`.

---

## 3. Database Design

### Schema

```
User
  id              String  @id @default(cuid())
  clerkId         String  @unique
  name            String
  email           String  @unique
  profilePicture  String?
  targetRole      String?
  experienceLevel String?
  resumeUrl       String?
  resumeText      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

Application
  id              String            @id @default(cuid())
  userId          String
  companyName     String
  companyDomain   String?
  jobTitle        String
  jobDescription  String
  status          ApplicationStatus @default(APPLIED)
  source          ApplicationSource
  dateApplied     DateTime          @default(now())
  notes           String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

StatusHistory
  id              String            @id @default(cuid())
  applicationId   String
  status          ApplicationStatus @default(APPLIED)
  createdAt       DateTime          @default(now())

ResumeAnalysis
  id              String   @id @default(cuid())
  applicationId   String   @unique
  matchScore      Int
  missingKeywords String
  strongestPoints String
  redFlags        String
  recruiterTake   String
  suggestions     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

Reminder
  id              String   @id @default(cuid())
  userId          String
  applicationId   String
  reminderDate    DateTime
  isSent          Boolean  @default(false)
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
```

### Enums

```
ApplicationStatus: APPLIED | SCREENING | INTERVIEW | ASSIGNMENT | OFFER | REJECTED
ApplicationSource: LINKED_IN | NAUKARI | REFERAL | COLDEMAIL | SOCIAL_MEDIA | OTHER_JOB_APPS
```

**Note on enum spellings:** NAUKARI, REFERAL, and COLDEMAIL are misspelled relative to their real-world counterparts (Naukri, Referral, Cold Email). These spellings are intentional legacy values from the initial migration and are preserved throughout the codebase for consistency. Correcting them would require a migration that renames existing enum values in the database. This is deferred to a future hardening pass.

### Why StatusHistory is a Separate Model

A single `status` field on Application records only the current state. It answers "where is this application now" but not "how did it get here" or "how long did it spend in each stage".

A separate StatusHistory table records every transition with a timestamp. This enables:
- Full audit trail of how an application progressed
- Duration calculations per stage (how many days in Screening before Interview)
- Dashboard analytics like response rate (applications that moved past APPLIED), and the Recent Activity feed and Activity Calendar on the dashboard
- A status history list on the application detail page

StatusHistory records are created automatically in two places:
1. When an application is created — an APPLIED record is inserted in the same transaction
2. When status is updated via `PUT /api/applications/:id` — a new record is inserted if the status value changed

This is handled in the service layer, not the controller, so the behavior is consistent regardless of where the update originates.

### Why resumeText is Stored on User

When a user uploads a PDF, pdf2json extracts the text and it is saved to `User.resumeText` alongside the Supabase Storage URL in `User.resumeUrl`.

The reason is performance: extracting text from a PDF is a blocking CPU operation. Doing it at upload time once means AI analysis requests are fast — they just read a string from the database rather than downloading and parsing a PDF on every request.

The trade-off is that if the user uploads a new resume, the old text is overwritten. The URL also points to the new file. One resume per user, always the latest. When this happens, saved ResumeAnalysis rows for that user's applications are deleted so old AI results do not survive against a new resume.

---

## 4. Authentication Architecture

### How Clerk Works End to End

```
User logs in via Google OAuth (Clerk handles this entirely)
        │
        ▼
Clerk issues a signed JWT
        │
        ▼
Frontend: useAuth().getToken() returns the token
        │
        ▼
Frontend sends: Authorization: Bearer <token> on every request
        │
        ▼
Backend: clerkMiddleware() validates the token signature
         Attaches Clerk's auth context to the request
        │
        ▼
Backend: requireUser middleware reads the Clerk userId with getAuth(req)
         Looks up the local User row by clerkId
         Attaches the local User to req.user
        │
        ▼
Controllers read req.user.id for all database queries
```

### clerkAuth vs requireUser

`clerkAuth` is `clerkMiddleware()` from the Clerk Express SDK. It runs globally on every request (`app.use(clerkAuth)` in `index.ts`). It validates the JWT and attaches Clerk's auth context to the request. It does not reject unauthenticated requests and does not touch the database.

`requireUser` is a custom middleware that runs on protected routes. It reads the Clerk userId from the request with `getAuth(req)`, returns `401 { "error": "Unauthorized" }` when there is none, queries the local User table, and attaches the result to `req.user`. If no local user is found it returns `401 { "error": "User not found. Please sync first." }`. Every route except `/health` and `POST /api/user/sync` is behind it.

### The Chicken-and-Egg Problem

`POST /api/user/sync` uses `clerkAuth` but not `requireUser`. The sync controller itself returns `401 { "error": "Unauthorized" }` when the request has no Clerk userId, and `500 { "error": "Internal server error" }` on unexpected failures.

This is intentional. When a user signs in for the first time, they exist in Clerk but not in the local database. If `requireUser` ran on the sync route, it would look for the local user, find nothing, and return 401 — making it impossible to ever create the local user.

The sync route receives the Clerk userId from the validated token, looks up the user's profile from Clerk's API, and creates the local User row if it doesn't exist. After sync completes, all subsequent requests can use `requireUser` because the local row now exists.

---

## 5. API Design Decisions

### Why GET /api/dashboard/stats is a server-side endpoint

The original reasoning was to avoid fetching all applications on the frontend just to compute counts, and to keep analytics logic ("stale" and "bestSource") on the server where other clients could reuse it. A dedicated endpoint returns only the numbers.

In the current frontend that reasoning only partly holds:

1. The dashboard page does fetch the full applications list (`useApplications()`) in addition to the stats, because it derives the pipeline strip, the stale list, Recent Activity, and the calendar from it on the client.
2. The page reads only `totalApplications` from the stats response. The stale list it shows is computed on the client, not taken from `stats.staleApplications`, so the stale rule exists in more than one place and the copies can disagree (see "Several definitions of stale" in Section 11).

The endpoint is therefore a small, cheap summary, and its other fields (`responseRate`, `rejectionRate`, `bestSource`, `staleApplications`) are reserved for a future Analytics page.

### Why statusHistory is embedded in GET /api/applications responses

The frontend needs status history to render status badges and timelines on the applications list. A separate endpoint would require a second HTTP request per application, or N+1 requests for a list. Embedding it via Prisma's `include` adds one JOIN at the database level and keeps the API surface simple.

### Why statusHistory is auto-created in the service layer

Callers of the service should not need to remember to create a StatusHistory record when they update status. Doing it automatically in the service guarantees the invariant: every status change has a corresponding history record. This is the same reason database triggers exist — enforce invariants close to the data, not at the call site.

### Why resume upload uses multipart/form-data

Binary file data cannot be sent as JSON. The standard approach for file uploads over HTTP is multipart/form-data, which allows binary payloads alongside text fields. The `multer` middleware handles parsing on the backend. The frontend uses the native `FormData` API.

The Content-Type header must not be set manually on the frontend for multipart requests — the browser sets it automatically with the correct multipart boundary. Setting it manually removes the boundary and breaks parsing.

### Why userId is never sent from the frontend

Any data sent from the client can be tampered with. If the frontend sent a userId in the request body, a malicious user could send any userId and read or modify another user's data.

The userId is derived exclusively from the Clerk JWT on the backend. The `requireUser` middleware validates the token, looks up the corresponding local user, and attaches it to `req.user`. Controllers always read `req.user.id` — never `req.body.userId` or `req.params.userId`.

---

### Client-side data fetching and caching

`qk` builds keys that include the Clerk user ID: `user-sync`, `profile`, `applications`, individual `application`, `dashboard-stats`, and `resume-analysis` keys. User-scoped keys prevent one signed-in user's cached server data from being addressed as another user's data.

`Providers` creates one QueryClient for the browser session. Queries are fresh for 60 seconds, garbage-collected after five minutes, refetch on window focus, and retry once; mutations do not retry. The user-sync query is fresh indefinitely. Other server-data hooks wait until that sync query succeeds, so protected requests are not issued before the local user exists.

Mutation cache handling is explicit: creating an application invalidates applications and dashboard stats; updating one writes its detail result, then invalidates applications and stats; moving one on the board (`useMoveApplication`) first moves it optimistically in the applications cache and rolls that one application back on failure, then does the same detail write and invalidations as an update; deleting one removes its detail and analysis entries, filters it from the applications cache, and invalidates stats. Resume analysis writes its returned analysis to the matching key. Profile updates write their returned user to the profile key. Resume upload writes the returned resume fields into the profile key and replaces every cached resume analysis for that user with `null`. The sidebar clears the whole QueryClient before Clerk sign-out.

Application detail uses the matching item from the applications cache as placeholder data while its detail query resolves. Forms initialize editable fields once from fetched data, so a refetch does not overwrite typing. On the detail page, status changes wait for the mutation response rather than applying an optimistic update; only the board's drag-and-drop (`useMoveApplication`) updates the cache optimistically. Skeletons represent an initial load only, while cached or placeholder data remains visible during a refetch.

---

## 6. AI Integration

### Resume Analysis

The AI module is centered on resume-to-job fit analysis, with one saved ResumeAnalysis row per application.

The service fetches two pieces of data from the database before producing an analysis:
- `User.resumeText` — the full extracted text of the user's resume
- `Application.jobDescription` — the job description for the specific application

Missing keywords are computed locally before the Gemini call. The backend extracts normalized keywords from the job description, removes common stop words, compares them against the lowercased resume text, and caps the missing keyword list at 10 items. This keeps deterministic keyword detection out of the LLM call.

Gemini is used only for the judgment-heavy parts of the analysis. The prompt asks for exactly this JSON structure:

```
You are an expert technical recruiter.

Analyse this resume against the job description for a [experienceLevel] applying for a [targetRole] role at [companyName].

Return ONLY a JSON object with exactly this structure:
{
  "matchScore": <number between 0 and 100>,
  "strongestPoints": <array of 2-4 strings>,
  "redFlags": <array of 1-3 strings>,
  "recruiterTake": <single sentence string>
}

matchScore: how well the resume matches the job description.
strongestPoints: what in the resume aligns well with this JD.
redFlags: specific gaps or concerns a recruiter would notice.
recruiterTake: one honest sentence summarising how a recruiter would view this resume for this role.

Return ONLY the JSON object. No explanation, no markdown, no extra text.

RESUME:
[resume text]

JOB DESCRIPTION:
[job description]
```

`[experienceLevel]` falls back to `fresher` and `[targetRole]` to `software` when the profile fields are empty. The response is cleaned of markdown fences, parsed as JSON, and checked for the expected shape (`matchScore` is a number, `strongestPoints` and `redFlags` are arrays, `recruiterTake` is a string). The parsed Gemini result is combined with the locally computed missing keywords, then saved through a Prisma upsert:

- `matchScore` is stored as an integer.
- `missingKeywords`, `strongestPoints`, `redFlags`, and `suggestions` are stored as JSON strings because the Prisma model uses `String` columns for those fields.
- Both `POST /api/ai/analyze-resume` and `GET /api/ai/resume-analysis/:appId` parse all four JSON strings back into arrays. The frontend does not read `suggestions`.
- `suggestions` currently stores `[]` and is reserved for future expansion.
- Expected failures use `AppError`: no resume or no job description is `400`, an unknown application is `404`. Any Gemini failure (network error, bad API key, overload, invalid JSON, wrong shape) is logged server-side and returned as `503 "AI analysis is temporarily unavailable. Please try again in a moment."`; the Gemini error text never reaches the client.

### Why ResumeAnalysis Is Saved

The analysis result is saved because it is shown on the application detail page and should survive refreshes without another Gemini call. The `applicationId` field is unique, so each application has at most one saved analysis. Running analysis again overwrites the previous row with fresher output.

### Invalidating Analysis After Resume Upload

ResumeAnalysis depends on `User.resumeText`. When a user uploads a new resume, the backend deletes all ResumeAnalysis rows for that user's applications before updating the resume URL and text. This keeps the frontend from showing analysis generated against an older resume.

---

## 6b. Company Logos

Application cards show the company's logo. Two Brandfetch APIs are involved, both authenticated with the same public client ID (`NEXT_PUBLIC_BRANDFETCH_CLIENT_ID`).

| API | Input | Used in | Runs when |
|---|---|---|---|
| Brand Search | Typed company name | `CompanySearchInput` on the create page | While typing, after 2+ characters and a 300 ms pause |
| Logo API | Domain, e.g. `zomato.com` | `CompanyLogo` on the board, detail page, dashboard, and the landing-page mockups (hard-coded sample domains) | Whenever a card for an application with a stored domain renders |

### Flow

1. The user types a company name. The dropdown shows up to 5 matches with name, domain, and a small icon.
2. Picking a match sets `companyName` and `companyDomain` in the form and shows the logo inside the input. Typing again clears the domain.
3. `POST /api/applications` stores `companyDomain`, a nullable column on `Application`.
4. `CompanyLogo` builds `https://cdn.brandfetch.io/{domain}/icon?c={clientId}`. It falls back to a letter avatar when there is no domain, no client ID, or the image fails to load.

### Decisions

- **Only the domain is stored, not the logo URL.** The URL is built at render time, so the provider can be changed later without touching the database.
- **Brandfetch is called from the browser, not through the Express backend.** Brandfetch's guidelines say search requests should come from the user's browser and logo links should be embedded directly. The client ID is a public identifier, not a secret.
- **A plain `<img>` is used instead of `next/image`,** so the logo link stays embedded directly as Brandfetch's guidelines require.
- **Free-text company names still work.** Not picking a suggestion stores no domain and the card shows a letter avatar.
- **Letters are the permanent fallback,** not an edge case. Some companies will never have a logo.

---

## 7. Email and Cron Architecture

### Cron Job

node-cron runs inside the Express process. The scheduler is started when the server starts by calling `startReminderJob()` in `index.ts` after `app.listen`.

The job schedule is `"0 9 * * *"` — 9am daily in the server's timezone. The date range query uses UTC:

```ts
today.setUTCHours(0, 0, 0, 0)
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
```

This is critical. Using local `setHours` caused timezone mismatches where reminders stored as UTC midnight were not found by a query scoped to the local day.

The query finds all Reminder records where:
- `reminderDate` is within today's UTC date range
- `isSent` is false

After sending each email, the record is updated with `isSent: true`. This prevents duplicate sends if the job runs again (which it shouldn't, but the field guards against edge cases). Each send is wrapped in its own try/catch, so one failed email does not stop the others, and the whole callback is wrapped in a try/catch so a failure in the initial reminder query is logged instead of becoming an unhandled rejection. `PUT /api/reminders/:id` does not reset `isSent`, so a reminder that was already sent and then rescheduled is never sent again.

### Why node-cron Instead of an External Scheduler

At the current deployment scale (single Railway instance), running the cron job inside the process is simpler and has no operational overhead. External schedulers like Vercel Cron, AWS EventBridge, or GitHub Actions would require additional infrastructure, credentials, and HTTP endpoints to trigger.

The trade-off is that if the server is down at 9am, reminders for that day are missed. This is acceptable for a personal-scale application. At production scale with SLA requirements this would need to move to an external scheduler.

### Resend

The Resend SDK sends transactional email via their REST API. The `from` address is read from the `RESEND_FROM_EMAIL` environment variable (`backend/src/utils/email.ts`); it is not hardcoded. The domain `applyntrack.online` was verified on Resend by adding DKIM, SPF, and DMARC DNS records on Hostinger.

The subject is `Reminder — {jobTitle} at {companyName}`, and the body greets the user with their full stored name. Emails are sent as HTML with inline styles. The name, job title, company name, and note are inserted into the HTML without escaping. The email's header and accent colors are indigo (`#4F46E5`), not the app's orange. A plain `text` fallback is not currently included — email clients that don't render HTML will see nothing. This is a known gap.

---

## 8. File Storage

### Why Supabase Storage

Supabase Storage was chosen because the project was already using Supabase for PostgreSQL. Introducing a second file storage vendor (S3, Cloudinary) would add credentials, SDK setup, and operational complexity without benefit at this scale.

Files are stored in a public bucket named `resumes`. Each user's file is stored at path `{userId}/resume.pdf`. This ensures no filename collisions between users and makes it trivial to find or delete a user's resume.

`upsert: true` is set on upload, which overwrites the file if it already exists. This supports the use case of re-uploading an updated resume without leaving orphaned files.

The bucket is public, so anyone with a resume URL can read the file. `multer` is configured with memory storage and a 5 MB file-size limit. A file over the limit is rejected by the global error handler as `413 "File is too large. Maximum size is 5 MB."`, and other multer errors become `400 "Invalid file upload"`. The controller also rejects PDFs that `pdf2json` cannot parse and PDFs with no extractable text (both `400`) before anything is uploaded to storage.

### pdf2json

`pdf-parse` was the first choice but failed with `TypeError: pdfParse is not a function` due to a CommonJS/ESM export mismatch with the project's module configuration. `pdf2json` was used as a replacement.

pdf2json parses the PDF binary structure and exposes page and text data. The text is extracted by iterating over `pdfData.Pages`, then `page.Texts`, then `textItem.R`, URL-decoding each text fragment and concatenating with spaces.

`getRawTextContent()` was also tried but returned empty strings. The manual page traversal method works reliably.

The extracted text is stored in `User.resumeText`. It is not cleaned or normalized — it is stored as-is including spacing artifacts from the PDF layout engine.

---

## 9. Key Architectural Decisions and Trade-offs

| Decision | Choice Made | Alternative Considered | Reason |
|---|---|---|---|
| Auth system | Clerk | Custom JWT with Google OAuth | Custom auth would require implementing token signing, refresh, revocation, and session management. Clerk handles all of this plus Google OAuth in under 30 minutes of setup. |
| ORM | Prisma | Drizzle, raw SQL | Prisma generates TypeScript types from the schema. This makes field name errors compile errors rather than runtime errors, which matters for a solo project with no tests. |
| Database host | Supabase | Railway PostgreSQL, Neon | Supabase provides both the database and file storage under one dashboard, reducing vendor count. |
| PDF text extraction | pdf2json | pdf-parse, pdfjs-dist | pdf-parse failed due to module export issues. pdf2json worked after switching to manual page traversal. |
| AI model | gemini-3.6-flash | gemini-1.5-flash, gpt-4o | Earlier Gemini models returned 404 at the time of development. OpenAI would require a separate API key and has different pricing. Gemini was already chosen as the vendor so the model was selected by availability. |
| Cron scheduler | node-cron | Vercel Cron, external HTTP trigger | node-cron runs in-process with zero operational overhead. Acceptable for single-instance deployment. |
| Email provider | Resend | SendGrid, Nodemailer + SMTP | Resend has a simpler API than SendGrid and doesn't require SMTP configuration like Nodemailer. |
| File storage | Supabase Storage | AWS S3, Cloudinary | Already using Supabase. No second vendor needed. |
| Company logos | Brandfetch Logo API + Brand Search API, with the domain stored in `Application.companyDomain` | Clearbit Logo API, Logo.dev, Google favicon service | The Clearbit Logo API has been shut down. Brandfetch's free tier needs no attribution and returned logos for the large Indian companies tested. Only the domain is stored, so the provider can be swapped without a migration. |
| Client data fetching | TanStack Query v5 with user-scoped query keys | SWR, React context, module-level cache | The provider keeps one browser-session QueryClient; key factories, mutation cache updates and invalidation, and Devtools fit the application's query and mutation flows. |
| Monolith vs microservices | Monolith | Microservices | The application has one developer, one deployment target, and no scaling requirements that justify microservices. A monolith is faster to build, debug, and understand. |

---

## 10. What Was Intentionally Left Out

### Zod Input Validation

There is no schema validation of request bodies. Controllers check only a few required fields by hand (`companyName`, `jobTitle` and `source` on create application; `applicationId` on analyze; `applicationId` and `reminderDate` on create reminder; `reminderDate` on update reminder). Everything else, including enum values and dates, relies on Prisma rejecting bad values, which the global error handler returns as `400 "Invalid request data"`. Zod schemas for each endpoint's request body are planned for the hardening phase.

### Automated Tests

No unit tests, integration tests, or end-to-end tests exist in either project, and neither `package.json` has a test script. The application was tested manually in Postman during development. Tests are required before the codebase is considered production-ready.

### Mobile App

No native mobile app. The web frontend is responsive: the landing page has mobile layouts, and inside the app the sidebar collapses into a top bar with a menu drawer below the `lg` breakpoint. The applications board scrolls horizontally on narrow screens and supports touch drag-and-drop with a press-and-hold.

### Collaborative Features

One user per account. No sharing, teams, or multi-user workspaces. The data model would require significant changes to support collaboration.

### Resume Builder

ApplynTrack stores and analyzes resumes but does not generate or edit them. A resume builder is a separate product category.

### Microservices

The application is a monolith by design. At the current scale, the operational overhead of microservices would cost more than the benefits gained.

### UI Polish

The frontend follows the redesigned ApplynTrack visual system (orange `#F25A1D` accent, Geist type, tokenized colors). The implementation is documented in `docs/modules/`.

---

## 11. Known Technical Debt

### Global error handling and logging

The backend has a global Express error handler (`backend/src/middleware/errorHandler.ts`) and a JSON `404 { "error": "Route not found" }` handler for unknown routes, both registered after all routes in `index.ts`. Service-layer and controller errors are thrown as `AppError` (`backend/src/utils/AppError.ts`, with helpers `badRequest`, `unauthorized`, `notFound`, `conflict` and `serviceUnavailable`) carrying an explicit status code. Express 5 forwards rejected async handlers to the error handler, so controllers contain no try/catch. Prisma validation errors (400 `"Invalid request data"`), known Prisma request codes (P2025 → 404, P2002 → 409, P2003 → 400), multer errors (`LIMIT_FILE_SIZE` → 413 with the 5 MB message, others → 400 `"Invalid file upload"`), and malformed JSON (400 `"Invalid JSON in request body"`) all map to safe client messages. Anything else returns `500 { "error": "Internal server error" }` — raw Prisma, Gemini, and stack traces never reach the client. `requireUser` and `/health` respond directly rather than through the handler, with the same `{ "error": ... }` shape for the 401s.

Logging uses Pino (`backend/src/config/logger.ts`) with `pino-http` for per-request logs. Every request gets a request id: an incoming `X-Request-Id` header is reused, otherwise a UUID is generated, and it is echoed as the `X-Request-Id` response header and attached to every log line for that request. The request log records only the id, method, URL and remote address; the `Authorization` and `Cookie` request headers are redacted and request bodies are never logged. Errors with status 500 or higher are logged at `error` level with the error object; lower statuses are logged at `warn`. The `LOG_LEVEL` environment variable controls the level (default `info`); `pino-pretty` output is used outside `NODE_ENV=production`, plain JSON in production.

Process-level handlers in `index.ts` log `unhandledRejection` at error level and `uncaughtException` at fatal level before exiting with code 1 so Railway restarts the process. The reminder cron callback is wrapped in a top-level try/catch so a database failure cannot become an unhandled rejection, and each per-reminder send is still isolated in its own try/catch.

CORS allows the origin in `CLIENT_URL` (default `http://localhost:3000`) with credentials.

### Remaining debt

**Limited input validation**
Only the manual required-field checks listed in Section 10 exist. Prisma rejects type mismatches, bad enum values and invalid dates, and the client sees a generic `400 "Invalid request data"` with no field detail.

**No automated tests**
Neither project has tests or a test script.

**Resume upload: PDF mimetype trust**
The 5 MB limit, parse failures and empty-text PDFs are all rejected with explicit messages, but the PDF check still trusts the client-declared mimetype.

**Build output and generated Prisma client in the repo**
`backend/dist/` and `backend/src/generated/prisma/` exist in the repository tree. `backend/.gitignore` lists `/generated/prisma` (not the real path `src/generated/prisma`) and no `.gitignore` excludes `dist`. The root `.gitignore` lists `node_modules` but not `.env*`; `backend/.gitignore` ignores `.env` and `frontend/.gitignore` ignores `.env*`.

**Several definitions of "stale"**
The backend stat (`APPLIED` and `dateApplied` strictly more than 14 days ago, server local time), the dashboard page (`APPLIED` and whole days since `dateApplied` at least 14), the Applications board header count (`APPLIED` and elapsed time since `dateApplied` at least 14 days), the board's per-card `QUIET` label (any status, days since the last status change at least 14), and the PRD (no status change in fourteen plus days) each define it slightly differently, so the numbers can disagree.

**Local API URL fallback**
`frontend/app/lib/api.ts` falls back to `http://localhost:5000` when `NEXT_PUBLIC_API_URL` is missing, and `frontend/next.config.ts` contains a localhost API rewrite for `/api/*`. Production deployment should provide the environment variable and review the rewrite so frontend API traffic points at the deployed backend.

**Reminders**
The reminder email HTML does not escape user text, `PUT /api/reminders/:id` does not reset `isSent`, and the client helpers `updateReminder` and `deleteReminder` (and the `Reminder` type) are defined in the frontend but unused. There is no list-reminders endpoint, so the UI cannot show, edit or delete existing reminders.

**Unused backend packages and a personal ngrok host**
`axios`, `jsonwebtoken`, `@types/jsonwebtoken` and `@types/pdf-parse` are not used by the backend source, and `frontend/next.config.ts` lists a personal ngrok host in `allowedDevOrigins`.

**Unreachable branch and the sign-up route**
`getProfileController` has a `404 User not found` branch that `requireUser` makes unreachable. `/sign-up(.*)` is a public route in `frontend/middleware.ts`, but the frontend has no sign-up page; how new users register was not verified.

**Next.js middleware file convention**
`next build` warns that the `middleware` file convention is deprecated in Next.js 16 in favor of `proxy`. `frontend/middleware.ts` still works but uses the old name.

**resumeText stored as raw extracted text**
The text extracted from PDFs includes spacing artifacts and layout noise from the PDF engine. This is sent directly to Gemini without cleaning. It works in practice but cleaner text would produce better AI results.

**ApplicationSource enum misspellings**
NAUKARI, REFERAL, and COLDEMAIL are misspelled in the initial migration. Correcting them requires a migration that renames enum values in PostgreSQL, which requires explicit SQL (`ALTER TYPE ... RENAME VALUE`). Prisma's migration system does not generate this automatically. Deferred.

**pdf2json text traversal**
The PDF text extraction uses a manual traversal of `pdfData.Pages[].Texts[].R[]` because `getRawTextContent()` returned empty strings. This is a workaround for an undocumented behavior of pdf2json and may break on different PDF structures.

**Company logos: existing applications have no domain**
Applications created before `companyDomain` was added have `NULL` and show letter avatars. There is no UI to edit a domain on an existing application. The backend controller converts a falsy submitted `companyDomain` to `undefined`, so a stored domain cannot be cleared through that endpoint.

**Company logos: coverage and the client ID**
Logo and search coverage was checked only on a small set of well-known companies. Smaller companies may be missing from Brandfetch and fall back to a letter avatar. The client ID ships to the browser and is visible in page source.
