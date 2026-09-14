"use client"

import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getApplications } from "../../lib/api"
import { Application, ApplicationStatus, ApplicationSource } from "../../types"

// ─── Shared utilities (docs/modules/applications.md §3) ───────────────────
// Duplicated in the detail page today; extracting to lib/applicationUtils.ts
// is a separate UI-polish-phase task, not part of this redesign.

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

// ─── Design tokens (docs/context.md §6 + applications-redesign.html) ──────
// Brand orange kept as #FC8019 to match the color already in use on this
// page, rather than the #FF6B35 documented in context.md — confirmed with
// Nitish before implementing.

const STATUS_ORDER: ApplicationStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "ASSIGNMENT",
  "OFFER",
  "REJECTED",
]

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  APPLIED: "#1D4ED8",
  SCREENING: "#92400E",
  INTERVIEW: "#6D28D9",
  ASSIGNMENT: "#C2410C",
  OFFER: "#15803D",
  REJECTED: "#9F1239",
}

const STATUS_TINTS: Record<ApplicationStatus, string> = {
  APPLIED: "#EFF6FF",
  SCREENING: "#FFFBEB",
  INTERVIEW: "#F5F3FF",
  ASSIGNMENT: "#FFF7ED",
  OFFER: "#F0FDF4",
  REJECTED: "#FFF1F2",
}

const BRAND = "#FC8019"

// Backend's definition of "stale" (dashboard.md §2/§8): APPLIED status,
// 14+ days since dateApplied. Drives the header chip only.
const STALE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000

// Per-card "Nd" badge: broader, presentation-only metric — days since the
// application's last status change, shown on a card in any status once
// it crosses the same 14-day threshold. Computed client-side from the
// statusHistory already included on each application; no new endpoint.
function daysSinceLastStatusChange(app: Application): number {
  const history = app.statusHistory ?? []
  const lastChangeAt =
    history.length > 0
      ? history.reduce((latest: (typeof history)[number], entry: (typeof history)[number]) =>
          new Date(entry.createdAt) > new Date(latest.createdAt) ? entry : latest
        ).createdAt
      : app.updatedAt

  const diff = Date.now() - new Date(lastChangeAt).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ─── Icons ──────────────────────────────────────────────────────────────

function ChevronIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[#D1D5DB] shrink-0"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function AlertTriangleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )
}

function SourceIcon({ source }: { source: ApplicationSource }) {
  const common = {
    width: 10,
    height: 10,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "text-[#D1D5DB] shrink-0",
  }

  switch (source) {
    case "LINKED_IN":
      return (
        <svg {...common}>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      )
    case "REFERAL":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case "NAUKARI":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      )
    case "COLDEMAIL":
      return (
        <svg {...common}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      )
    case "SOCIAL_MEDIA":
      return (
        <svg {...common}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )
    case "OTHER_JOB_APPS":
    default:
      return (
        <svg {...common}>
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      )
  }
}

// ─── Sub-components (kept local to this file — no other redesigned page ───
// in this codebase has factored out separate component files yet) ─────────

function ApplicationCard({ app, onClick }: { app: Application; onClick: () => void }) {
  const days = daysSinceLastStatusChange(app)
  const isStale = days >= 14

  return (
    <div
      onClick={onClick}
      className="group bg-white border border-[#E5E7EB] border-l-[3px] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] px-[14px] py-[13px] cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)] hover:-translate-y-[1px]"
      style={{ borderLeftColor: "transparent" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderLeftColor = STATUS_COLORS[app.status])}
      onMouseLeave={(e) => (e.currentTarget.style.borderLeftColor = "transparent")}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[13.5px] font-bold text-[#111827] leading-[1.3] truncate">
          {app.companyName}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {isStale && (
            <span className="inline-flex items-center text-[10px] font-bold text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] px-[5px] py-[1px] rounded-full">
              {days}d
            </span>
          )}
          <span className="mt-px transition-transform group-hover:translate-x-[2px] group-hover:text-[#6B7280]">
            <ChevronIcon />
          </span>
        </div>
      </div>
      <div className="text-xs text-[#6B7280] mb-2.5 truncate">{app.jobTitle}</div>
      <div className="flex items-center justify-between gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9CA3AF]">
          <SourceIcon source={app.source} />
          {SOURCE_LABELS[app.source]}
        </span>
        <span className="text-[11px] font-medium text-[#9CA3AF] whitespace-nowrap">
          {formatDate(app.dateApplied)}
        </span>
      </div>
    </div>
  )
}

function BoardColumn({
  status,
  items,
  onCardClick,
}: {
  status: ApplicationStatus
  items: Application[]
  onCardClick: (id: string) => void
}) {
  const color = STATUS_COLORS[status]
  const tint = STATUS_TINTS[status]

  if (items.length === 0) {
    return (
      <div className="min-w-0 w-full flex flex-col gap-1.5">
        <div className="flex items-center justify-between pb-1.5 border-b-[1.5px] border-dashed border-[#E5E7EB]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color, opacity: 0.5 }} />
            <span className="text-[11px] font-medium text-[#9CA3AF] truncate max-w-[60px]">
              {STATUS_LABELS[status]}
            </span>
          </div>
          <span className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center bg-[#F3F4F6] text-[#9CA3AF] shrink-0">
            0
          </span>
        </div>
        <div className="border-[1.5px] border-dashed border-[#E5E7EB] rounded-[10px] px-2 py-4 flex flex-col items-center justify-center gap-1 min-h-[64px] opacity-60">
          <span className="text-[10px] text-[#D1D5DB] font-medium text-center truncate max-w-full">
            No {STATUS_LABELS[status].toLowerCase()}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 w-full flex flex-col gap-2">
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#E5E7EB]">
        <div className="flex items-center gap-[7px]">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[12.5px] font-semibold text-[#374151] whitespace-nowrap truncate">
            {STATUS_LABELS[status]}
          </span>
        </div>
        <span
          className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: tint, color }}
        >
          {items.length}
        </span>
      </div>
      {items.map((app) => (
        <ApplicationCard key={app.id} app={app} onClick={() => onCardClick(app.id)} />
      ))}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = await getToken()
        if (!token) return
        const data = await getApplications(token)
        setApplications(data.applications)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const columns = STATUS_ORDER.map((status) => ({
    status,
    items: applications.filter((app) => app.status === status),
  }))

  // Header chip — matches the backend's stale definition exactly
  // (dashboard.md §2/§8), unlike the per-card badge above.
  const staleCount = applications.filter(
    (app) =>
      app.status === "APPLIED" &&
      Date.now() - new Date(app.dateApplied).getTime() >= STALE_THRESHOLD_MS
  ).length

  const goToNew = () => router.push("/applications/new")
  const goToDetail = (id: string) => router.push(`/applications/${id}`)

  // layout.tsx wraps children in <main className="min-h-full p-6"> (24px padding).
  // We cancel that padding with -m-6 so the header can sit flush against the
  // sidebar border like the mockup, then re-apply padding inside the scroll area.
  return (
    <div className="h-screen flex flex-col -m-6">
      {/* Header */}
      <header className="shrink-0 h-[60px] flex items-center gap-4 px-7 border-b border-[#E5E7EB] bg-white">
        <span className="text-[18px] font-bold text-[#111827] tracking-[-0.3px]">Applications</span>

        {!loading && !error && (
          <span className="text-xs font-semibold text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-full">
            {applications.length}
          </span>
        )}

        {!loading && !error && applications.length > 0 && (
          staleCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-1 rounded-full">
              <AlertTriangleIcon />
              {staleCount} stale — no update in 14+ days
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 rounded-full">
              <CheckIcon />
              All caught up — no stale applications
            </span>
          )
        )}

        <div className="ml-auto flex items-center gap-2.5">
          <button
            onClick={goToNew}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-[6px] text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            <PlusIcon />
            New application
          </button>
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-[#9CA3AF]">Loading your applications...</div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {/* Empty state — zero applications total */}
      {!loading && !error && applications.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3.5 px-5 text-center">
          <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center" style={{ backgroundColor: "#FFF4EC" }}>
            <FileIcon />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#111827] mb-1.5">No applications yet</p>
            <p className="text-[13px] text-[#6B7280] max-w-[280px] leading-relaxed">
              Start tracking your job search — add your first application and never lose track of where you stand.
            </p>
          </div>
          <button
            onClick={goToNew}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-[6px] text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            <PlusIcon />
            Add first application
          </button>
        </div>
      )}

      {/* Board */}
      {!loading && !error && applications.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-7 pt-5 pb-7">
          {/* Stat strip — recomputed from real data, one pill per status */}
          <div className="flex items-center gap-1.5 flex-wrap mb-[18px]">
            {STATUS_ORDER.map((status) => {
              const count = applications.filter((a) => a.status === status).length
              return (
                <span
                  key={status}
                  className="inline-flex items-center gap-[5px] text-xs font-medium text-[#6B7280] bg-white border border-[#E5E7EB] px-2.5 py-1 rounded-full"
                >
                  <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[status] }} />
                  {count} {STATUS_LABELS[status]}
                </span>
              )
            })}
          </div>

          {/* Kanban board */}
          <div className="grid grid-cols-6 gap-3 items-start w-full">
            {columns.map(({ status, items }) => (
              <BoardColumn key={status} status={status} items={items} onCardClick={goToDetail} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}``