# Dashboard Module

Status: Built
Last updated: October 2026

## 1. Module Overview

The dashboard is the first page after sign-in and works as a morning briefing: a greeting with today's date and a one-line status summary, a pipeline strip with counts per stage, and three cards: Recent Activity, an Activity Calendar, and Needs Attention. Company logos appear in Recent Activity and Needs Attention.

---

## 2. Backend API Contract

Both endpoints require `Authorization: Bearer <token>`. Call `getToken()` fresh before requesting them. Missing or invalid tokens return `401 { "error": "Unauthorized" }`; a valid Clerk token with no local user returns `401 { "error": "User not found. Please sync first." }`.

### GET /api/dashboard/stats

No request body.

Response `200`:

```json
{
  "stats": {
    "totalApplications": 12,
    "responseRate": 33,
    "rejectionRate": 25,
    "bestSource": "LINKED_IN",
    "staleApplications": 3
  }
}
```

| Field | Meaning |
|---|---|
| `totalApplications` | Total application count |
| `responseRate` | Integer percentage of applications that moved past `APPLIED` |
| `rejectionRate` | Integer percentage of applications with `REJECTED` status |
| `bestSource` | `ApplicationSource` value with the most non-`APPLIED` responses, or `null` |
| `staleApplications` | Applications with status `APPLIED` whose `dateApplied` is earlier than the current time minus 14 days (server local time, strict `<`). Not used by the page, which computes its own count; see the stale note in Section 9 and `docs/code-bugs.md` CB-04 |

The page reads only `totalApplications`. The other fields are fetched but not displayed.

Unexpected failures return `500 { "error": "Internal server error" }`.

### GET /api/applications

The dashboard fetches the complete list and derives the pipeline, stale list, recent activity, and calendar from it on the client. No request body. The backend orders records by `dateApplied` descending and includes status history.

Response `200`:

```json
{
  "applications": [
    {
      "id": "...",
      "userId": "...",
      "companyName": "Google",
      "companyDomain": "google.com",
      "jobTitle": "Backend Engineer",
      "jobDescription": "...",
      "status": "APPLIED",
      "source": "LINKED_IN",
      "dateApplied": "2026-08-20T00:00:00.000Z",
      "notes": "...",
      "createdAt": "...",
      "updatedAt": "...",
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

`companyDomain` is `null` for applications without a stored domain.

Unexpected failures return `500 { "error": "Internal server error" }` or the thrown error message.

---

## 3. Page Location and Auth Flow

```text
frontend/app/(protected)/dashboard/page.tsx
```

The page uses `useUser()` for the greeting name, `useDashboardStats()` for stats, and `useApplications()` for the application list. It does not call `syncUser`; the protected layout mounts the shared `useUserSync()` query. Both dashboard hooks wait until that sync query succeeds before requesting data.

---

## 4. Data Sources and Client-Side Derivations

The two data sources are independent user-scoped TanStack Query entries:

```ts
const statsQuery = useDashboardStats()
const applicationsQuery = useApplications()
const stats = statsQuery.data ?? null
const applications = applicationsQuery.data ?? []
const loading = statsQuery.isPending || applicationsQuery.isPending
const error = statsQuery.error?.message ?? applicationsQuery.error?.message ?? null
```

The cached application list is shared with the applications page. A refetch keeps cached data visible; `loading` is therefore a first-load state.

### Pipeline counts and peak stage

```ts
const pipelineCounts = PIPELINE_STAGES.reduce((acc, stage) => {
  acc[stage] = applications.filter((a) => a.status === stage).length
  return acc
}, {} as Record<string, number>)
```

`PIPELINE_STAGES` is `APPLIED`, `SCREENING`, `INTERVIEW`, `ASSIGNMENT`, `OFFER`. The peak stage is the first stage in that order that has the highest nonzero count, or `null` when every count is zero.

### Recent activity feed

Every `statusHistory` entry from every application is flattened, sorted newest first, and cut to 5. Each entry carries the company name, domain, and job title for display.

```ts
const recentActivity = applications
  .flatMap((app) =>
    (app.statusHistory ?? []).map((entry) => ({
      ...entry,
      companyName: app.companyName,
      companyDomain: app.companyDomain,
      jobTitle: app.jobTitle,
      appId: app.id,
    }))
  )
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 5)
```

### Stale applications

```ts
const staleApps = applications.filter((app) => {
  if (app.status !== "APPLIED") return false
  const days = Math.floor(
    (Date.now() - new Date(app.dateApplied).getTime()) / (1000 * 60 * 60 * 24)
  )
  return days >= 14
})
```

### Calendar data

For the month being viewed, every `statusHistory` entry dated in that month marks its day as an activity day and adds a tooltip line of the form `{companyName} — moved to {Status}`. The grid is built from the first weekday of the month, padded with empty cells to complete the last week.

---

## 5. Sections in Render Order

Layout and colors come from the shared design tokens in `frontend/app/globals.css` and the shared maps in `frontend/app/lib/status.ts` (`PIPELINE_STAGES`, `STATUS_LABELS`, `STATUS_STYLES`). `timeAgo` lives in `frontend/app/lib/dates.ts`.

### Header

- Left: a time-of-day greeting, `Good morning|afternoon|evening, {firstName}` (hour before 12, before 18, otherwise evening), and a subline. `firstName` is `user?.firstName`, then the first word of `user?.fullName`, then `there`.
- Subline: `{n} application(s) tracked — {x} has/have gone quiet →`. `n` is `stats?.totalApplications ?? 0` and `x` is `staleApps.length`. The orange `gone quiet` part links to the Gone quiet card (`#needs-attention`). With no stale applications it reads `none have gone quiet`. While loading it reads `Loading your status...`; on error it shows the API message in red; with zero applications it reads `You haven't added any applications yet.`
- Right: a bordered date chip, for example `Thu, Oct 15`.

### Pipeline strip

One cell per stage in the order `APPLIED`, `SCREENING`, `INTERVIEW`, `ASSIGNMENT`, `OFFER`: count, status dot and label, and a colored bar along the bottom edge. The whole strip links to `/applications`. There is no peak-stage highlight any more. `REJECTED` is excluded by design because it is a terminal state and does not belong in a morning briefing.

### Empty state

When the application list has loaded and is empty, the area below the strip shows `Add your first application` and an `Add application` button that links to `/applications/new`.

### Main area (12-column grid: calendar 8, right rail 4)

**Activity calendar** (left). A month grid (Sunday first) with a `Today` button and previous/next month buttons. Every `statusHistory` entry in the viewed month appears as a chip with the company logo and name on its day (the status color tints the letter-avatar fallback). A day shows up to two chips and `+n more`. Clicking a day with activity opens a popover listing each change (`Company  Previous → New`) with an `Open →` link to the application. Today is a filled orange number on a tinted cell.

**Gone quiet** (right rail, peach card, note `No reply after 14 days`). One row per stale application: whole days since `dateApplied` in large orange type, logo, company, job title, and a `Remind me` button that links to `/applications/{id}?tab=reminder` (the detail page opens on its Reminder tab). Empty state: `All applications are active.`

**Recent activity** (right rail, `View all →` links to `/applications`). The newest five status changes as a timeline: company logo, company name (links to the application), `Previous → New` status, job title and `timeAgo(entry.createdAt)`. The previous status is derived client-side from the application's earlier history entry. Empty state: `No activity yet.`

```ts
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}
```

---

## 6. State Variables

```ts
const [now] = useState(() => Date.now())
const [calendarMonth, setCalendarMonth] = useState(() => new Date())
const [openDay, setOpenDay] = useState<number | null>(null)
```

`now` is captured once so render stays pure (the stale-day arithmetic and the greeting use it). `calendarMonth` and `openDay` (the day whose popover is open) are the only other page state. Server data and its loading/error state come from the two query hooks.

---

## 7. Loading and Error States

- On the first load, the subline shows `Loading your status...`, pipeline counts show `0`, and the Recent activity and Gone quiet cards show `Loading...`. Cached results stay rendered during a background refetch.
- On error, the API error message is rendered in red in the header subline.

---

## 8. What Is Deliberately Not Here

| Item | Reason excluded |
|---|---|
| Rejection rate | Psychologically harmful as a morning metric for a job seeker |
| Best source | Analytical insight, not actionable morning information; reserved for an Analytics page |
| Response rate % | Not immediately actionable; reserved for an Analytics page |
| Kanban board | Too much information for a morning brief; it lives on the Applications page |

---

## 9. Known Limitations

- The `Today` label in Recent Activity applies to every entry from the current 24-hour window regardless of time of day, so a status changed at 11pm and one at 1am can both show `Today`.
- The stale threshold is hardcoded to 14 days on the client to match the backend definition. If the backend threshold changes, the client must be updated manually. The page does not use `stats.staleApplications`.
- "Stale" is defined five different ways across the product: the backend stat (`APPLIED`, strictly more than 14 days), this page (`APPLIED`, whole days since `dateApplied` `>= 14`), the Applications header chip (`APPLIED`, elapsed time `>= 14` days), the Applications card badge (any status, days since the last status change), and the PRD ("no status change in fourteen plus days"). This page and the backend can differ by a day at the boundary. Known issue — see `docs/code-bugs.md` CB-04.
- The header subline and the Gone quiet card say applications have "gone quiet" ("no reply after 14 days"), but the count only includes applications still in `APPLIED` status. An application that has moved on to another stage and then gone quiet is not counted.
- The stats fields other than `totalApplications` are fetched but unused.
- The pipeline strip does not include `REJECTED`, so users cannot see their rejection count on the dashboard.
- The calendar shows only status-change dates for the month being viewed. A day with more than two changes shows `+n more`, and all of them are listed in its popover.
- Applications without a stored `companyDomain` show a letter avatar in place of a logo.
