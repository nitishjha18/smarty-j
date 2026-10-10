# ApplynTrack: Before Beta Checklist

**Last updated:** October 11, 2026
**Readiness estimate:** ~70/100 for a small closed beta (10 to 30 users), ~50/100 for a public launch
**Target before inviting anyone:** 85/100, which means every **P0** item below is done and verified
**Basis:** this estimate comes from the project docs (PRD, architecture, module specs), not from reading the backend code. Items marked **(verify)** need a check in the actual code.

**Priority legend**
- **P0:** blocker. Do not invite real users until it is done.
- **P1:** should fix before beta. Acceptable to ship with only if you accept the risk knowingly.
- **P2:** nice to have. Fine to do during or after beta.

---

## 0. Pre-requisite: finish the current work

- [ ] Merge the TanStack Query branch (`feat/tanstack-query`) after `npx tsc --noEmit`, `npm run lint` and `npm run build` pass
- [ ] Manually verify the 7 checks from the Codex prompt using `npm run build && npm run start` (not dev mode)
- [ ] Check every page's first-load skeleton for layout jumps and tweak where needed

---

## 1. Fix before beta (the ~30% gap)

### 1.1 Global error handler and crash protection (P0, ~2 hrs)
**Why:** each controller has its own try/catch and there is no central handler, so an error outside a try/catch can crash the server and take every user down.

- [ ] Add an Express error-handling middleware at the end of `index.ts`, after all routes: `app.use((err, req, res, next) => { ... })`
- [ ] Return a consistent JSON shape: `{ "error": "Internal server error" }` with the right status code, and never leak stack traces in production
- [ ] Log the error server-side with context (route, userId, not resume text)
- [ ] Add `process.on("unhandledRejection")` and `process.on("uncaughtException")` handlers that log
- [ ] Wrap the body of the cron job callback in try/catch so one failed email can't kill the job or the process
- [ ] Add a 404 handler for unknown routes
- [ ] Confirm Railway's restart policy restarts the service on crash

### 1.2 Input validation with Zod (P0, ~3 to 4 hrs)
**Why:** no request-body validation exists. Invalid enum values or missing fields reach Prisma and produce unhelpful errors.

- [ ] Add `zod` to the backend
- [ ] Create a small `validate(schema)` middleware that returns `400` with a readable message
- [ ] Schemas for each endpoint:
  - [ ] `POST /api/applications`: `companyName`, `jobTitle` non-empty with a max length, `source` is a valid `ApplicationSource`, `dateApplied` a valid date, `jobDescription` and `notes` with max lengths
  - [ ] `PUT /api/applications/:id`: all optional, same constraints, `status` is a valid `ApplicationStatus`
  - [ ] `PUT /api/user/profile`: `name`, `targetRole`, `experienceLevel` strings with max lengths
  - [ ] `POST /api/ai/analyze-resume`: `applicationId` is a string
  - [ ] `POST /api/reminders` and `PUT /api/reminders/:id`: valid date, and the date must not be in the past
- [ ] Keep the legacy enum spellings (`NAUKARI`, `REFERAL`, `COLDEMAIL`) exactly as they are in the schemas
- [ ] Add multer limits on resume upload (see 1.5)

### 1.3 Production configuration (P0, ~2 to 3 hrs)
**Why:** the frontend currently falls back to `http://localhost:5000` and `next.config.ts` contains a localhost rewrite. In production this can silently point users at the wrong place or fail.

- [ ] Set `NEXT_PUBLIC_API_URL` in Vercel to the Railway backend URL
- [ ] Remove the `localhost` fallback in `frontend/app/lib/api.ts`, or make it throw in production so a missing variable fails loudly
- [ ] Review and remove or env-gate the localhost rewrite in `frontend/next.config.ts`
- [ ] Set backend `CLIENT_URL` to the deployed frontend URL and make sure CORS allows only that origin
- [ ] **Clerk:** create the Production instance, add production keys to Vercel and Railway, and set up your own Google OAuth credentials for production (dev keys will not work for real users)
- [ ] Add your production domain to Clerk's allowed origins and redirect URLs
- [ ] `.gitignore` must cover `.env*`, `dist`, `node_modules`, and generated Prisma files; run `git ls-files | grep -i env` to confirm no env file is tracked
- [ ] If any secret was ever committed, rotate it (Gemini, Resend, Supabase service role, Clerk)
- [ ] Use `npx prisma migrate deploy` in the Railway deploy step (not `migrate dev`)
- [ ] Use the pooled `DATABASE_URL` for the app and `DIRECT_URL` for migrations (Supabase)
- [ ] The Supabase service role key lives only in the backend environment, never in the frontend
- [ ] All secrets come from environment variables in every environment
- [ ] `/health` is reachable, and Railway's health check points at it

### 1.4 Reminder cron: timezone and reliability (P0, ~2 hrs)
**Why:** `0 9 * * *` runs in the server's timezone, and Railway servers are typically UTC, so "9 AM" emails could arrive around 2:30 PM IST. Missed days are also never retried.

- [ ] Pin the schedule timezone: `cron.schedule("0 9 * * *", job, { timezone: "Asia/Kolkata" })`
- [ ] Decide on and document the date semantics. Reminder dates are stored as UTC midnight of the picked date, and the job queries by UTC date range
- [ ] Add catch-up: also send reminders where `reminderDate <= today (UTC)` and `isSent = false`, so a missed 9 AM (server down or restarting) is still sent later
- [ ] Mark `isSent` per reminder right after a successful send, and keep one failed email from blocking the rest
- [ ] Run a single backend instance. Two replicas would run the cron twice and send duplicate emails (or add a lock first)
- [ ] Add a plain-text fallback to the Resend email (currently HTML only)
- [ ] Test end to end: create a reminder for today and trigger the job manually, then confirm the email arrives and `isSent` flips
- [ ] Check the email lands in the inbox, not spam (Gmail, Outlook), using the verified `applyntrack.online` domain

### 1.5 Resume privacy and upload safety (P0, ~3 to 4 hrs)
**Why:** resumes contain names, phone numbers, emails and addresses. They currently sit in a **public** Supabase bucket, so anyone with the URL can open one.

- [ ] Make the `resumes` bucket **private**
- [ ] Store the storage path (`{userId}/resume.pdf`), not a permanent public URL
- [ ] Generate short-lived signed URLs (`createSignedUrl`) when the user clicks "View current resume"
- [ ] Update the frontend "View current resume" link to fetch a signed URL on demand
- [ ] Add multer `limits: { fileSize: 5 * 1024 * 1024 }` (5 MB) and a clear error message
- [ ] Validate the PDF server-side (check the `application/pdf` mimetype and the `%PDF` magic bytes), not just the client-side check
- [ ] Reject or clearly flag a resume that extracts **empty text** (scanned or image-only PDFs), with a message like "We couldn't read text from this PDF"
- [ ] Do not log resume text or full user objects anywhere
- [ ] Add a way to delete a user's resume and data on request (see section 5)

### 1.6 AI quota, rate limiting and failure handling (P0, ~3 hrs)
**Why:** `analyze-resume` has no limit, and a few users could exhaust Gemini's free tier or run up cost. The model name was also chosen by availability, so deprecations can break it.

- [ ] Add per-user limits on `POST /api/ai/analyze-resume` (for example, 10 analyses per day), stored in the DB or with `express-rate-limit` keyed by `req.user.id`
- [ ] Add a general rate limit on all API routes (per IP and per user)
- [ ] Add a timeout to the Gemini call
- [ ] Handle Gemini errors (429 quota, 404 model not found, malformed JSON) and return a friendly message instead of a 500
- [ ] Handle invalid JSON from Gemini (retry once, then fail gracefully)
- [ ] Move the model name (`gemini-3.6-flash`) to an environment variable so you can switch without a redeploy
- [ ] Set a spending or quota alert in Google Cloud and confirm what the free-tier limits are
- [ ] Truncate very long job descriptions and resume text before sending to Gemini
- [ ] Show the user a clear "daily limit reached" message in the AI tab

### 1.7 Monitoring and error tracking (P0, ~2 hrs)
**Why:** without it, you only find out about failures when a user tells you.

- [ ] Add Sentry (or similar) to the frontend and backend
- [ ] Add an uptime monitor on the backend `/health` and the frontend URL (UptimeRobot or Better Stack, both have free tiers)
- [ ] Check that Railway logs are retained and searchable
- [ ] Add basic request logging (method, path, status, duration, and no sensitive bodies)
- [ ] Watch the Resend dashboard for bounces and failures
- [ ] Decide who gets alerted, and how (email or WhatsApp)

---

## 2. Security checklist

- [ ] **Data isolation test:** log in as user A, then try to read, update and delete user B's application, reminder and analysis by ID. Every attempt must return 404. Verify that **every** Prisma query is scoped by `req.user.id` **(verify)**
- [ ] Add `helmet` to the Express app
- [ ] CORS locked to the production frontend origin only
- [ ] Run `npm audit` on both projects and fix high and critical issues
- [ ] The Clerk secret key and service role key exist only in server environments
- [ ] No `console.log` of tokens, resume text or emails in production code
- [ ] Confirm `requireUser` protects every route except `/health` and `/api/user/sync`
- [ ] Prisma queries only (no raw SQL with user input)
- [ ] Set the request body size limit on `express.json()`
- [ ] Review Supabase: backups on, database password rotated, no public tables exposed through the Supabase API that you don't use

---

## 3. Deployment checklist

- [ ] **Staging environment:** separate Vercel preview, Railway service and Supabase project (or at least a separate database), so you never test on real users' data
- [ ] Frontend deployed on Vercel with a production build passing
- [ ] Backend deployed on Railway with a start command that runs migrations safely
- [ ] Custom domain and HTTPS set up (frontend, and API if you use a custom domain)
- [ ] Resend domain verified (DKIM, SPF and DMARC records) and `RESEND_FROM_EMAIL` set
- [ ] Clerk production instance connected to Google OAuth
- [ ] All environment variables set for production on both platforms (compare against the README lists)
- [ ] Database backups enabled and one restore tested
- [ ] **Rollback plan written down:** Vercel instant rollback, Railway redeploy of the previous build, and a DB backup taken before any migration
- [ ] Cold-start check: how long does the first request take after Railway idles? (if slow, note it for users or upgrade the plan)

---

## 4. Product and UX before real users

### P1
- [ ] **Mobile / small screens:** the fixed 220px sidebar and `h-screen` layout will break on phones, and freshers will open the app on phones. At minimum, add a collapsible sidebar or bottom nav, or show a clear "best on desktop" notice
- [ ] **Onboarding:** first-time users need a nudge to set target role and **upload a resume** (AI analysis is useless without it). Add a short checklist or banner on the dashboard
- [ ] **Error and not-found pages:** add `not-found.tsx` and `error.tsx` for friendly failures
- [ ] **Session expiry:** make sure an expired Clerk session redirects to sign-in instead of showing a broken page
- [ ] **PRD vs reality:** the PRD promised a Kanban board with drag-and-drop and source analytics. The built list view and simplified dashboard differ. Decide whether those are deferred on purpose, and update the PRD or build them
- [ ] **Feedback channel:** add an in-app "Send feedback" link (a Google Form is enough) so beta users can report issues
- [ ] Meaningful page titles, favicon and basic meta tags

### P2
- [ ] Search, filter and pagination on the applications list
- [ ] Reminders: add a list endpoint plus UI to view, edit and delete existing reminders (replace the placeholder "Upcoming reminders" card)
- [ ] Confirm the company logo feature (Brandfetch) has a good fallback when a logo is missing and fits within its rate and usage limits
- [ ] Accessibility pass: labels on inputs, alt text, keyboard focus, color contrast
- [ ] Product analytics (PostHog or Vercel Analytics) to see which features are actually used
- [ ] Toasts for success and error feedback, instead of inline text only
- [ ] Empty-state copy review across pages

---

## 5. Legal and trust (needed once real people's data is involved)

- [ ] **Privacy Policy** page. Cover what you store (name, email, resume PDF and text, applications), that resume text is sent to Google's Gemini for analysis, Clerk for auth, Supabase for storage and Resend for email
- [ ] **Terms of Service** page (short is fine for beta)
- [ ] Link both from the sign-in page and the app footer
- [ ] **Data deletion:** a way for a user to delete their account, resume and all applications (even if it starts as "email us and we'll delete it within 7 days")
- [ ] A visible contact email for support and privacy requests
- [ ] Short consent line near the resume upload ("Your resume text is processed by AI to generate analysis")
- [ ] Tell beta users clearly that this is a beta and data could change

---

## 6. Testing checklist

### 6.1 Full-flow manual test (fresh Google account, on staging)
- [ ] Sign up with Google, and confirm the local user is created (no sync error)
- [ ] Set profile: name, target role, experience level
- [ ] Upload a resume and confirm text extraction works
- [ ] Create an application with a job description, and one without
- [ ] Change status through all stages, and confirm history and dashboard update
- [ ] Add and save notes; reload the page; confirm they persist
- [ ] Run AI analysis; reanalyze; confirm the saved result survives a refresh
- [ ] Upload a **new** resume and confirm old analyses are cleared
- [ ] Create a reminder for today and confirm the email arrives
- [ ] Delete an application and confirm no error flash
- [ ] Sign out and sign in with a **different** account and confirm no data from the first account shows

### 6.2 Resume parsing test (pdf2json is a known weak point)
- [ ] Test 8 to 10 real, different resumes:
  - [ ] Single column and two column
  - [ ] Canva or designed resumes
  - [ ] Word-exported and Google Docs-exported PDFs
  - [ ] Scanned or image-only PDF (should give a clear error)
  - [ ] Long (3+ pages) and very short
  - [ ] Resumes with special characters or non-English names
- [ ] Confirm extracted text is good enough for sensible AI scores and missing keywords

### 6.3 Compatibility
- [ ] Chrome, Safari, Firefox, Edge on desktop
- [ ] Chrome (Android) and Safari (iOS) on phones
- [ ] Slow network (throttle to "Fast 3G") to check loading states

### 6.4 Edge cases
- [ ] Very long company names, job titles and job descriptions
- [ ] Special characters and emoji in text fields
- [ ] Dates around midnight IST to check reminder dates
- [ ] Two browser tabs open at once (stale data and the 60-second cache window)
- [ ] Backend down (frontend should show a friendly error, not a blank screen)

### 6.5 Automated tests (P2 for beta, P1 soon after)
- [ ] A few backend integration tests for auth isolation and application CRUD
- [ ] A GitHub Actions workflow running `tsc --noEmit`, `lint` and `build` on every PR

---

## 7. Launch plan

**Stage 1: Staging sign-off**
- [ ] All P0 items done and ticked
- [ ] Full-flow test and resume test passed on staging

**Stage 2: Inner circle (5 to 10 people)**
- [ ] Invite classmates and friends who will give honest feedback
- [ ] Watch Sentry, Railway logs and the Resend dashboard daily for a week
- [ ] Fix anything that breaks before widening

**Stage 3: Wider beta (20 to 30 users)**
- [ ] Collect feedback through the in-app link
- [ ] Review AI usage and cost
- [ ] Review the reminder delivery rate

**Go / No-Go criteria for opening wider**
- [ ] No unresolved crash or data-leak bug
- [ ] Reminder emails delivered on time for several days in a row
- [ ] AI analysis success rate is high and errors are friendly
- [ ] Users can complete the core flow without help
- [ ] Costs and quotas are comfortably under limits

---

## 8. After beta (backlog)

- [ ] Optimistic status updates with TanStack Query
- [ ] Kanban board with drag-and-drop (if not built)
- [ ] Analytics page: response rate, rejection rate and best source (moved out of the dashboard on purpose)
- [ ] Fix the enum spellings (`NAUKARI`, `REFERAL`, `COLDEMAIL`) with an explicit `ALTER TYPE ... RENAME VALUE` migration, and update the frontend payloads together
- [ ] Clean the resume text before sending it to Gemini (strip PDF layout artifacts)
- [ ] Fill the `suggestions` field in resume analysis
- [ ] Move reminders to an external scheduler if you scale beyond one instance
- [ ] Server-side pagination and search
- [ ] CSV export of applications
- [ ] Rotating motivational quotes on the dashboard
- [ ] Tests and CI as a standing practice

---

## Suggested order of work

1. Merge TanStack Query (section 0)
2. 1.1 error handler, 1.2 Zod, 1.3 production config (the safety foundation)
3. 1.4 cron fix and 1.6 AI limits
4. 1.5 resume privacy and section 5 legal pages
5. 1.7 monitoring, then deploy to staging (section 3)
6. Full test pass (section 6), then Stage 2 invites
7. Mobile layout, onboarding and the feedback link, ideally before Stage 3

**Rough total for all P0 items: about 3 to 5 working days.**
