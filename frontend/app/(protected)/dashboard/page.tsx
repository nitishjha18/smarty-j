"use client"

import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { useState } from "react"
import { Bell, ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import type { ApplicationStatus } from "../../types"
import CompanyLogo from "../../components/CompanyLogo"
import Card from "../../components/ui/Card"
import { buttonStyles } from "../../components/ui/Button"
import { StatusDot, StatusTransition } from "../../components/ui/StatusBadge"
import { useApplications, useDashboardStats } from "../../lib/queries"
import { cn } from "../../lib/cn"
import { timeAgo } from "../../lib/dates"
import { PIPELINE_STAGES, STATUS_LABELS, STATUS_STYLES } from "../../lib/status"

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const MAX_CHIPS = 2

function shiftMonth(base: Date, delta: number): Date {
  const d = new Date(base)
  d.setDate(1)
  d.setMonth(d.getMonth() + delta)
  return d
}

function greeting(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

type ActivityEntry = {
  id: string
  appId: string
  companyName: string
  companyDomain?: string | null
  jobTitle: string
  status: ApplicationStatus
  from: ApplicationStatus | null
  createdAt: string
}

export default function DashboardPage() {
  const { user } = useUser()
  const statsQuery = useDashboardStats()
  const applicationsQuery = useApplications()
  const stats = statsQuery.data ?? null
  const applications = applicationsQuery.data ?? []
  const loading = statsQuery.isPending || applicationsQuery.isPending
  const error = statsQuery.error?.message ?? applicationsQuery.error?.message ?? null
  const [now] = useState(() => Date.now())
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [openDay, setOpenDay] = useState<number | null>(null)

  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "there"

  const nowDate = new Date(now)
  const headerDate = nowDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  // Pipeline counts — derived client-side
  const pipelineCounts = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = applications.filter((a) => a.status === stage).length
    return acc
  }, {} as Record<string, number>)

  // Every status change, with the status it moved from (previous entry of the same application)
  const allActivity: ActivityEntry[] = applications.flatMap((app) => {
    const ordered = [...(app.statusHistory ?? [])].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    return ordered.map((entry, i) => ({
      id: entry.id,
      appId: app.id,
      companyName: app.companyName,
      companyDomain: app.companyDomain,
      jobTitle: app.jobTitle,
      status: entry.status,
      from: i > 0 ? ordered[i - 1].status : null,
      createdAt: entry.createdAt,
    }))
  })

  // Recent activity — newest 5
  const recentActivity = [...allActivity]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  // Stale applications — Applied for 14+ days
  const staleApps = applications
    .map((app) => ({
      app,
      days: Math.floor((now - new Date(app.dateApplied).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter(({ app, days }) => app.status === "APPLIED" && days >= 14)

  // Calendar
  const calYear = calendarMonth.getFullYear()
  const calMonthIdx = calendarMonth.getMonth()
  const calMonthLabel = calendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const dayEvents = new Map<number, ActivityEntry[]>()
  allActivity.forEach((entry) => {
    const d = new Date(entry.createdAt)
    if (d.getFullYear() === calYear && d.getMonth() === calMonthIdx) {
      const list = dayEvents.get(d.getDate())
      if (list) list.push(entry)
      else dayEvents.set(d.getDate(), [entry])
    }
  })

  const firstDayOfMonth = new Date(calYear, calMonthIdx, 1).getDay()
  const daysInMonth = new Date(calYear, calMonthIdx + 1, 0).getDate()
  const isCurrentMonth =
    nowDate.getFullYear() === calYear && nowDate.getMonth() === calMonthIdx
  const todayDay = nowDate.getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weekRows = cells.length / 7

  const totalApps = stats?.totalApplications ?? 0
  const isEmpty = !loading && !error && applications.length === 0

  const subline = loading ? (
    "Loading your status..."
  ) : error ? (
    <span className="text-danger">{error}</span>
  ) : isEmpty ? (
    "You haven't added any applications yet."
  ) : (
    <>
      {totalApps} {totalApps === 1 ? "application" : "applications"} tracked —{" "}
      {staleApps.length > 0 ? (
        <a
          href="#needs-attention"
          className="font-medium text-brand hover:text-brand-dark transition-colors"
        >
          {staleApps.length} {staleApps.length === 1 ? "has" : "have"} gone quiet →
        </a>
      ) : (
        "none have gone quiet"
      )}
    </>
  )

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col lg:h-full",
        isEmpty ? "max-w-[1360px]" : "max-w-[1560px]"
      )}
    >
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1
            className="m-0 text-[30px] font-semibold leading-[1.15] tracking-[-0.03em]"
            suppressHydrationWarning
          >
            {greeting(nowDate.getHours())}, {firstName}
          </h1>
          <p className="m-0 mt-1.5 text-[15px] leading-normal text-body">{subline}</p>
        </div>
        <span
          className="mt-[3px] shrink-0 whitespace-nowrap rounded-ctl border border-line px-3 py-1.5 text-sm2 font-medium leading-tight text-body"
          suppressHydrationWarning
        >
          {headerDate}
        </span>
      </header>

      {/* Pipeline strip */}
      <Link
        href="/applications"
        aria-label="Open applications"
        className="mt-5 block shrink-0 rounded-[14px] border border-line bg-surface shadow-card transition-colors hover:border-brand-border"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:h-[72px] lg:grid-cols-5">
          {PIPELINE_STAGES.map((stage, i) => {
            const count = loading ? 0 : pipelineCounts[stage]
            return (
              <div
                key={stage}
                className={cn(
                  "relative flex min-w-0 items-center px-5 py-4 lg:py-0",
                  i < PIPELINE_STAGES.length - 1 && "lg:border-r lg:border-line"
                )}
              >
                <div className="flex min-w-0 items-baseline gap-2.5">
                  <span className="text-[28px] font-semibold leading-none tabular-nums">
                    {count}
                  </span>
                  <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm2 font-medium">
                    <StatusDot status={stage} />
                    {STATUS_LABELS[stage]}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-4 bottom-0 h-[3px] rounded-[3px]",
                    STATUS_STYLES[stage].dot
                  )}
                />
              </div>
            )
          })}
        </div>
      </Link>

      {isEmpty ? (
        <section className="mt-6 flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <span
            aria-hidden="true"
            className="inline-flex size-12 items-center justify-center rounded-card bg-brand-tint-bg text-brand"
          >
            <Plus size={22} strokeWidth={2.4} />
          </span>
          <h2 className="m-0 mt-[18px] text-xl font-semibold tracking-[-0.02em]">
            Add your first application
          </h2>
          <p className="m-0 mt-2 max-w-[380px] text-sm leading-normal text-body">
            Track where you applied, see what&apos;s gone quiet, and check your
            resume fit.
          </p>
          <Link
            href="/applications/new"
            className={buttonStyles({ size: "cta", className: "mt-[22px]" })}
          >
            <Plus size={16} strokeWidth={2.4} />
            Add application
          </Link>
        </section>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)]">
          {/* Activity calendar */}
          <Card
           
            className="flex min-h-0 min-w-0 flex-col rounded-[14px] p-5 lg:col-span-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5">
              <h2 className="m-0 text-lg font-semibold tracking-[-0.01em]">Activity</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMonth(new Date())
                    setOpenDay(null)
                  }}
                  className="h-8 rounded-ctl border border-line bg-surface px-3 text-sm2 font-medium transition-colors hover:bg-surface-alt"
                >
                  Today
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => {
                      setCalendarMonth((m) => shiftMonth(m, -1))
                      setOpenDay(null)
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-ctl text-body transition-colors hover:bg-brand-tint-bg hover:text-ink"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="min-w-[104px] text-center text-sm font-medium">
                    {calMonthLabel}
                  </span>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => {
                      setCalendarMonth((m) => shiftMonth(m, 1))
                      setOpenDay(null)
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-ctl text-body transition-colors hover:bg-brand-tint-bg hover:text-ink"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              <div className="flex min-w-[560px] flex-1 flex-col lg:min-h-0">
                <div className="grid grid-cols-7 pb-2 font-mono text-mono tracking-[0.06em] text-muted">
                  {DOW.map((d) => (
                    <span key={d} className="px-2.5">
                      {d}
                    </span>
                  ))}
                </div>
                <div
                  className="grid flex-1 grid-cols-7 gap-px border border-line bg-line lg:min-h-0"
                  style={{ gridTemplateRows: `repeat(${weekRows}, minmax(84px, 1fr))` }}
                >
                  {cells.map((day, idx) => {
                    if (day === null) {
                      return <div key={idx} className="bg-surface-alt" />
                    }
                    const events = dayEvents.get(day) ?? []
                    const isToday = isCurrentMonth && day === todayDay
                    const col = idx % 7
                    const row = Math.floor(idx / 7)
                    const isOpen = openDay === day
                    const shown = events.slice(0, MAX_CHIPS)
                    const extra = events.length - shown.length

                    const dayNumber = isToday ? (
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand-logo text-sm2 font-semibold text-white">
                        {day}
                      </span>
                    ) : (
                      <span className="text-sm2 font-medium">{day}</span>
                    )

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "relative min-h-0 min-w-0",
                          isToday ? "bg-brand-tint-bg" : "bg-surface",
                          isOpen && "z-30"
                        )}
                      >
                        {events.length === 0 ? (
                          <div className={isToday ? "px-2 py-1.5" : "px-2.5 py-2"}>
                            {dayNumber}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setOpenDay(isOpen ? null : day)}
                            aria-expanded={isOpen}
                            aria-label={`${calMonthLabel.split(" ")[0]} ${day}: ${events
                              .map((e) => `${e.companyName} — moved to ${STATUS_LABELS[e.status]}`)
                              .join(", ")}`}
                            className="flex size-full min-h-0 flex-col items-stretch gap-1 p-2 text-left"
                          >
                            <span className="mb-0.5">{dayNumber}</span>
                            {shown.map((e) => (
                              <span
                                key={e.id}
                                className="flex h-[22px] min-w-0 items-center gap-1.5 rounded-chip px-0.5 transition-colors hover:bg-surface-alt"
                              >
                                <CompanyLogo
                                  domain={e.companyDomain}
                                  name={e.companyName}
                                  size={16}
                                  tone={e.status}
                                />
                                <span className="min-w-0 truncate text-[12.5px] font-medium">
                                  {e.companyName}
                                </span>
                              </span>
                            ))}
                            {extra > 0 && (
                              <span className="px-0.5 text-xs font-medium text-muted">
                                +{extra} more
                              </span>
                            )}
                          </button>
                        )}

                        {isOpen && (
                          <>
                            <button
                              type="button"
                              aria-label="Close"
                              onClick={() => setOpenDay(null)}
                              className="fixed inset-0 z-40 cursor-default"
                            />
                            <div
                              role="dialog"
                              aria-label={`Activity on ${calMonthLabel.split(" ")[0]} ${day}`}
                              className={cn(
                                "absolute z-50 w-[320px] max-w-[80vw] rounded-card border border-line bg-surface p-4 shadow-pop",
                                row < 2 ? "top-full mt-1" : "bottom-full mb-1",
                                col <= 3 ? "left-0" : "right-0"
                              )}
                            >
                              <div className="flex items-center gap-2 font-mono text-mono tracking-[0.06em] text-muted">
                                <span className="min-w-0 flex-1 uppercase">
                                  {calMonthLabel.split(" ")[0]} {day}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Close"
                                  onClick={() => setOpenDay(null)}
                                  className="inline-flex size-6 items-center justify-center rounded-chip text-muted hover:bg-surface-hover hover:text-ink"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="mt-2.5 flex flex-col">
                                {events.map((e, i) => (
                                  <div
                                    key={e.id}
                                    className={cn(
                                      "flex min-h-11 items-center gap-2.5 py-2",
                                      i > 0 && "border-t border-line"
                                    )}
                                  >
                                    <CompanyLogo
                                      domain={e.companyDomain}
                                      name={e.companyName}
                                      size={20}
                                      tone={e.status}
                                    />
                                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                                      <b className="font-semibold">{e.companyName}</b>
                                      <StatusTransition from={e.from} to={e.status} />
                                    </div>
                                    <Link
                                      href={`/applications/${e.appId}`}
                                      className="shrink-0 text-sm2 font-semibold text-ink hover:text-brand"
                                    >
                                      Open →
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Right rail */}
          <div className="flex min-h-0 min-w-0 flex-col gap-6 lg:col-span-4">
            {/* Gone quiet */}
            <section
              id="needs-attention"
              aria-labelledby="na-h"
              className="shrink-0 rounded-[14px] border border-warm-border bg-warm-card p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2
                  id="na-h"
                  className="m-0 text-[17px] font-semibold tracking-[-0.01em]"
                >
                  Gone quiet
                </h2>
                <span className="font-mono text-mono tracking-[0.06em] text-muted">
                  {loading ? "…" : `${staleApps.length} ${staleApps.length === 1 ? "APP" : "APPS"}`}
                </span>
              </div>
              <p className="m-0 mb-1.5 mt-1 text-sm2 text-body">No reply after 14 days</p>
              {loading ? (
                <p className="py-4 text-sm2 text-body">Loading...</p>
              ) : staleApps.length === 0 ? (
                <p className="py-4 text-center text-sm2 text-body">
                  All applications are active.
                </p>
              ) : (
                <div>
                  {staleApps.map(({ app, days }, i) => (
                    <div
                      key={app.id}
                      className={cn(
                        "grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-3 py-3.5",
                        i > 0 && "border-t border-dashed border-warm-border"
                      )}
                    >
                      <div>
                        <div className="text-[34px] font-semibold leading-none tracking-tight-display tabular-nums text-brand">
                          {days}
                        </div>
                        <div className="mt-1 text-xs leading-tight text-muted">days</div>
                      </div>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <CompanyLogo
                          domain={app.companyDomain}
                          name={app.companyName}
                          size={28}
                          tone={app.status}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{app.companyName}</div>
                          <div className="truncate text-sm2 text-body">{app.jobTitle}</div>
                        </div>
                      </div>
                      <Link
                        href={`/applications/${app.id}?tab=reminder`}
                        aria-label={`Remind me to follow up with ${app.companyName}`}
                        className="inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-ctl border border-warm-border bg-surface px-2.5 text-sm2 font-medium transition-colors hover:border-brand hover:text-brand"
                      >
                        <Bell size={14} />
                        Remind me
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent activity */}
            <Card className="flex min-h-0 flex-1 flex-col rounded-[14px] p-5">
              <div className="flex items-center justify-between">
                <h2 className="m-0 text-[17px] font-semibold tracking-[-0.01em]">
                  Recent activity
                </h2>
                <Link
                  href="/applications"
                  className="text-sm2 text-body transition-colors hover:text-ink"
                >
                  View all →
                </Link>
              </div>
              {loading ? (
                <p className="py-6 text-sm2 text-body">Loading...</p>
              ) : recentActivity.length === 0 ? (
                <p className="py-6 text-center text-sm2 text-muted">No activity yet.</p>
              ) : (
                <ol className="m-0 mt-4 flex min-h-0 flex-1 list-none flex-col justify-between gap-1 p-0">
                  {recentActivity.map((entry, i) => (
                    <li key={entry.id} className="flex min-h-14 flex-1 gap-3">
                      <div aria-hidden="true" className="relative w-5 shrink-0">
                        {i < recentActivity.length - 1 && (
                          <span className="absolute bottom-0 left-[9.5px] top-3 w-px bg-line" />
                        )}
                        <span className="relative mt-px block">
                          <CompanyLogo
                            domain={entry.companyDomain}
                            name={entry.companyName}
                            size={20}
                            tone={entry.status}
                          />
                        </span>
                      </div>
                      <div className="min-w-0 pb-3">
                        <div className="flex flex-wrap items-center gap-x-2 text-sm leading-[22px]">
                          <Link
                            href={`/applications/${entry.appId}`}
                            className="font-semibold hover:text-brand"
                          >
                            {entry.companyName}
                          </Link>
                          <StatusTransition from={entry.from} to={entry.status} />
                        </div>
                        <div className="mt-0.5 text-xs leading-tight text-muted">
                          {entry.jobTitle} · {timeAgo(entry.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
