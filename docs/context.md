# ApplynTrack — Project Context & Handover

## 1. What This Project Is

ApplynTrack is a full-stack job application tracker for final-year students and freshers who apply to many companies at once and need a structured way to track application status, resume tailoring, interview preparation, and follow-ups instead of relying on spreadsheets and memory.

---

## 2. Current Status

| Layer | Status |
|---|---|
| Backend | 100% complete |
| Frontend | Functional, UI polish phase now |

The frontend UI polish phase applies the orange `#FF6B35` brand color and design system page by page.

---

## 3. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | Next.js 16 (App Router) | Server components, file-based routing, layout-level auth wrapping |
| Frontend language | TypeScript | Type safety across the frontend–backend boundary |
| Styling | Tailwind CSS 4 | Utility-first, no separate CSS files |
| Frontend auth | Clerk (`@clerk/nextjs`) | Google OAuth, session management, route protection |
| Backend runtime | Node.js + Express 5 | Minimal, explicit, no magic |
| Backend language | TypeScript | Prisma-generated types propagate through the service layer |
| ORM | Prisma | Type-safe queries, explicit migrations |
| Database | PostgreSQL via Supabase | Relational model fits FK-heavy schema; Supabase also gives Storage + dashboard |
| Backend auth | Clerk Express SDK | Validates Clerk JWTs without manual token verification |
| AI | Google Gemini — `gemini-3.6-flash` (config at `backend/src/config/gemini.ts`) | REST-only, no self-hosting; model chosen because earlier models (1.5-flash, 2.0-flash) 404'd during development |
| Email | Resend, from `reminders@applyntrack.online` (custom domain verified via DKIM/SPF/DMARC on Hostinger) | Simple REST API, no SMTP config |
| File storage | Supabase Storage (bucket `resumes`, path `{userId}/resume.pdf`, `upsert: true`) | Same vendor as DB, avoids a second provider |
| PDF text extraction | `pdf2json` (switched from `pdf-parse`, which failed with a CJS/ESM export mismatch) | Manual traversal of `pdfData.Pages[].Texts[].R[]` — `getRawTextContent()` returned empty strings |
| Scheduler | `node-cron`, in-process | No external scheduler needed at single-instance scale |
| HTTP client (frontend) | native `fetch` — no Axios | — |
| Frontend state | React `useState`/`useEffect` — no Redux, no caching layer | — |
| Deployment (planned) | Vercel (frontend), Railway (backend) | — |

---

## 4. Repository Structure

```text
backend/
  prisma/
    migrations/
    schema.prisma
  src/
    config/
      db.ts
      gemini.ts
      supabase.ts
    middleware/
      auth.ts
    modules/
      user/
        user.controller.ts
        user.routes.ts
        user.service.ts
      applications/
        applications.controller.ts
        applications.routes.ts
        applications.service.ts
      ai/
        ai.controller.ts
        ai.routes.ts
        ai.service.ts
      reminders/
        reminders.controller.ts
        reminders.routes.ts
        reminders.service.ts
      dashboard/
        dashboard.controller.ts
        dashboard.routes.ts
        dashboard.service.ts
    jobs/
      reminderJob.ts
    utils/
      email.ts
    index.ts
  package.json
  tsconfig.json

frontend/
  app/
    (protected)/
      layout.tsx
      dashboard/page.tsx
      applications/page.tsx
      applications/new/page.tsx
      applications/[id]/page.tsx
      profile/page.tsx
    sign-in/[[...rest]]/page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    Sidebar.tsx
  lib/
    api.ts
  types/
    index.ts
  middleware.ts
  next.config.ts
  package.json
  tsconfig.json
```

---

## 5. Build Status

```text
lib/api.ts          [DONE]
types/index.ts      [DONE]
Sidebar/Shell       [DONE]
Dashboard           [DONE — UI redesign pending]
Applications List   [DONE — UI redesign pending]
Applications New    [DONE — UI redesign pending]
Applications Detail [DONE — UI redesign pending]
Profile             [DONE — UI redesign pending]
```

---

## 6. Design System

```text
Brand color:       #FF6B35 (electric orange)
Background:        #FFFFFF (content area), #F3F4F6 (sidebar)
Text primary:      #111827
Text secondary:    #6B7280
Dividers:          #E5E7EB
Orange tint:       #FFF1EC (active nav background)
Orange dim:        #FF6B3520 (hover states)
Typography:        Inter (single font family)
Active nav:        3px left border #FF6B35, #FFF1EC background, orange text
Logo treatment:    "Applyn" in #111827, "Track" in #FF6B35
Status badges:
  APPLIED     → blue
  SCREENING   → yellow
  INTERVIEW   → purple
  ASSIGNMENT  → orange
  OFFER       → green
  REJECTED    → red
```

Page-level design tokens: `[Planned — updated per page as each is redesigned and tested]`

---

## 7. Session Rules

- Understand architecture deeply before coding; write code manually with AI guidance rather than accepting large unreviewed generations.
- Never advance to a new feature until the current one is Postman-tested (backend) or manually verified (frontend).
- Uses Codex for generation, Claude for understanding/review/decision-making.
- Build the frontend **one page or component at a time** — wait for Nitish to test before moving on.
- Always use exact field names from `docs/backend-api.md` — never guess (`jobTitle` not `role`, `dateApplied` not `appliedAt`, `isSent` not `sent`).
- Always call `getToken()` fresh before each API call (cheap — Clerk caches internally).
- Never hardcode `http://localhost:5000` — always `process.env.NEXT_PUBLIC_API_URL`.
- Never add new npm packages without asking; the stack is intentionally fixed for Phase 1.
- Backend is complete and untouchable during frontend work unless there's a real bug.
- "Functional first" for Phase 1: forms work, data fetches/displays correctly, navigation works, auth is enforced, errors are shown, loading states exist. Explicitly **not** Phase 1: pixel-perfect design, animations, drag-and-drop Kanban, mobile responsiveness, optimistic updates.

---

## 8. Cross-Cutting Patterns

- The Applications detail page is the busiest page in the app — it hosts Applications core UI, AI Resume Analysis, AI Interview Prep, *and* the Reminders UI all in one component tree. State variables across these four concerns should stay clearly namespaced (`reminderError` vs `analysisError` vs `prepError` vs `savingNotes`) to avoid collisions as the page grows — each async operation already gets its own loading boolean and error string rather than a shared one, and that pattern should hold as more sections are added.
- Every module follows the same defensive pattern: cheap client-side pre-checks where possible (empty job description, no date selected, no file selected) to avoid a wasted round trip, and the backend's raw error message surfaced verbatim otherwise.
- Nothing in the AI or Reminders flows streams — acceptable at current response-time scale for both Gemini calls and reminder creation.
- All timestamps are UTC end-to-end; convert to local (IST) only at display time. The one place this has already caused a real bug is the reminder cron (Applications module, Section 8) — worth remembering as a pattern if new date-sensitive features are added.

---

## 9. Module Reference

| Module | File | Contains |
|---|---|---|
| Dashboard | `docs/modules/dashboard.md` | Full dashboard spec including backend stats endpoint contract and all client-side derivations |
| Applications | `docs/modules/applications.md` | Full applications spec including list, create, detail pages, AI features, and reminders — all backend contracts included |
| Profile | `docs/modules/profile.md` | Full profile spec including all user and resume backend contracts |
| Backend API | `docs/backend-api.md` | Complete API reference — use this if you need contracts not covered in a module file |

---

## 10. Known Technical Debt

- **Deprecated Clerk middleware** — `requireAuth()` from `@clerk/express` is used in `middleware/auth.ts`; Clerk has deprecated this in favor of `clerkMiddleware()` + `getAuth()`. Prints a deprecation warning on every server start; works today but will break on a future major Clerk version.
- **No global error handler** — each controller has its own try/catch; an error escaping one crashes the server. Acceptable during solo development, must be fixed before production.
- **No input validation** — no Zod schemas; Prisma catches type mismatches but not missing-required-field or invalid-enum cases at the application layer.
- **`resumeText` stored raw** — includes PDF layout spacing artifacts, sent to Gemini uncleaned; works but cleaner text would likely improve AI output quality.
- **`ApplicationSource` misspellings** — NAUKARI/REFERAL/COLDEMAIL require a raw-SQL `ALTER TYPE ... RENAME VALUE` migration to fix; deferred.
- **pdf2json manual traversal** — workaround for `getRawTextContent()` returning empty strings; may not generalize to all PDF structures.
- **No automated tests** — everything verified manually in Postman so far.
- **`.gitignore` cleanup** — dist/generated/env files may not be fully ignored at the repo root.
