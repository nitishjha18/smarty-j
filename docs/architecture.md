# ApplynTrack — Technical Architecture

**Document location:** `docs/architecture.md`
**Last updated:** August 2026
**Author:** Nitish Jha

---

## 1. Project Overview

ApplynTrack is a full-stack web application that helps final-year students and freshers manage job applications. The target user applies to 20–50 companies simultaneously and loses track of where they are in each process.

The system solves three specific engineering problems:

1. **Structured tracking** — storing application state with a full status transition history, not just a current status field
2. **AI-assisted preparation** — sending resume text and job descriptions to a language model to produce actionable feedback and interview questions
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
| Framework | Next.js 16 (App Router) | Server components, file-based routing, built-in TypeScript support. App Router gives layout-level auth wrapping. |
| Language | TypeScript | Type safety across the frontend-backend boundary. Field name mismatches become compile errors. |
| Styling | Tailwind CSS 4 | Utility-first, no context switching between CSS files and components. |
| Auth | Clerk (`@clerk/nextjs`) | Handles Google OAuth, token issuance, session management, and route protection with minimal configuration. |

### Backend

| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js | Same language as the frontend reduces cognitive overhead. |
| Framework | Express 5 | Minimal, well-understood, explicit. No magic. Every route and middleware is visible. Alternatives like Fastify or NestJS add abstractions that aren't justified at this scale. |
| Language | TypeScript | Prisma's generated types propagate through the service layer. Type errors in DB queries are caught at compile time. |
| ORM | Prisma | Generates TypeScript types from the schema. Query builder is readable. Migration system is explicit. Raw SQL alternatives like Drizzle were considered but Prisma's generated types provide better safety for a solo project. |
| Database | PostgreSQL via Supabase | Relational model fits the data — users, applications, status history, reminders all have foreign key relationships. Supabase provides the managed PostgreSQL instance, Storage, and a dashboard for inspecting data during development. |
| Auth middleware | Clerk Express SDK | Validates Clerk-issued JWTs without implementing token verification manually. |
| AI | Google Gemini (`gemini-3.6-flash`) | Available via REST API, no self-hosting required, free tier sufficient for development. Model selected by trial — earlier models (1.5-flash, 2.0-flash) returned 404 at the time of development. |
| Email | Resend | Simple REST API for transactional email. Custom domain (applyntrack.online) verified for professional sender identity. |
| File storage | Supabase Storage | Already using Supabase for the database. Using the same platform for file storage avoids a second vendor. |
| Scheduler | node-cron | Runs inside the Express process. No external scheduler (like Vercel Cron or AWS EventBridge) required. Acceptable for a monolith deployed on a single Railway instance. |

---

## 2b. Frontend Architecture

Layout: protected routes wrapped in `app/(protected)/layout.tsx` which calls `syncUser` on mount and guards with `isLoaded`/`isSignedIn` from Clerk.

State management: plain React useState/useEffect per page. No global state, no caching layer. Each page fetches its own data on mount. The dashboard uses Promise.all for parallel fetches.

API calls: all calls go through `frontend/lib/api.ts`. No page makes raw fetch calls directly. Resume upload bypasses apiFetch and uses raw fetch with FormData — do not set Content-Type manually.

Auth: `useAuth()` provides `getToken()`. Always call fresh before each request — Clerk caches internally. `useUser()` provides user display name for the greeting.

Component structure:
- `components/Sidebar.tsx` — shared across all protected pages via the protected layout
- All pages are client components (`"use client"`)
- No server components in use currently

Design system: #FF6B35 electric orange as brand color. Inter font. Light mode only. Full token set in `docs/context.md` Section 6.

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
  status          ApplicationStatus
  createdAt       DateTime          @default(now())

AiInterview
  id              String   @id @default(cuid())
  applicationId   String
  overallScore    Int?
  overallFeedback String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

AiInterviewQuestion
  id              String   @id @default(cuid())
  aiInterviewId   String
  question        String
  userAnswer      String?
  questionNumber  Int
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
- Dashboard analytics like response rate (applications that moved past APPLIED)
- A timeline view in the UI

StatusHistory records are created automatically in two places:
1. When an application is created — an APPLIED record is inserted in the same transaction
2. When status is updated via `PUT /api/applications/:id` — a new record is inserted if the status value changed

This is handled in the service layer, not the controller, so the behavior is consistent regardless of where the update originates.

### Why resumeText is Stored on User

When a user uploads a PDF, pdf2json extracts the text and it is saved to `User.resumeText` alongside the Supabase Storage URL in `User.resumeUrl`.

The reason is performance: extracting text from a PDF is a blocking CPU operation. Doing it at upload time once means AI analysis requests are fast — they just read a string from the database rather than downloading and parsing a PDF on every request.

The trade-off is that if the user uploads a new resume, the old text is overwritten. The URL also points to the new file. One resume per user, always the latest.

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
         Attaches Clerk userId to req.auth.userId
        │
        ▼
Backend: requireUser middleware reads req.auth.userId
         Looks up the local User row by clerkId
         Attaches the local User to req.user
        │
        ▼
Controllers read req.user.id for all database queries
```

### clerkAuth vs requireUser

`clerkAuth` is `clerkMiddleware()` from the Clerk Express SDK. It runs globally on every request. It validates the JWT and attaches Clerk's auth context to the request. It does not touch the database.

`requireUser` is a custom middleware that runs on protected routes. It reads the Clerk userId from the request, queries the local User table, and attaches the result to `req.user`. If no local user is found it returns 401.

### The Chicken-and-Egg Problem

`POST /api/user/sync` uses `clerkAuth` but not `requireUser`.

This is intentional. When a user signs in for the first time, they exist in Clerk but not in the local database. If `requireUser` ran on the sync route, it would look for the local user, find nothing, and return 401 — making it impossible to ever create the local user.

The sync route receives the Clerk userId from the validated token, looks up the user's profile from Clerk's API, and creates the local User row if it doesn't exist. After sync completes, all subsequent requests can use `requireUser` because the local row now exists.

---

## 5. API Design Decisions

### Why GET /api/dashboard/stats is a server-side endpoint

The alternative is to fetch all applications on the frontend and compute the stats in JavaScript. This would work at small scale but has two problems:

1. It transfers every application record to the client just to count them. With hundreds of applications this becomes an unnecessary payload.
2. Business logic for defining "stale" (14+ days in APPLIED) and "bestSource" (source with most non-APPLIED responses) lives in the client, which means it can't be reused by other clients or tested independently.

A dedicated endpoint keeps analytics logic on the server where it belongs and returns only the numbers the frontend needs.

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

## 6. AI Integration

### Resume Analysis

The service fetches two pieces of data from the database before calling Gemini:
- `User.resumeText` — the full extracted text of the user's resume
- `Application.jobDescription` — the job description for the specific application

These are concatenated into a structured prompt:

```
You are an expert technical recruiter and career coach.
Compare the following resume against the job description and return a JSON response with exactly this structure:
{
  "matchScore": <number between 0 and 100>,
  "missingKeywords": <array of strings>,
  "suggestions": <array of strings>
}
Return ONLY the JSON object. No explanation, no markdown, no extra text.

RESUME:
[resume text]

JOB DESCRIPTION:
[job description]
```

The response is cleaned of markdown fences and parsed as JSON. The parsed result is returned directly to the frontend — it is not stored in the database.

### Interview Prep

The service sends the job description, the user's targetRole, and experienceLevel to Gemini with a prompt requesting a JSON array of 8 interview questions:

```
You are an expert technical interviewer.
Generate 8 interview questions for the following job description.
The candidate is a [experienceLevel] applying for a [targetRole] role.
Return ONLY a JSON array of strings.
```

The questions are saved to the database as AiInterviewQuestion records linked to a new AiInterview record. This is done before returning the response.

### Why Results Are Saved to the Database

Resume analysis results are NOT saved — they are recomputed on demand. This is acceptable because the input (resume + JD) is already stored and Gemini is fast enough.

Interview questions ARE saved because the user writes answers to them over time and needs to retrieve them across sessions. Recomputing questions on every visit would produce different questions, invalidating the user's saved answers.

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

After sending each email, the record is updated with `isSent: true`. This prevents duplicate sends if the job runs again (which it shouldn't, but the field guards against edge cases).

### Why node-cron Instead of an External Scheduler

At the current deployment scale (single Railway instance), running the cron job inside the process is simpler and has no operational overhead. External schedulers like Vercel Cron, AWS EventBridge, or GitHub Actions would require additional infrastructure, credentials, and HTTP endpoints to trigger.

The trade-off is that if the server is down at 9am, reminders for that day are missed. This is acceptable for a personal-scale application. At production scale with SLA requirements this would need to move to an external scheduler.

### Resend

The Resend SDK sends transactional email via their REST API. The `from` address is `reminders@applyntrack.online`. The domain `applyntrack.online` was verified on Resend by adding DKIM, SPF, and DMARC DNS records on Hostinger.

Emails are sent as HTML with inline styles. A plain `text` fallback is not currently included — email clients that don't render HTML will see nothing. This is a known gap.

---

## 8. File Storage

### Why Supabase Storage

Supabase Storage was chosen because the project was already using Supabase for PostgreSQL. Introducing a second file storage vendor (S3, Cloudinary) would add credentials, SDK setup, and operational complexity without benefit at this scale.

Files are stored in a public bucket named `resumes`. Each user's file is stored at path `{userId}/resume.pdf`. This ensures no filename collisions between users and makes it trivial to find or delete a user's resume.

`upsert: true` is set on upload, which overwrites the file if it already exists. This supports the use case of re-uploading an updated resume without leaving orphaned files.

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
| Monolith vs microservices | Monolith | Microservices | The application has one developer, one deployment target, and no scaling requirements that justify microservices. A monolith is faster to build, debug, and understand. |

---

## 10. What Was Intentionally Left Out

### Global Error Handler

Each controller has its own try/catch block. There is no centralized Express error handler (`app.use((err, req, res, next) => {})`). If an error escapes a try/catch, the server crashes. This is acceptable during development where the developer is present, but must be added before production deployment.

### Zod Input Validation

No request body validation exists. Prisma will reject fields that don't match the schema type but will not validate business rules like required fields or enum values. Invalid input can produce unhelpful Prisma error messages. Zod schemas for each endpoint's request body are planned for the hardening phase.

### Automated Tests

No unit tests, integration tests, or end-to-end tests exist. The application was tested manually in Postman during development. Tests are required before the codebase is considered production-ready.

### Mobile App

Not in scope. The frontend is a desktop web application. Responsive design was not a priority in Phase 1.

### Collaborative Features

One user per account. No sharing, teams, or multi-user workspaces. The data model would require significant changes to support collaboration.

### Resume Builder

ApplynTrack stores and analyzes resumes but does not generate or edit them. A resume builder is a separate product category.

### Microservices

The application is a monolith by design. At the current scale, the operational overhead of microservices would cost more than the benefits gained.

### UI Polish Phase (Current)

The frontend is functional end-to-end. The current phase applies a consistent design system across all pages. Brand color is #FF6B35. Pages are redesigned one at a time, orchestrated from a dedicated design session. Each page is documented in `docs/modules/` after redesign is built and tested.

---

## 11. Known Technical Debt

**Deprecated Clerk middleware** [Highest priority debt before production deployment]
`requireAuth()` from `@clerk/express` is used in `middleware/auth.ts`. Clerk's SDK has deprecated this in favor of `clerkMiddleware()` with `getAuth()`. The deprecation warning prints on every server start. The application continues to work but will break when the next major Clerk version removes `requireAuth`.

**No global error handler**
Unhandled promise rejections and thrown errors outside try/catch blocks will crash the server. This is a reliability risk in production.

**No input validation**
All endpoints accept arbitrary JSON bodies. Prisma rejects type mismatches but does not enforce required fields or valid enum values at the application layer.

**Hardcoded API URL in frontend**
`frontend/app/dashboard/page.tsx` calls `http://localhost:5000/api/user/sync` directly. This will fail in any environment other than local development. The API client abstraction in `frontend/lib/api.ts` must replace all direct fetch calls before deployment.

**resumeText stored as raw extracted text**
The text extracted from PDFs includes spacing artifacts and layout noise from the PDF engine. This is sent directly to Gemini without cleaning. It works in practice but cleaner text would produce better AI results.

**ApplicationSource enum misspellings**
NAUKARI, REFERAL, and COLDEMAIL are misspelled in the initial migration. Correcting them requires a migration that renames enum values in PostgreSQL, which requires explicit SQL (`ALTER TYPE ... RENAME VALUE`). Prisma's migration system does not generate this automatically. Deferred.

**pdf2json text traversal**
The PDF text extraction uses a manual traversal of `pdfData.Pages[].Texts[].R[]` because `getRawTextContent()` returned empty strings. This is a workaround for an undocumented behavior of pdf2json and may break on different PDF structures.
