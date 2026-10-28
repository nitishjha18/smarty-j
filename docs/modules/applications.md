# Applications Module

Status: Built
Last updated: October 29, 2026

## 1. Module Overview

The applications module covers the applications list, create application, and application detail pages. The detail page also contains AI Resume Fit analysis and reminder creation.

Company logos: an application can store an optional `companyDomain` (for example `zomato.com`). The create page fills it when the user picks a company from an autocomplete, and `CompanyLogo` shows the logo on the board, the detail page, and the dashboard. See Section 5 for the autocomplete and `docs/architecture.md` Section 6b for the design.

---

## 2. Backend API Contract

All routes in this section require `Authorization: Bearer <token>`. Get a fresh token with `const token = await getToken()` before each request.

A missing or invalid token returns:

```json
{ "error": "Unauthorized" }
```

A valid Clerk token without a local user returns:

```json
{ "error": "User not found. Please sync first." }
```

### Application values

```text
ApplicationStatus: APPLIED | SCREENING | INTERVIEW | ASSIGNMENT | OFFER | REJECTED
ApplicationSource: LINKED_IN | NAUKARI | REFERAL | COLDEMAIL | SOCIAL_MEDIA | OTHER_JOB_APPS
```

`NAUKARI`, `REFERAL`, and `COLDEMAIL` are the exact persisted enum values. Do not correct them in requests.

### POST /api/applications

Create an application. `companyName`, `jobTitle`, and `source` are required. `jobDescription`, `notes`, `dateApplied`, and `companyDomain` are optional. If `jobDescription` is omitted, the backend stores an empty string. If `dateApplied` is omitted, it defaults to the current server time. `companyDomain` is the company's website domain, used to show its logo; an empty string is treated as not provided.

```json
{
  "companyName": "Google",
  "companyDomain": "google.com",
  "jobTitle": "Backend Engineer",
  "jobDescription": "Design and build scalable backend systems...",
  "source": "LINKED_IN",
  "notes": "Referral from college senior",
  "dateApplied": "2026-08-20"
}
```

Response `201`:

```json
{
  "application": {
    "id": "cmsyideb30007ncphs5gpgeph",
    "userId": "cmp07oqw40000r9w593fvr195",
    "companyName": "Google",
    "companyDomain": "google.com",
    "jobTitle": "Backend Engineer",
    "jobDescription": "Design and build scalable backend systems...",
    "status": "APPLIED",
    "source": "LINKED_IN",
    "dateApplied": "2026-08-20T00:00:00.000Z",
    "notes": "Referral from college senior",
    "createdAt": "2026-08-20T10:17:03.663Z",
    "updatedAt": "2026-08-20T10:17:03.663Z"
  }
}
```

The service automatically creates an `APPLIED` `StatusHistory` record.

Errors:

- `400 { "error": "companyName, jobTitle, and source are required" }`
- an invalid enum value, wrongly typed field or unparseable date is rejected by Prisma and returned as `400 { "error": "Invalid request data" }`
- unexpected failures return `500 { "error": "Internal server error" }`; raw database or provider messages are never returned

No body validation exists beyond the required-field check. An invalid `source` or `dateApplied` value reaches Prisma and is returned as `400 { "error": "Invalid request data" }`.
Errors are produced by the backend's global error handler; the shared shapes are listed at the top of `docs/backend-api.md`.

### GET /api/applications

No request body. Applications are ordered by `dateApplied` descending and include `statusHistory`, ordered newest first.

Response `200`:

```json
{
  "applications": [
    {
      "id": "cmsyideb30007ncphs5gpgeph",
      "userId": "cmp07oqw40000r9w593fvr195",
      "companyName": "Google",
      "companyDomain": "google.com",
      "jobTitle": "Backend Engineer",
      "jobDescription": "Design and build scalable backend systems...",
      "status": "APPLIED",
      "source": "LINKED_IN",
      "dateApplied": "2026-08-20T00:00:00.000Z",
      "notes": "Referral from college senior",
      "createdAt": "2026-08-20T10:17:03.663Z",
      "updatedAt": "2026-08-20T10:17:03.663Z",
      "statusHistory": [
        {
          "id": "cmt0history0001",
          "applicationId": "cmsyideb30007ncphs5gpgeph",
          "status": "APPLIED",
          "createdAt": "2026-08-20T10:17:03.663Z"
        }
      ]
    }
  ]
}
```

### GET /api/applications/:id

No request body.

Response `200`:

```json
{
  "application": {
    "id": "cmsyideb30007ncphs5gpgeph",
    "userId": "cmp07oqw40000r9w593fvr195",
    "companyName": "Google",
    "companyDomain": "google.com",
    "jobTitle": "Backend Engineer",
    "jobDescription": "Design and build scalable backend systems...",
    "status": "SCREENING",
    "source": "LINKED_IN",
    "dateApplied": "2026-08-20T00:00:00.000Z",
    "notes": "Referral from college senior",
    "createdAt": "2026-08-20T10:17:03.663Z",
    "updatedAt": "2026-08-21T09:00:00.000Z",
    "statusHistory": [
      {
        "id": "cmt0history0002",
        "applicationId": "cmsyideb30007ncphs5gpgeph",
        "status": "SCREENING",
        "createdAt": "2026-08-21T09:00:00.000Z"
      }
    ]
  }
}
```

Errors:

- `404 { "error": "Application not found" }`
- an invalid enum value, wrongly typed field or unparseable date is rejected by Prisma and returned as `400 { "error": "Invalid request data" }`
- unexpected failures return `500 { "error": "Internal server error" }`; raw database or provider messages are never returned

### PUT /api/applications/:id

All body fields are optional; send only fields that change.

```json
{
  "companyName": "Google",
  "companyDomain": "google.com",
  "jobTitle": "Senior Backend Engineer",
  "jobDescription": "Updated job description...",
  "source": "LINKED_IN",
  "status": "SCREENING",
  "notes": "Updated notes",
  "dateApplied": "2026-08-20"
}
```

Response `200` is `{ "application": { ... } }`, using the full application shape from `GET /api/applications/:id`, including `statusHistory`.

When `status` changes, the service automatically creates a new `StatusHistory` record.

`companyDomain` can be set or changed here. An empty string is ignored, so a stored domain cannot currently be cleared through this endpoint.

Errors:

- `404 { "error": "Application not found" }`
- an invalid enum value, wrongly typed field or unparseable date is rejected by Prisma and returned as `400 { "error": "Invalid request data" }`
- unexpected failures return `500 { "error": "Internal server error" }`; raw database or provider messages are never returned

### DELETE /api/applications/:id

No request body.

Response `200`:

```json
{ "message": "Application deleted successfully" }
```

Errors:

- `404 { "error": "Application not found" }`
- an invalid enum value, wrongly typed field or unparseable date is rejected by Prisma and returned as `400 { "error": "Invalid request data" }`
- unexpected failures return `500 { "error": "Internal server error" }`; raw database or provider messages are never returned

Deleting an application also removes its related `StatusHistory`, `ResumeAnalysis`, and `Reminder` data.

### POST /api/ai/analyze-resume

Generate or refresh resume analysis for one application. The backend compares the signed-in user's stored `resumeText` against the application's `jobDescription`.

```json
{ "applicationId": "cmsyideb30007ncphs5gpgeph" }
```

Response `200`:

```json
{
  "analysis": {
    "id": "cmt0analysis0001",
    "applicationId": "cmsyideb30007ncphs5gpgeph",
    "matchScore": 72,
    "missingKeywords": ["docker", "kubernetes", "redis"],
    "strongestPoints": [
      "Backend API experience aligns well with the role.",
      "Database work is relevant to the job description."
    ],
    "redFlags": [
      "The resume does not clearly show production cloud deployment experience."
    ],
    "recruiterTake": "A promising backend candidate, but the resume should show stronger evidence of cloud and scaling experience.",
    "suggestions": [],
    "createdAt": "2026-09-20T01:22:57.000Z",
    "updatedAt": "2026-09-20T01:22:57.000Z"
  }
}
```

Behavior:

- Missing keywords are computed locally from the job description and capped at 10.
- Gemini generates `matchScore`, `strongestPoints`, `redFlags`, and `recruiterTake`.
- The result is saved with an upsert, so reanalysis overwrites the previous `ResumeAnalysis` for the same application.
- `suggestions` currently returns an empty array and is reserved for future use.

Errors:

- `400 { "error": "applicationId is required" }`
- `400 { "error": "Resume not found. Please upload your resume first." }`
- `404 { "error": "Application not found." }`
- `400 { "error": "No job description found for this application." }`
- `503 { "error": "AI analysis is temporarily unavailable. Please try again in a moment." }` when the Gemini call fails (network, bad API key, overload) or returns invalid JSON or the wrong shape. The original error is logged on the server only.
- unexpected failures return `500 { "error": "Internal server error" }`

### GET /api/ai/resume-analysis/:appId

Fetch the saved analysis for an application owned by the signed-in user.

Response `200` when analysis exists:

```json
{
  "analysis": {
    "id": "cmt0analysis0001",
    "applicationId": "cmsyideb30007ncphs5gpgeph",
    "matchScore": 72,
    "missingKeywords": ["docker", "kubernetes", "redis"],
    "strongestPoints": [
      "Backend API experience aligns well with the role."
    ],
    "redFlags": [
      "The resume does not clearly show production cloud deployment experience."
    ],
    "recruiterTake": "A promising backend candidate, but the resume should show stronger evidence of cloud and scaling experience.",
    "suggestions": [],
    "createdAt": "2026-09-20T01:22:57.000Z",
    "updatedAt": "2026-09-20T01:22:57.000Z"
  }
}
```

`missingKeywords`, `strongestPoints`, `redFlags` and `suggestions` are all returned as arrays, the same shape as `POST /api/ai/analyze-resume`. The frontend never reads `suggestions`.

Response `200` when no saved analysis exists:

```json
{ "analysis": null }
```

Errors:

- `404 { "error": "Application not found." }`
- unexpected failures return `500 { "error": "Internal server error" }`

Important: uploading a new resume from the profile module deletes saved analyses for all of the user's applications. After a resume upload, this endpoint returns `null` until analysis is run again.

### POST /api/reminders

Create an unsent reminder for an application. `applicationId` and `reminderDate` are required; `notes` is optional.

```json
{
  "applicationId": "cmsyideb30007ncphs5gpgeph",
  "reminderDate": "2026-08-25",
  "notes": "Follow up on application status"
}
```

Response `201`:

```json
{
  "reminder": {
    "id": "cmt0iijwk000110ec5zyy1zqi",
    "applicationId": "cmsyideb30007ncphs5gpgeph",
    "userId": "cmp07oqw40000r9w593fvr195",
    "reminderDate": "2026-08-25T00:00:00.000Z",
    "isSent": false,
    "notes": "Follow up on application status",
    "createdAt": "2026-08-20T10:17:03.663Z",
    "updatedAt": "2026-08-20T10:17:03.663Z"
  }
}
```

Errors:

- `400 { "error": "applicationId and reminderDate are required" }`
- `400 { "error": "Invalid request data" }` when `reminderDate` cannot be parsed as a date
- `404 { "error": "Application not found." }`
- unexpected failures return `500 { "error": "Internal server error" }`

### PUT /api/reminders/:id

`reminderDate` is required; `notes` is optional.

```json
{
  "reminderDate": "2026-09-01",
  "notes": "Interview scheduled for 3pm"
}
```

Response `200` is `{ "reminder": { ... } }`.

The update sets only `reminderDate` and `notes`. It does not reset `isSent`, so a reminder that has already been sent and is moved to a new date is never sent again (the cron job selects only `isSent: false`).

Errors:

- `400 { "error": "reminderDate is required" }`
- `400 { "error": "Invalid request data" }` when `reminderDate` cannot be parsed as a date
- `404 { "error": "Reminder not found." }`
- unexpected failures return `500 { "error": "Internal server error" }`

### DELETE /api/reminders/:id

No request body.

Response `200`:

```json
{ "message": "Reminder deleted successfully" }
```

Errors:

- `404 { "error": "Reminder not found." }`
- unexpected failures return `500 { "error": "Internal server error" }`

---

## 3. Shared Utilities

The status and source maps, status color classes, and date helpers are shared by every page:

- `frontend/app/lib/status.ts`: `STATUS_LABELS`, `SOURCE_LABELS`, `ALL_STATUSES`, `PIPELINE_STAGES` (the five forward stages, without `REJECTED`), and `STATUS_STYLES` (Tailwind class names per status: `dot`, `border`, `tint`, `text`).
- `frontend/app/lib/dates.ts`: `formatDate` (`20 Aug 2026`, en-IN), `formatDateUS` (`Aug 20, 2026`), `formatShortDate` (`AUG 20`), `formatDateTime` (`AUG 20, 2:30 PM`), `daysSince` (`Today` / `1 day ago` / `N days ago`, calendar days), `timeAgo` (`Today` / `Yesterday` / `N days ago`, elapsed time), and `daysSinceLastStatusChange(app, now)`.
- `frontend/app/lib/cn.ts`: class-name joiner.

Colors, radii, shadows and fonts are defined once as design tokens under `@theme` in `frontend/app/globals.css` (for example `bg-brand`, `text-ink`, `rounded-card`, `shadow-pop`, `bg-st-applied`). Reusable UI lives in `frontend/app/components/ui/` (`Button`, `Card`, `Chip`, `Tag`, `Field` inputs, `Modal`, `Tabs`, `Stepper`, `ScoreMeter`, `StatusBadge`/`StatusDot`/`StatusLabel`/`StatusTransition`, `Eyebrow`, `Avatar`, `EmptyState`).

## 4. Applications List Page

### Location

```text
frontend/app/(protected)/applications/page.tsx
```

### Purpose and content

The page header shows `Applications` and a subline: `{n} total · {x} gone quiet`, or `{n} total · All caught up — no stale applications` when nothing is stale. A `New application` button (44px) sits on the right. The orange `{x} gone quiet →` text is a link that scrolls the board to the first card with a `QUIET` label. The list is a six-column status board that scrolls horizontally (280px columns, 16px gap) and fills the available height, with thin scrollbars. Each column has a centered status name and count, a status-colored bar, and cards. A card shows the company logo (letter avatar tinted with the status color when there is no logo), company name, job title, and a mono line `SOURCE · MMM D`. Within a column the backend's descending `dateApplied` order is preserved. Cards are links to the detail page and can also be dragged to another column to change their status (see Drag and drop below). Status can still be changed on the detail page. `REJECTED` cards are dimmed.

Two different "stale" measures appear on this page (and the dashboard and the backend stat use further variants, so counts can disagree):

- **Header count:** `{n} gone quiet`. The count includes only applications whose status is `APPLIED` and whose `dateApplied` is 14 or more days ago. It does not look at status history.
- **Card label:** `QUIET {n} DAYS` in orange on a card when 14 or more days have passed since its most recent status change (the newest `statusHistory` entry, or `updatedAt` when there is no history), via `daysSinceLastStatusChange`. It applies to a card in any status, including `OFFER` and `REJECTED`.

Status colors come from `STATUS_STYLES` (Applied blue, Screening amber, Interview purple, Assignment teal, Offer green, Rejected rose).

### Drag and drop

Built with `@dnd-kit/core` and `@dnd-kit/utilities`. A card can be dropped into any of the six columns, including backwards and into `REJECTED`.

- **Activation:** mouse after 6px of movement (so a plain click still opens the card), touch after a 200ms press-and-hold (so horizontal scrolling still works), keyboard on `Space`. `Enter` still follows the card's link.
- **Drop:** the column under the pointer is highlighted with its status color (`ring` and tint from `STATUS_STYLES`). Dropping on the card's current column, or outside any column, does nothing and makes no API call.
- **Request:** `useMoveApplication()` in `frontend/app/lib/queries.ts` sends `PUT /api/applications/:id` with `{ status }` for any application id. On success it does what `useUpdateApplication` does: writes the returned application into that application's detail query and invalidates the applications list and dashboard stats.
- **Optimistic update:** on drop the card moves to the new column in the applications-list cache immediately, with an optimistic `statusHistory` entry (so its `QUIET` label disappears). If the request fails, only that application is restored from its pre-move copy and the API error message is shown in red under the page subtitle (`role="alert"`). It clears on the next drag.
- **In flight:** a card with a pending update is dimmed, pulses, and cannot be dragged again until the request settles.
- **Order:** columns keep the backend's `dateApplied` descending order; there is no reordering within a column.
- **Drag preview:** a `DragOverlay` copy of the card (slightly rotated, with a larger shadow) follows the pointer; the original is dimmed.
- **Auto-scroll:** dragging near the left or right edge of the board scrolls it horizontally (and the lane list vertically).
- **Keyboard:** focus a card, press `Space` to pick it up, `ArrowLeft`/`ArrowRight` to move to the neighbouring column, `Space` to drop, `Escape` to cancel. A live region announces `Picked up Google.`, `Google is over Interview.`, and `Moved Google to Interview.`.

### Company logo

Each card shows the company logo through `CompanyLogo` (28px, `tone` set to the card's status) to the left of the company name and job title. An application with no stored `companyDomain` makes no logo request and shows a letter avatar. An application with a domain requests its logo image from Brandfetch's CDN whenever the card renders; the browser may serve repeat loads from its cache.

### States

- Loading: six columns of `Skeleton` placeholders while the first query is pending.
- Error: the query error message centered in red.
- Empty: an `EmptyState` (`No applications yet`) with an `Add first application` button that links to `/applications/new`.
- Populated: clickable application items.

### Fetch pattern

```ts
const { data, error: queryError, isPending } = useApplications()
const applications = data ?? []
const loading = isPending
const error = queryError?.message ?? null
```

`useApplications()` owns the `GET /api/applications` request and its user-scoped cache entry. The API includes `statusHistory`; the board uses it for each card's most-recent-status age. Cached data remains visible while a refetch is in flight, so skeletons are limited to the first load.

### Navigation

The new-application buttons link to `/applications/new`. Clicking an application card navigates to `/applications/:id`. Both of those routes render this board behind a dialog (see sections 5 and 6).

---

## 5. Create Application Page

### Location

```text
frontend/app/(protected)/applications/new/page.tsx
```

### Purpose and fields

The route is presented as a dialog (`Modal`, 640px) titled `New application` / `Add a job to your tracking pipeline.`. The applications board renders behind it. The dialog creates one application and then routes directly to its detail page. The close button, Esc, backdrop click and `Cancel` all call `router.back()`.

| Field | Input | Required | Initial value |
|---|---|---|---|
| `companyName` | autocomplete text input (`CompanySearchInput`) | Yes | `""` |
| `companyDomain` | set by picking a suggestion; no visible input | No | `""` |
| `jobTitle` | text | Yes | `""` |
| `source` | chips (one per source, single choice) | Yes | `LINKED_IN` |
| `dateApplied` | native date input plus a `Today` button that sets today's UTC date | No | today's date in UTC (`new Date().toISOString().split("T")[0]`) |
| `jobDescription` | textarea | No | `""` |
| `notes` | textarea | No | `""` |

The initial date uses the UTC calendar date, so between 00:00 and 05:30 IST the pre-filled date is the previous day in India. The user can change it before saving.

The source chips are generated from `SOURCE_LABELS`, so they are the six exact `ApplicationSource` values. The company input shows a search icon and the placeholder `Start typing a company name…`; the job title placeholder is `e.g. Senior Frontend Engineer`; the job description has the hint `Optional — used for AI resume fit.`.

### Company autocomplete

`CompanySearchInput` replaces the plain company input.

1. After the user types at least 2 characters, it waits 300 ms and calls the Brandfetch Brand Search API from the browser, then shows up to 5 matches (logo, name, domain, and a tick for verified brands).
2. Picking a match sets `companyName` and `companyDomain` in the form, and the company's logo appears inside the input at the right end.
3. Typing again clears `companyDomain` and the logo, so a half-edited name never keeps the wrong company's domain.
4. Ignoring the dropdown still works: the name is saved as plain text with no domain, and the card shows a letter avatar.

Search and logos need `NEXT_PUBLIC_BRANDFETCH_CLIENT_ID`. Without it the field behaves as a plain text input.

### Validation and submit behavior

Before submitting, require `companyName`, `jobTitle`, and `source`. If any is empty, render `Company name, job title, and source are required.` in red and do not call the API.

On submit, call `POST /api/applications`. On success, the backend creates the initial `APPLIED` history record and the page redirects to `/applications/${data.application.id}`.

```ts
const data = await createApplication.mutateAsync({
  ...form,
  companyDomain: form.companyDomain || undefined,
})
router.push(`/applications/${data.application.id}`)
```

`useCreateApplication()` invalidates the signed-in user's applications and dashboard-stats queries after success.

### States

- Submitting: the `Save application` button shows `Saving...` and is disabled.
- Error: client validation or API error is shown in red above the action buttons.
- Cancel: calls `router.back()`.

---

## 6. Application Detail Page

### Location and purpose

```text
frontend/app/(protected)/applications/[id]/page.tsx
```

This is the single source of truth for an application: its status, full history, notes, job description, AI Resume Fit, and reminder creation all render here.

### Current layout

The route is presented as a dialog (`Modal`, 960px) over the applications board. It has a header and three tabs:

- `overview`: stage stepper with a `Mark as rejected` link, notes, job description, and status history.
- `ai`: saved resume analysis and reanalysis controls.
- `reminder`: reminder creation and the upcoming-reminders placeholder.

The header shows the company logo (40px), company name, job title and a mono meta line: status, source, `Applied {Mon D, YYYY}`, and either `Quiet {n} days` (orange, when 14 or more days since the last status change) or the `daysSince` label. A three-dot menu next to the close button has two items: `Edit details`, which is disabled and marked `Soon` (tooltip `Coming soon`), and `Delete`, which opens the delete confirmation. There is no way to edit an application's company, title, source, or job description from the UI yet, although `PUT /api/applications/:id` accepts them.

The close button, Esc and backdrop click navigate to `/applications`. Esc only closes the top-most dialog (the delete confirmation and the expanded job description are nested dialogs). `/applications/:id?tab=reminder` (used by the dashboard's `Remind me` button) opens the Reminder tab first; `tab=ai` and `tab=overview` work the same way.

### Initial data

The page uses separate `useApplication(id)` and `useResumeAnalysis(id)` queries. The application query takes the matching item from the applications-list cache as `placeholderData`, then fetches its full detail. The saved-analysis query maps an absent response to `null`; a query error also renders as no saved analysis. Both wait for the shared user-sync query. The notes editor initializes during render only once for an application ID (guarded by `notesInitFor`), so a refetch cannot replace text the user is typing.

### Delete flow

1. The user opens the three-dot menu and chooses delete.
2. A confirmation dialog asks `Delete this application?`.
3. `Yes, delete` calls `deleteApplication.mutateAsync(id)`.
4. On success, route to `/applications`.
5. Failure surfaces as the page error and closes the deleting state.

### Status update flow

`Mark as rejected` sends `REJECTED`. Once rejected, the stepper shows the last stage reached in red with a cross and the link is hidden; clicking a stage moves the application back into the pipeline.

1. The user clicks a stage in the stepper or `Mark as rejected`. Ignore the event when there is no application, an update is running, or the selected status is already current.
2. Call `updateApplication.mutateAsync({ status: newStatus })`.
3. The mutation writes the response into this application's query cache, then invalidates applications and dashboard stats.
4. Show the temporary `Updated` confirmation.
5. The backend appends a `StatusHistory` record when the status changed.

This is intentionally non-optimistic: the page shows the status change only after the response succeeds.

### Notes save flow

1. Disable Save Notes when the current content equals `application.notes ?? ""`.
2. Call `updateApplication.mutateAsync({ notes })`.
3. The same mutation updates the query cache and invalidates the list and dashboard stats.
4. Show temporary `Saved` feedback.

### Job description display

The overview tab renders the job description only when `application.jobDescription` is non-empty, in a scrollable block under the notes. An `Expand` control opens a dialog for reading the full text.

### Detail page state variables

```ts
const [activeTab, setActiveTab] =
  useState<"overview" | "ai" | "reminder">(/* ?tab= value, else "overview" */)
const [overflowOpen, setOverflowOpen] = useState(false)
const [jdModalOpen, setJdModalOpen] = useState(false)
const [notesInitFor, setNotesInitFor] = useState<string | null>(null)

const [notes, setNotes] = useState("")
const [notesSaved, setNotesSaved] = useState(false)
const [actionError, setActionError] = useState<string | null>(null)
const [statusUpdated, setStatusUpdated] = useState(false)

const [confirmDelete, setConfirmDelete] = useState(false)

const [analysisError, setAnalysisError] = useState<string | null>(null)
const [copied, setCopied] = useState(false)

const [reminderDate, setReminderDate] = useState("")
const [reminderNotes, setReminderNotes] = useState("")
const [reminderSaved, setReminderSaved] = useState(false)
const [reminderError, setReminderError] = useState<string | null>(null)
```

### Page states

- Initial load: `Skeleton` placeholders inside the dialog only while the application query has no cached or placeholder data.
- Initial-load error: error text in red inside the dialog.
- Not found: `Application not found.` inside the dialog.
- Per-operation errors: retain the rendered application and display the error inline where possible.

---

## 7. AI Resume Fit

### Purpose

AI Resume Fit lives on the application detail page's `ai` tab. It compares the user's currently uploaded resume against the selected application's job description.

The UI explicitly reminds the user that analysis is based on the currently uploaded resume and links to `/profile` to update the resume. Uploading a new resume deletes saved analyses, so this tab will show the no-analysis state until the user analyses again.

### Saved-analysis loading

`useResumeAnalysis(id)` owns the saved-analysis request and its user-scoped cache entry. It returns `null` for an absent analysis; after a successful analysis mutation, that result is written to the same cache key and renders without a separate fetch.

### Trigger and pre-check

`Analyse resume` triggers the feature when there is no saved analysis. `Reanalyse` triggers it when analysis already exists.

Before any request, check `application.jobDescription`. When it is empty, set `analysisError` to `Add a job description to this application first.` and do not call the API.

```ts
await analyzeResume.mutateAsync(application.id)
```

The mutation writes its returned analysis to the detail page's cached analysis key.

### Display

When no saved analysis exists, an `EmptyState` shows:

- `No analysis yet`.
- `Compare your resume against this job description`.
- `Analyse resume`, disabled while analysing (`Analysing...`).
- `analysisError` if present.

When saved analysis exists, one card shows:

- `RESUME FIT` caption, `{company} — {job title}`, the score in large orange type with `/100` and a tag (`STRONG` at 85+, `GOOD` at 65+, otherwise `NEEDS WORK`), and a progress bar.
- `ANALYZED {Mon D, YYYY}` (from `savedAnalysis.createdAt`) and a `Reanalyse` button.
- The existing `scoreLabel` sentence (`Strong fit — you're well aligned` and so on).
- `MISSING KEYWORDS` tags when the array is non-empty.
- `STRONGEST POINTS` with check icons.
- `RED FLAGS` with flag icons when the array is non-empty.
- `RECRUITER TAKE` as a quote block.
- `IMPROVEMENT PROMPT` with a `Copy` button (`Copied!` for 2 seconds) and the prompt text in a mono box.

### Copy improvement prompt

The `Copy improvement prompt` action builds a prompt from the current application and saved analysis:

```ts
I applied for a ${application.jobTitle} role at ${application.companyName}. My resume was analysed and here is what came back:

Match Score: ${savedAnalysis.matchScore}/100
Missing Keywords: ${savedAnalysis.missingKeywords.join(", ")}
Red Flags: ${savedAnalysis.redFlags.join(", ")}
Strongest Points: ${savedAnalysis.strongestPoints.join(", ")}
Recruiter Take: ${savedAnalysis.recruiterTake}

Please help me improve my resume to address these gaps.
```

It writes to `navigator.clipboard`, sets `copied` to true, then resets that feedback after 2 seconds.

### Error handling

| Condition | UI behavior |
|---|---|
| No job description | `Add a job description to this application first.`; no API call |
| Any error message that contains the word "resume" (case-insensitive) | `No resume uploaded. Upload one from your profile page.` |
| Any other error, including `AI analysis is temporarily unavailable. Please try again in a moment.` (`503`) | Render the API error message verbatim |

The "resume" check is a substring match on the error message, so it covers `Resume not found. Please upload your resume first.` and would also match any other backend message that mentions a resume.

### Type definition

`ResumeAnalysis` is defined in `frontend/app/types/index.ts`:

```ts
export interface ResumeAnalysis {
  id: string
  applicationId: string
  matchScore: number
  missingKeywords: string[]
  strongestPoints: string[]
  redFlags: string[]
  recruiterTake: string
  suggestions: string[]
  createdAt: string
  updatedAt: string
}
```

---

## 8. Reminders

### How it works

The user picks a date (quick chips `Tomorrow`, `In 3 days`, `Next week`, or the date input) and an optional note, then clicks `Set reminder`. `POST /api/reminders` stores the record with `isSent: false`.

A daily 9am cron job finds unsent reminders whose `reminderDate` is today in UTC, sends an HTML email through Resend, then marks each record `isSent: true` so it cannot be sent twice. The sender address is the value of the `RESEND_FROM_EMAIL` environment variable; the code does not hardcode an address.

### UI fields and states

| Field | Input | Required |
|---|---|---|
| Reminder date | date input with quick chips that set tomorrow, +3 days, or +7 days | Yes |
| Note | textarea | No |

The date input has `min` set to today's date. Before the API call, a missing date sets `reminderError` to `Please select a reminder date.`.

| State | UI behavior |
|---|---|
| Missing date | `Please select a reminder date.` in red |
| Saving | `Set reminder` becomes `Saving...` and is disabled |
| Success | `Reminder set.` in green; clear `reminderDate` and `reminderNotes` |
| Error | Render the API error message in red |

The implementation sends the optional note as `reminderNotes.trim() || undefined`:

```ts
await createReminder.mutateAsync({
  applicationId: id,
  reminderDate,
  notes: reminderNotes.trim() || undefined,
})
```

The detail-page UI currently creates reminders only. The backend exposes update and delete reminder endpoints, but the page has no reminder list endpoint to support full management yet. The client helpers `updateReminder` and `deleteReminder` in `frontend/app/lib/api.ts`, and the `Reminder` type in `frontend/app/types/index.ts`, are defined but not used by any component.

### Reminder copy

The redesign removed the `How reminders work` card, including its last bullet (`You can update or delete a reminder any time before it fires.`), which described controls the UI does not have. The form now shows the hint `We'll email you on this date with the application details.`.

### Upcoming reminders placeholder

The reminder tab shows an `Upcoming` column, but it is a static empty placeholder (`No reminders set for this application`) because there is no list-reminders endpoint currently. It shows this text even when the application has reminders.

### Important: UTC date handling

The backend stores and queries `reminderDate` in UTC. IST is UTC+5:30, so a date that is today in IST may already be tomorrow in UTC depending on the time of day.

In practice: when setting a same-day reminder late at night IST, use the next calendar day so the cron job picks it up correctly.

### Email and cron

The email subject is `Reminder — {jobTitle} at {companyName}`. The body greets the user with their full stored `name` (`Hi {name},`, not just the first name) and shows the job title, company name, and the reminder note when one was provided. These values are inserted into the HTML without escaping. The email's header and accent are indigo (`#4F46E5`). The cron expression is:

```text
0 9 * * *
```

It is configured in `backend/src/jobs/reminderJob.ts` and started by `startReminderJob()` in `index.ts` after `app.listen`. No timezone option is set, so 9am means the server's local time. Its date query uses `setUTCHours` and `setUTCDate` explicitly, so the range it matches is a UTC calendar day. The whole callback is wrapped in a `try/catch`, and each individual send has its own, so one failure is logged without stopping the others.

---

## 9. Known Limitations

- The applications list has no pagination, filter, or search.
- Drag-and-drop does not reorder cards inside a column, and keyboard moves only jump between columns.
- The reminder UI cannot view, edit, or delete existing reminders because there is no list-reminders endpoint.
- The `Upcoming` column on the Reminder tab is currently a placeholder.
- UTC/IST mismatch can cause same-day reminders set late at night to be missed.
- If the backend server is down at 9am, that day's reminders are missed because there is no retry mechanism.
- `suggestions` is part of the `ResumeAnalysis` type but is always an empty array; the frontend never reads it.
- The list page's header count, its card label, the dashboard, and the backend stat each define "stale" differently.
- `PUT /api/reminders/:id` does not reset `isSent`.
- The pre-filled `dateApplied` on the create page is the UTC date, which is the previous day in India between 00:00 and 05:30 IST.
- The three-dot menu's `Edit details` item is disabled. Company, title, source, and job description cannot be edited in the UI.
- Resume upload replaces every cached saved analysis with `null`; the detail page reflects that cache update without needing a refresh.
- Applications created before `companyDomain` existed have no domain and show letter avatars. There is no UI to add or edit a domain on an existing application.
- The update endpoint ignores an empty `companyDomain`, so a stored domain cannot be cleared through the API.
- Logo and search coverage was checked only on a small set of well-known companies. Smaller companies may be missing from Brandfetch search and fall back to a letter avatar.
- The autocomplete dropdown is mouse-only; there is no arrow-key or Enter selection yet.
