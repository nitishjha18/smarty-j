# Applications Module

Status: Built — UI redesign pending
Last updated: September 2026

## 1. Module Overview

The applications module covers the applications list, create application, and application detail pages; the detail page also contains Resume Analysis, Interview Prep, and reminder creation. All of these features use the authenticated application, AI, and reminder endpoints described below.

---

## 2. Backend API Contract

All routes in this section require `Authorization: Bearer <token>`. Get a fresh token with `const token = await getToken()` before each request. A missing or invalid token returns `401 { "error": "Unauthorized" }`; a valid Clerk token without a local user returns `401 { "error": "User not found. Please sync first." }`.

### Application values

```text
ApplicationStatus: APPLIED | SCREENING | INTERVIEW | ASSIGNMENT | OFFER | REJECTED
ApplicationSource: LINKED_IN | NAUKARI | REFERAL | COLDEMAIL | SOCIAL_MEDIA | OTHER_JOB_APPS
```

`NAUKARI`, `REFERAL`, and `COLDEMAIL` are the exact persisted enum values. Do not correct them in requests.

### POST /api/applications

Create an application. `companyName`, `jobTitle`, and `source` are required. `jobDescription`, `notes`, and `dateApplied` are optional; `dateApplied` defaults to now.

```json
{
  "companyName": "Google",
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

The service automatically creates an `APPLIED` `StatusHistory` record. Errors: `400 { "error": "companyName, jobTitle, and source are required" }`; unexpected failures return `500 { "error": "Internal server error" }` or the thrown error message.

### GET /api/applications

No request body. Applications are ordered by `dateApplied` descending and include `statusHistory`.

Response `200`:

```json
{
  "applications": [
    {
      "id": "...",
      "companyName": "Google",
      "jobTitle": "Backend Engineer",
      "jobDescription": "...",
      "status": "APPLIED",
      "source": "LINKED_IN",
      "dateApplied": "2026-08-20T00:00:00.000Z",
      "notes": "...",
      "createdAt": "...",
      "updatedAt": "...",
      "userId": "...",
      "statusHistory": [
        {
          "id": "...",
          "applicationId": "...",
          "status": "APPLIED",
          "createdAt": "..."
        }
      ]
    }
  ]
}
```

Unexpected failures return `500 { "error": "Internal server error" }` or the thrown error message.

### GET /api/applications/:id

No request body.

Response `200`:

```json
{
  "application": {
    "id": "...",
    "companyName": "Google",
    "jobTitle": "Backend Engineer",
    "jobDescription": "...",
    "status": "SCREENING",
    "source": "LINKED_IN",
    "dateApplied": "...",
    "notes": "...",
    "createdAt": "...",
    "updatedAt": "...",
    "userId": "...",
    "statusHistory": [
      { "id": "...", "applicationId": "...", "status": "SCREENING", "createdAt": "..." },
      { "id": "...", "applicationId": "...", "status": "APPLIED", "createdAt": "..." }
    ]
  }
}
```

Errors: `404 { "error": "Application not found" }`; unexpected failures return `500 { "error": "Internal server error" }` or the thrown error message.

### PUT /api/applications/:id

All body fields are optional; send only fields that change.

```json
{
  "companyName": "Google",
  "jobTitle": "Senior Backend Engineer",
  "jobDescription": "...",
  "source": "LINKED_IN",
  "status": "SCREENING",
  "notes": "Updated notes",
  "dateApplied": "2026-08-20"
}
```

Response `200` is `{ "application": { ... } }`, using the full application shape from `GET /api/applications/:id`, including `statusHistory`. When `status` changes, the service automatically creates a new `StatusHistory` record. Errors: `404 { "error": "Application not found" }`; unexpected failures return `500 { "error": "Internal server error" }` or the thrown error message.

### DELETE /api/applications/:id

No request body.

Response `200`:

```json
{ "message": "Application deleted successfully" }
```

Errors: `404 { "error": "Application not found" }`; unexpected failures return `500 { "error": "Internal server error" }` or the thrown error message.

### POST /api/ai/analyze-resume

Compare the signed-in user's stored resume text against an application's job description.

```json
{ "applicationId": "cmsyideb30007ncphs5gpgeph" }
```

Response `200`:

```json
{
  "analysis": {
    "matchScore": 72,
    "missingKeywords": ["Docker", "Kubernetes", "Redis"],
    "suggestions": [
      "Highlight your Node.js experience in the summary",
      "Add a projects section showing distributed systems work"
    ]
  }
}
```

Errors: `400 { "error": "applicationId is required" }`; `400 { "error": "Resume not found. Please upload your resume first." }`; `400 { "error": "Application not found." }`; `400 { "error": "No job description found for this application." }`; unexpected non-Error failures return `500 { "error": "Internal server error" }`.

### POST /api/ai/interview-prep

Generate and persist questions for an application.

```json
{ "applicationId": "cmsyideb30007ncphs5gpgeph" }
```

Response `201`:

```json
{
  "interviewPrep": {
    "interviewId": "cmsz36kto0001t0mfds7zwkpf",
    "questions": [
      {
        "id": "cmsz36lxc0003t0mfsftdvet6",
        "question": "What is the difference between horizontal and vertical scaling?",
        "userAnswer": null,
        "aiInterviewId": "cmsz36kto0001t0mfds7zwkpf",
        "questionNumber": 1,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
}
```

Errors: `400 { "error": "applicationId is required" }`; `400 { "error": "Application not found." }`; `400 { "error": "No job description found for this application." }`; unexpected non-Error failures return `500 { "error": "Internal server error" }`.

### POST /api/ai/save-answers

Save one or more non-empty answers.

```json
{
  "answers": [
    {
      "questionId": "cmsz36lxc0003t0mfsftdvet6",
      "answer": "Horizontal scaling adds more machines..."
    },
    {
      "questionId": "cmsz36nih000ft0mfdcn94jc0",
      "answer": "Database indexing creates a data structure..."
    }
  ]
}
```

Response `200`:

```json
{ "saved": 2 }
```

Errors: `400 { "error": "answers array is required" }` when `answers` is missing, not an array, or empty; unexpected failures return `500 { "error": "Internal server error" }`.

### GET /api/ai/answers/:appId

No request body. The endpoint returns every saved interview session for the application, ordered by newest interview first, with questions ordered by `questionNumber` ascending.

Response `200`:

```json
{
  "interviews": [
    {
      "id": "cmsz36kto0001t0mfds7zwkpf",
      "applicationId": "cmsyideb30007ncphs5gpgeph",
      "overallScore": null,
      "overallFeedback": null,
      "createdAt": "...",
      "updatedAt": "...",
      "questions": [
        {
          "id": "cmsz36lxc0003t0mfsftdvet6",
          "question": "What is the difference between horizontal and vertical scaling?",
          "userAnswer": "Horizontal scaling adds more machines...",
          "questionNumber": 1,
          "createdAt": "...",
          "updatedAt": "..."
        }
      ]
    }
  ]
}
```

Errors: `400 { "error": "Application not found." }`; unexpected non-Error failures return `500 { "error": "Internal server error" }`.

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
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Errors: `400 { "error": "applicationId and reminderDate are required" }`; `400 { "error": "Application not found." }`; unexpected non-Error failures return `500 { "error": "Internal server error" }`.

### PUT /api/reminders/:id

`reminderDate` is required; `notes` is optional.

```json
{
  "reminderDate": "2026-09-01",
  "notes": "Interview scheduled for 3pm"
}
```

Response `200`:

```json
{
  "reminder": {
    "id": "...",
    "applicationId": "...",
    "userId": "...",
    "reminderDate": "2026-09-01T00:00:00.000Z",
    "isSent": false,
    "notes": "Interview scheduled for 3pm",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Errors: `400 { "error": "reminderDate is required" }`; `400 { "error": "Reminder not found." }`; unexpected non-Error failures return `500 { "error": "Internal server error" }`.

### DELETE /api/reminders/:id

No request body.

Response `200`:

```json
{ "message": "Reminder deleted successfully" }
```

Errors: `400 { "error": "Reminder not found." }`; unexpected non-Error failures return `500 { "error": "Internal server error" }`.

---

## 3. Shared Utilities

`STATUS_LABELS`, `SOURCE_LABELS`, and `formatDate` are currently duplicated between the list and detail pages. `[UI Polish Phase Task]` Extract them to `lib/applicationUtils.ts`.

```ts
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  ASSIGNMENT: "Assignment",
  OFFER: "Offer",
  REJECTED: "Rejected",
}

const SOURCE_LABELS: Record<ApplicationSource, string> = {
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
app/(protected)/applications/page.tsx
```

### Purpose and content

The list is the user's application index. It renders one bordered row per application, ordered by the backend's descending `dateApplied` order. Each row shows the company name, job title, source label, `en-IN` formatted date, and color-coded status pill.

| Status | UI color |
|---|---|
| APPLIED | blue |
| SCREENING | yellow |
| INTERVIEW | purple |
| ASSIGNMENT | orange |
| OFFER | green |
| REJECTED | red |

### States

- Loading: `Loading your applications...`
- Error: API error message in red.
- Empty: bordered, centered card with `No applications yet`, `Start tracking by adding your first application.`, and a `+ New Application` button.
- Populated: a single bordered container of clickable application rows.

### Fetch pattern

```ts
const token = await getToken()
if (!token) return
const data = await getApplications(token)
setApplications(data.applications)
```

This is one `GET /api/applications` call on mount. The API includes `statusHistory`; the list does not render it.

### Source labels

| Enum value | Display label |
|---|---|
| `LINKED_IN` | LinkedIn |
| `NAUKARI` | Naukri |
| `REFERAL` | Referral |
| `COLDEMAIL` | Cold Email |
| `SOCIAL_MEDIA` | Social Media |
| `OTHER_JOB_APPS` | Other |

### Navigation

`+ New Application` navigates to `/applications/new`. Clicking an application row navigates to `/applications/:id`.

---

## 5. Create Application Page

### Location

```text
app/(protected)/applications/new/page.tsx
```

### Purpose and fields

The page creates one application and then routes directly to its detail page.

| Field | Input | Required | Initial value |
|---|---|---|---|
| `companyName` | text | Yes | `""` |
| `jobTitle` | text | Yes | `""` |
| `source` | select | Yes | `LINKED_IN` |
| `dateApplied` | date | No | `new Date().toISOString().split("T")[0]` |
| `jobDescription` | textarea | No | `""` |
| `notes` | textarea | No | `""` |

The source select contains the six exact `ApplicationSource` values from the source-label table.

### Validation and submit behavior

Before submitting, require `companyName`, `jobTitle`, and `source`. If any is empty, render `Company name, job title, and source are required.` in red and do not call the API. There is no Zod validation.

On submit, call `POST /api/applications`. On success, the backend creates the initial `APPLIED` history record and the page redirects to `/applications/${data.application.id}` rather than the list.

```ts
const token = await getToken()
if (!token) return
const data = await createApplication(token, form)
router.push(`/applications/${data.application.id}`)
```

### States

- Submitting: `Save Application` becomes `Saving...` and the button is disabled.
- Error: client validation or API error is shown in red above the action buttons.
- Cancel: calls `router.back()`.

---

## 6. Application Detail Page

### Location and purpose

```text
app/(protected)/applications/[id]/page.tsx
```

This is the single source of truth for an application: its status, full history, notes, job description, AI features, and reminder creation all render here.

### Render order

1. **Back button** — `← Back to applications`, linking to `/applications`.
2. **Header** — company name as title, job title as subtitle, and a delete control on the right.
3. **Meta row** — source label and `formatDate(application.dateApplied)`.
4. **Inline error** — shown for status, notes, or delete errors without replacing the page.
5. **Status section** — all six status pills. The current status has its matching color; other pills are neutral. Clicking another status waits for the API response before rendering the update.
6. **History section** — every `statusHistory` record, most recent first, with status badge and date.
7. **Notes section** — textarea initialized from `application.notes ?? ""`; its save button is disabled unless `notes !== (application.notes ?? "")`.
8. **Job Description section** — pre-wrapped text, rendered only when `application.jobDescription` is non-empty.
9. **AI Features** — Resume Analysis and Interview Prep, specified in Section 7.
10. **Reminders** — reminder creation, specified in Section 8.

### Initial API calls

On mount, load the application and saved interview sessions in parallel:

```ts
const [appData, answersData] = await Promise.all([
  getApplication(token, id),
  getAnswers(token, id).catch(() => ({ interviews: [] })),
])
```

Set `application` from `appData.application`, initialize `notes` with `app.notes ?? ""`, and use every existing interview question to pre-populate `answers[q.id] = q.userAnswer ?? ""`.

### Delete flow

1. The user clicks `Delete`.
2. Replace it inline with `Are you sure?`, `Yes, delete`, and `Cancel`.
3. `Yes, delete` calls `deleteApplication(token, id)`.
4. On success, call `router.push("/applications")`.
5. `Cancel` hides the confirmation. A failed delete surfaces the error, clears `deleting`, and hides the confirmation.

### Status update flow

1. Ignore the event when there is no application, an update is running, or the selected status is already current.
2. Call `updateApplication(token, id, { status: newStatus })`.
3. Replace local application state with `data.application`.
4. The backend appends a `StatusHistory` record when the status changed.

This is intentionally non-optimistic: the page shows the change only after the response succeeds.

### Notes save flow

1. Disable Save Notes when the current content equals `application.notes ?? ""`.
2. Call `updateApplication(token, id, { notes })`.
3. Replace local application state with `data.application`.

### Detail page state variables

```ts
const [application, setApplication] = useState<Application | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

const [notes, setNotes] = useState("")
const [savingNotes, setSavingNotes] = useState(false)
const [updatingStatus, setUpdatingStatus] = useState(false)
const [confirmDelete, setConfirmDelete] = useState(false)
const [deleting, setDeleting] = useState(false)

const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
const [analyzingResume, setAnalyzingResume] = useState(false)
const [analysisError, setAnalysisError] = useState<string | null>(null)

const [interviews, setInterviews] = useState<AiInterview[]>([])
const [generatingPrep, setGeneratingPrep] = useState(false)
const [prepError, setPrepError] = useState<string | null>(null)
const [answers, setAnswers] = useState<Record<string, string>>({})
const [savingAnswers, setSavingAnswers] = useState(false)
const [answersSaved, setAnswersSaved] = useState(false)

const [reminderDate, setReminderDate] = useState("")
const [reminderNotes, setReminderNotes] = useState("")
const [savingReminder, setSavingReminder] = useState(false)
const [reminderSaved, setReminderSaved] = useState(false)
const [reminderError, setReminderError] = useState<string | null>(null)
```

### Page states

- Initial load: full-page `Loading...`.
- Initial-load error: full-page error text in red.
- Not found: `Application not found.`.
- Per-operation errors: retain the rendered application and display the error inline.

---

## 7. AI Features (lives on detail page)

### Resume Analysis

#### Trigger and pre-check

`Analyze Resume` triggers the feature. Before any request, check `application.jobDescription`. When it is empty, set `analysisError` to `Add a job description to this application first.` and do not call the API.

Otherwise, clear `analysis` and `analysisError`, set `analyzingResume`, then call:

```ts
const data = await analyzeResume(token, id)
setAnalysis(data.analysis)
```

The exact request and response shapes are in `POST /api/ai/analyze-resume` in Section 2.

#### Display and persistence

- Render `matchScore` as a large bold number with `% match with this job description`.
- Render `missingKeywords` as red pills.
- Render `suggestions` as an arrow list.
- Results are not persisted; each click recomputes them from the current resume and job description.

#### Error handling

| Condition | UI behavior |
|---|---|
| No job description | `Add a job description to this application first.`; no API call |
| Backend resume error | `No resume uploaded. Upload one from your profile page.` |
| Any other API error | Render the API error message verbatim |

### Interview Prep

#### Trigger and on-mount behavior

Use `Generate Questions` when no questions exist, then `Regenerate` once questions exist. Generating a new set replaces the questions shown in the component with the newly returned set and resets the answer confirmation.

On mount, `getAnswers(token, id)` runs in the `Promise.all` shown in Section 6. The component retains the `.catch(() => ({ interviews: [] }))` pattern so a failed answers request is treated as an empty interview state. For returned sessions, pre-populate the `answers` map from saved `userAnswer` values.

#### Generate questions

```ts
const data = await generateInterviewPrep(token, id)
```

The request and response shapes are in `POST /api/ai/interview-prep` in Section 2. Construct the displayed session from `data.interviewPrep.interviewId` and `data.interviewPrep.questions`; initialize every new question's answer as `q.userAnswer ?? ""`.

#### Save answers

Filter blank answers before saving:

```ts
const answersPayload = Object.entries(answers)
  .filter(([, answer]) => answer.trim() !== "")
  .map(([questionId, answer]) => ({ questionId, answer }))

await saveAnswers(token, answersPayload)
```

The request and response shapes are in `POST /api/ai/save-answers` in Section 2.

#### Display and error handling

Render questions in `questionNumber` ascending order as a numbered list. Each question has a textarea. Render one Save Answers button below the list, and show `Answers saved.` after a successful save; hide that confirmation when generating a replacement set.

| Operation | Failure behavior |
|---|---|
| Generate Questions | Set `prepError` to the API error message or `Failed to generate questions` |
| Save Answers | Set `prepError` to the API error message or `Failed to save answers` |

### Prerequisites and type definition

Resume Analysis requires an uploaded resume. Without one, the backend returns the resume-not-found error shown above. Interview Prep uses the application's job description and can run without a resume.

```ts
interface ResumeAnalysis {
  matchScore: number
  missingKeywords: string[]
  suggestions: string[]
}
```

`ResumeAnalysis` is defined inline in the detail page.

---

## 8. Reminders (lives on detail page)

### How it works

The user picks a date and optional note, then clicks `Set Reminder`. `POST /api/reminders` stores the record with `isSent: false`. A daily 9am cron job finds unsent reminders whose `reminderDate` is today in UTC, sends an HTML email through Resend from `reminders@applyntrack.online`, then marks each record `isSent: true` so it cannot be sent twice.

### UI fields and states

| Field | Input | Required |
|---|---|---|
| Reminder Date | date | Yes |
| Notes | text | No |

The date input has `min` set to today's date. Before the API call, a missing date sets `reminderError` to `Please select a reminder date.`.

| State | UI behavior |
|---|---|
| Missing date | `Please select a reminder date.` in red |
| Saving | `Set Reminder` becomes `Saving...` and is disabled |
| Success | `Reminder set.` in green; clear `reminderDate` and `reminderNotes` |
| Error | Render the API error message in red |

The implementation sends the optional note as `reminderNotes.trim() || undefined`:

```ts
await createReminder(token, {
  applicationId: id,
  reminderDate,
  notes: reminderNotes.trim() || undefined,
})
```

The exact request, response, and errors are in `POST /api/reminders` in Section 2. The backend also exposes update and delete contracts in Section 2, though this detail-page UI currently creates reminders only.

### Important: UTC date handling

The backend stores and queries `reminderDate` in UTC. IST is UTC+5:30, so a date that is today in IST may already be tomorrow in UTC depending on the time of day.

**In practice:** when setting a same-day reminder late at night IST, use the next calendar day so the cron job picks it up correctly.

### Email and cron

The email contains the user's first name, job title, company name, and reminder notes when provided. The cron expression is:

```text
0 9 * * *
```

It is configured in `backend/src/jobs/reminderJob.ts` and started by `startReminderJob()` in `index.ts` after `app.listen`. Its date query uses `setUTCHours` and `setUTCDate` explicitly.

---

## 9. Known Limitations

- `STATUS_LABELS`, `SOURCE_LABELS`, and `formatDate` are duplicated across list and detail pages; extracting them to `lib/applicationUtils.ts` is a UI polish phase task.
- The list has no pagination, filter, or search.
- `ResumeAnalysis` is inline in the detail page rather than `types/index.ts`.
- The notes save button compares against `application.notes ?? ""`; when notes is `null` and the textarea is empty, it remains correctly disabled.
- Resume Analysis results disappear on refresh by design because they are not persisted.
- Regenerating interview questions leaves the previous `AiInterview` record in the database but no longer shows it in the component.
- The detail-page answers fetch is swallowed as an empty state through `.catch(() => ({ interviews: [] }))`.
- The reminder UI cannot view, edit, or delete existing reminders, although update and delete backend endpoints exist.
- UTC/IST mismatch can cause same-day reminders set late at night to be missed.
- If the backend server is down at 9am, that day's reminders are missed because there is no retry mechanism.
