# Applications Module

Status: Built
Last updated: October 2026

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
- unexpected failures return `500 { "error": "Internal server error" }` or the thrown error message

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
- unexpected failures return `500 { "error": "Internal server error" }` or the thrown error message

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
- unexpected failures return `500 { "error": "Internal server error" }` or the thrown error message

### DELETE /api/applications/:id

No request body.

Response `200`:

```json
{ "message": "Application deleted successfully" }
```

Errors:

- `404 { "error": "Application not found" }`
- unexpected failures return `500 { "error": "Internal server error" }` or the thrown error message

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
- `400 { "error": "Application not found." }`
- `400 { "error": "No job description found for this application." }`
- unexpected non-Error failures return `500 { "error": "Internal server error" }`

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

Response `200` when no saved analysis exists:

```json
{ "analysis": null }
```

Errors:

- `400 { "error": "Application not found." }`
- unexpected non-Error failures return `500 { "error": "Internal server error" }`

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
- `400 { "error": "Application not found." }`
- unexpected non-Error failures return `500 { "error": "Internal server error" }`

### PUT /api/reminders/:id

`reminderDate` is required; `notes` is optional.

```json
{
  "reminderDate": "2026-09-01",
  "notes": "Interview scheduled for 3pm"
}
```

Response `200` is `{ "reminder": { ... } }`.

Errors:

- `400 { "error": "reminderDate is required" }`
- `400 { "error": "Reminder not found." }`
- unexpected non-Error failures return `500 { "error": "Internal server error" }`

### DELETE /api/reminders/:id

No request body.

Response `200`:

```json
{ "message": "Reminder deleted successfully" }
```

Errors:

- `400 { "error": "Reminder not found." }`
- unexpected non-Error failures return `500 { "error": "Internal server error" }`

---

## 3. Shared Utilities

`STATUS_LABELS`, `SOURCE_LABELS`, `formatDate`, `daysSince`, and status color maps currently live in the application pages. Extracting them to a shared utility remains a cleanup task.

```ts
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  ASSIGNMENT: "Assignment",
  OFFER: "Offer",
  REJECTED: "Rejected",
}

const SOURCE_LABELS: Record<string, string> = {
  LINKED_IN: "LinkedIn",
  NAUKARI: "Naukri",
  REFERAL: "Referral",
  COLDEMAIL: "Cold Email",
  SOCIAL_MEDIA: "Social Media",
  OTHER_JOB_APPS: "Other",
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
```

---

## 4. Applications List Page

### Location

```text
frontend/app/(protected)/applications/page.tsx
```

### Purpose and content

The list is a six-column status board. It preserves the backend's descending `dateApplied` order within each status column and shows a count chip, stale-applications banner, per-status summary strip, and cards with company name, job title, source, formatted date, color-coded status, and a stale-age badge when applicable.

Status color mapping:

| Status | Color family |
|---|---|
| APPLIED | blue |
| SCREENING | amber |
| INTERVIEW | purple |
| ASSIGNMENT | orange |
| OFFER | green |
| REJECTED | rose/red |

### Company logo

Each card shows the company logo through `CompanyLogo` (28px) to the left of the company name and job title. An application with no stored `companyDomain` makes no logo request and shows a letter avatar. An application with a domain requests its logo image from Brandfetch's CDN whenever the card renders; the browser may serve repeat loads from its cache.

### States

- Loading: six columns of `Skeleton` placeholders while the first query is pending.
- Error: the query error message centered in red.
- Empty: empty state that links to creating the first application.
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

The new-application action navigates to `/applications/new`. Clicking an application navigates to `/applications/:id`.

---

## 5. Create Application Page

### Location

```text
frontend/app/(protected)/applications/new/page.tsx
```

### Purpose and fields

The page creates one application and then routes directly to its detail page.

| Field | Input | Required | Initial value |
|---|---|---|---|
| `companyName` | autocomplete text input (`CompanySearchInput`) | Yes | `""` |
| `companyDomain` | set by picking a suggestion; no visible input | No | `""` |
| `jobTitle` | text | Yes | `""` |
| `source` | select | Yes | `LINKED_IN` |
| `dateApplied` | date | No | current date |
| `jobDescription` | textarea | No | `""` |
| `notes` | textarea | No | `""` |

The source select contains the six exact `ApplicationSource` values from the source-label table.

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

- Submitting: save button switches to saving state and is disabled.
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

The page is organized into three tabs:

- `overview`: pipeline, status controls, status history, notes, application details, and job description.
- `ai`: saved resume analysis and reanalysis controls.
- `reminder`: reminder creation and reminder guidance.

The header remains sticky and includes back navigation, the company logo and name, job title, current status badge, and overflow actions.

The company card on the overview tab uses `CompanyLogo` (44px) in place of the old first-letter box. Applications without a domain show a grey letter avatar.

### Initial data

The page uses separate `useApplication(id)` and `useResumeAnalysis(id)` queries. The application query takes the matching item from the applications-list cache as `placeholderData`, then fetches its full detail. The saved-analysis query maps an absent response to `null`; a query error also renders as no saved analysis. Both wait for the shared user-sync query. The notes editor initializes only once for an application ID, so a refetch cannot replace text the user is typing.

### Delete flow

1. The user opens the overflow action and chooses delete.
2. A confirmation modal asks `Delete this application?`.
3. `Yes, delete` calls `deleteApplication.mutateAsync(id)`.
4. On success, route to `/applications`.
5. Failure surfaces as the page error and closes the deleting state.

### Status update flow

1. Ignore the event when there is no application, an update is running, or the selected status is already current.
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

The overview tab renders the job description only when `application.jobDescription` is non-empty. The page includes an expand control that opens a modal for reading the full job description.

### Detail page state variables

```ts
const [activeTab, setActiveTab] =
  useState<"overview" | "ai" | "reminder">("overview")
const [overflowOpen, setOverflowOpen] = useState(false)
const [jdModalOpen, setJdModalOpen] = useState(false)

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

- Initial load: full-page `Skeleton` placeholders only while the application query has no cached or placeholder data.
- Initial-load error: full-page error text in red.
- Not found: `Application not found.`.
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

When no saved analysis exists:

- Show `No analysis yet`.
- Show `Compare your resume against this job description`.
- Show `Analyse resume`, disabled while analysing.
- Surface `analysisError` if present.

When saved analysis exists:

- Match score card with score out of 100, progress bar, and `scoreLabel`.
- Reanalyse button.
- Recruiter Take card.
- Strongest Points list with success icon.
- Missing Keywords pills when the array is non-empty.
- Red Flags list when the array is non-empty.
- Copy improvement prompt button.
- Analysed date from `savedAnalysis.createdAt`.

### Copy improvement prompt

The `Copy improvement prompt` action builds a prompt from the current application and saved analysis:

```ts
I applied for a ${application.jobTitle} role at ${application.companyName}.
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
| Backend resume error | `No resume uploaded. Upload one from your profile page.` |
| Other API error | Render the API error message verbatim |

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

The user picks a date and optional note, then clicks `Set reminder`. `POST /api/reminders` stores the record with `isSent: false`.

A daily 9am cron job finds unsent reminders whose `reminderDate` is today in UTC, sends an HTML email through Resend from `reminders@applyntrack.online`, then marks each record `isSent: true` so it cannot be sent twice.

### UI fields and states

| Field | Input | Required |
|---|---|---|
| Reminder Date | date | Yes |
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

The detail-page UI currently creates reminders only. The backend exposes update and delete reminder endpoints, but the page has no reminder list endpoint to support full management yet.

### Upcoming reminders placeholder

The reminder tab shows an `Upcoming reminders` card, but it is a static empty placeholder because there is no list-reminders endpoint currently.

### Important: UTC date handling

The backend stores and queries `reminderDate` in UTC. IST is UTC+5:30, so a date that is today in IST may already be tomorrow in UTC depending on the time of day.

In practice: when setting a same-day reminder late at night IST, use the next calendar day so the cron job picks it up correctly.

### Email and cron

The email contains the user's first name, job title, company name, and reminder notes when provided. The cron expression is:

```text
0 9 * * *
```

It is configured in `backend/src/jobs/reminderJob.ts` and started by `startReminderJob()` in `index.ts` after `app.listen`. Its date query uses `setUTCHours` and `setUTCDate` explicitly.

---

## 9. Known Limitations

- `STATUS_LABELS`, `SOURCE_LABELS`, date helpers, and status color maps are still local to application pages.
- The applications list has no pagination, filter, or search.
- The reminder UI cannot view, edit, or delete existing reminders because there is no list-reminders endpoint.
- The upcoming reminders card is currently a placeholder.
- UTC/IST mismatch can cause same-day reminders set late at night to be missed.
- If the backend server is down at 9am, that day's reminders are missed because there is no retry mechanism.
- `suggestions` is part of the `ResumeAnalysis` type but currently returns an empty array.
- Resume upload replaces every cached saved analysis with `null`; the detail page reflects that cache update without needing a refresh.
- Applications created before `companyDomain` existed have no domain and show letter avatars. There is no UI to add or edit a domain on an existing application.
- The update endpoint ignores an empty `companyDomain`, so a stored domain cannot be cleared through the API.
- Logo and search coverage was checked only on a small set of well-known companies. Smaller companies may be missing from Brandfetch search and fall back to a letter avatar.
- The autocomplete dropdown is mouse-only; there is no arrow-key or Enter selection yet.
