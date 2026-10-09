# Dashboard Module

Status: Built
Last updated: October 2026

## 1. Module Overview

The dashboard is the first page after sign-in and works as a morning briefing: a greeting with today's date and a one-line status summary, a pipeline strip with counts per stage, and three cards: Recent Activity, an Activity Calendar, and Needs Attention. Company logos appear in Recent Activity and Needs Attention.

This document replaces the earlier version, which described a previous layout (motivational quote, morning brief block, two-card bottom row).

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
| `staleApplications` | Applications still in `APPLIED` after 14 or more days |

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

The page uses `useAuth()` for `getToken` and `useUser()` for the greeting name. On mount it gets a token and returns early if there is none; Clerk route protection handles the sign-in redirect. The page does not call `syncUser` itself; the protected layout does that on mount.

---

## 4. Data Sources and Client-Side Derivations

The two data sources are fetched in parallel:

```ts
const [statsData, appsData] = await Promise.all([
  getDashboardStats(token),
  getApplications(token),
])
setStats(statsData.stats)
setApplications(appsData.applications)
```

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

### Header band

- Left: `Hello, {firstName}` and the subline `Here's your job search status for today.`. `firstName` is `user?.firstName`, then the first word of `user?.fullName`, then `there`.
- Right: today's date in uppercase (`WEEKDAY, D MONTH YYYY`) and a summary line: `You have {n} application(s) tracked — {x} has/have had no update in 14+ days.` `n` comes from `stats?.totalApplications ?? 0`; `x` is `staleApps.length`. `has` is used when the count is one.

### Pipeline strip

One cell per stage in the order `APPLIED`, `SCREENING`, `INTERVIEW`, `ASSIGNMENT`, `OFFER`, each showing the count and label.

- Peak stage: count and label in orange (`#FC8019`) with a full-strength top bar.
- Other nonzero stages: dark gray text with a faint top bar.
- Zero stages: light gray with no bar.

`REJECTED` is excluded by design because it is a terminal state and does not belong in a morning briefing.

### Three-column grid

Columns are sized `1fr 1.35fr 1fr`.

**Recent Activity** (header note `Last 5 changes`). Each row shows the company logo (`CompanyLogo`, 28px), company name, job title, a colored badge for the status the application moved to, and `timeAgo(entry.createdAt)`. Empty state: `No activity yet.`

Badge colors:

| Status | Badge background |
|---|---|
| APPLIED | `#1D4ED8` |
| SCREENING | `#92400E` |
| INTERVIEW | `#6D28D9` |
| ASSIGNMENT | `#C2410C` |
| OFFER | `#15803D` |
| REJECTED | `#9F1239` |

```ts
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}
```

**Activity Calendar.** A month grid with previous and next month buttons. Today is filled orange. Days with status changes are tinted and show a small dot; hovering one shows a tooltip listing that day's changes. Tooltips open to the right, left, or centered depending on the column so they stay on screen. A legend explains Today and Activity.

**Needs Attention** (header note `14+ days no update`). Each row shows the company logo (28px), company name, job title, and a red badge with the number of days since `dateApplied`. Empty state: `All applications are active.`

---

## 6. State Variables

```ts
const [stats, setStats] = useState<DashboardStats | null>(null)
const [applications, setApplications] = useState<Application[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [calendarMonth, setCalendarMonth] = useState(() => new Date())
```

There is no global state or caching layer. The dashboard fetches a fresh snapshot on every mount and does not share it with the applications page.

---

## 7. Loading and Error States

- While loading, the header shows `Loading your status...`, pipeline counts show `0`, and the Recent Activity and Needs Attention cards show `Loading...`.
- On error, the API error message is rendered in red in the header summary area.

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
- The stats fields other than `totalApplications` are fetched but unused.
- The pipeline strip does not include `REJECTED`, so users cannot see their rejection count on the dashboard.
- The calendar shows only status-change dates for the month being viewed.
- The dashboard uses the orange `#FC8019`, while the applications pages use the brand orange `#FF6B35`. The two should be unified in a design pass.
- Applications without a stored `companyDomain` show a letter avatar in place of a logo.
