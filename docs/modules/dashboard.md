# Dashboard Module

Status: Built — UI redesign pending
Last updated: September 2026

## 1. Module Overview

The dashboard is the first page after sign-in and is designed as a morning briefing rather than a data dump: it gives the user progress and clarity in under five seconds through a personal greeting, a concise status summary, pipeline counts, stale applications, and recent status activity.

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

Unexpected failures return `500 { "error": "Internal server error" }`.

### GET /api/applications

This dashboard call fetches the complete list for client-side derivations. It has no request body. The backend orders records by `dateApplied` descending and includes status history.

Response `200`:

```json
{
  "applications": [
    {
      "id": "...",
      "userId": "...",
      "companyName": "Google",
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

Unexpected failures return `500 { "error": "Internal server error" }` or the thrown error message.

---

## 3. Page Location and Auth Flow

```text
app/(protected)/dashboard/page.tsx
```

The page uses `useAuth()` for `getToken` and `useUser()` for the greeting name. On mount, it gets a token, calls `syncUser(token)` to ensure the local user row exists, then fetches the dashboard data. If no token is available, the request returns early; Clerk route protection handles the sign-in redirect.

---

## 4. Data Sources and Client-Side Derivations

After `syncUser(token)` resolves, fetch the two data sources in parallel:

```ts
const [statsData, appsData] = await Promise.all([
  getDashboardStats(token),
  getApplications(token),
])
setStats(statsData.stats)
setApplications(appsData.applications)
```

`totalApplications` is used in the morning brief. The page fetches `responseRate`, `rejectionRate`, `bestSource`, and `staleApplications` but does not display them. It derives the pipeline, stale records, and recent activity from `applications`.

### Pipeline counts

```ts
const pipelineCounts = PIPELINE_STAGES.reduce((acc, stage) => {
  acc[stage] = applications.filter((a) => a.status === stage).length
  return acc
}, {} as Record<string, number>)
```

`PIPELINE_STAGES` is:

```ts
const PIPELINE_STAGES: ApplicationStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "ASSIGNMENT",
  "OFFER",
]
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

### Recent activity feed

```ts
const recentActivity = applications
  .flatMap((app) =>
    (app.statusHistory ?? []).map((entry) => ({
      ...entry,
      companyName: app.companyName,
      appId: app.id,
    }))
  )
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 5)
```

---

## 5. Sections in Render Order

### Greeting

Render `Hello, {firstName}` and the static subline `Here's your job search status for today.`. Resolve `firstName` in this order:

```ts
const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "there"
```

### Motivational quote

Render one static, left-border-accented quote:

```text
"Success is the sum of small efforts, repeated day in and day out."
— Robert Collier
```

### Morning brief sentence

Render the current date above this format:

```text
You have {totalApplications} applications tracked — {staleCount} has/have had no update in 14+ days.
```

`totalApplications` comes from `stats?.totalApplications ?? 0`; `staleCount` is `staleApps.length`. Use `has` when the count is one, otherwise `have`.

### Pipeline strip

Render a horizontal strip in this order: `APPLIED → SCREENING → INTERVIEW → ASSIGNMENT → OFFER`. Each stage displays its count and label. A zero count uses lighter gray; a nonzero count uses full dark text.

`REJECTED` is excluded by design because it is a terminal state and does not belong in the morning briefing, though it remains visible in applications pages.

### Needs Attention

Render `staleApps` in the left card. Each row shows company name, job title, and the calculated number of days since `dateApplied`. The empty state is `All applications are active.`.

### Recent Activity

Render `recentActivity` in the right card. Each entry shows the company name, the status it moved to, and `timeAgo(entry.createdAt)`. The empty state is `No activity yet.`.

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
const [stats, setStats] = useState<DashboardStats | null>(null)
const [applications, setApplications] = useState<Application[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
```

There is no global state or caching layer. The dashboard fetches a fresh application snapshot on every mount and does not share it with the applications list page.

---

## 7. Loading and Error States

- While loading, pipeline counts show `—`, the morning brief shows `Loading your status...`, and both bottom cards show `Loading...`.
- On error, render the API error message in red in the morning brief area.
- Needs Attention has the empty state `All applications are active.`.
- Recent Activity has the empty state `No activity yet.`.

---

## 8. What Is Deliberately Not Here

These items were considered and explicitly excluded:

| Item | Reason excluded |
|---|---|
| Rejection rate | Psychologically harmful as a morning metric for a job seeker |
| Best source | Analytical insight, not actionable morning information — reserved for Analytics page |
| Bar chart of applications by status | Pipeline strip communicates the same information more cleanly |
| Response rate % | Not immediately actionable — reserved for Analytics page |
| Kanban board | Too much information for a morning brief, belongs on Applications page |

---

## 9. Known Limitations

- Recent activity "Today" label applies to all entries from the current calendar day regardless of time — a status changed at 11pm and one at 1am both show "Today"
- Stale threshold is hardcoded to 14 days on the client to match the backend definition — if the backend threshold changes the client must be updated manually
- Motivational quote is static — rotating quotes is a polish-phase feature
- Pipeline strip does not include REJECTED — users cannot see rejection count from the dashboard
