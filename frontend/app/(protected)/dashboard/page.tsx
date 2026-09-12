"use client"

import { useAuth, useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { getDashboardStats, getApplications } from "../../lib/api"
import { DashboardStats, Application, ApplicationStatus } from "../../types"

const PIPELINE_STAGES: ApplicationStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "ASSIGNMENT",
  "OFFER",
]

const STAGE_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  ASSIGNMENT: "Assignment",
  OFFER: "Offer",
}

const STATUS_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  ASSIGNMENT: "Assignment",
  OFFER: "Offer",
  REJECTED: "Rejected",
}

const STATUS_BADGE_BG: Record<string, string> = {
  APPLIED: "#1D4ED8",
  SCREENING: "#92400E",
  INTERVIEW: "#6D28D9",
  ASSIGNMENT: "#C2410C",
  OFFER: "#15803D",
  REJECTED: "#9F1239",
}

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}

function shiftMonth(base: Date, delta: number): Date {
  const d = new Date(base)
  d.setDate(1)
  d.setMonth(d.getMonth() + delta)
  return d
}

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)"
const TOOLTIP_SHADOW = "0 4px 12px rgba(0,0,0,0.08)"

export default function DashboardPage() {
  const { getToken } = useAuth()
  const { user } = useUser()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())

  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "there"

  const nowDate = new Date()
  const weekday = nowDate.toLocaleDateString("en-US", { weekday: "long" })
  const month = nowDate.toLocaleDateString("en-US", { month: "long" })
  const headerDate = `${weekday}, ${nowDate.getDate()} ${month} ${nowDate.getFullYear()}`.toUpperCase()

  useEffect(() => {
    const init = async () => {
      try {
        const token = await getToken()
        if (!token) return
        const [statsData, appsData] = await Promise.all([
          getDashboardStats(token),
          getApplications(token),
        ])
        setStats(statsData.stats)
        setApplications(appsData.applications)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Pipeline counts — derived client-side
  const pipelineCounts = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = applications.filter((a) => a.status === stage).length
    return acc
  }, {} as Record<string, number>)

  // Peak stage: first in PIPELINE_STAGES order with highest nonzero count
  const maxCount = Math.max(...PIPELINE_STAGES.map((s) => pipelineCounts[s]))
  const peakStage: ApplicationStatus | null =
    maxCount > 0 ? (PIPELINE_STAGES.find((s) => pipelineCounts[s] === maxCount) ?? null) : null

  // Recent activity — flatten statusHistory, sort by date, take 5
  const recentActivity = applications
    .flatMap((app) =>
      (app.statusHistory ?? []).map((entry) => ({
        ...entry,
        companyName: app.companyName,
        jobTitle: app.jobTitle,
        appId: app.id,
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  // Stale applications — Applied for 14+ days
  const staleApps = applications.filter((app) => {
    if (app.status !== "APPLIED") return false
    const days = Math.floor(
      (Date.now() - new Date(app.dateApplied).getTime()) / (1000 * 60 * 60 * 24)
    )
    return days >= 14
  })

  // Calendar
  const calYear = calendarMonth.getFullYear()
  const calMonthIdx = calendarMonth.getMonth()
  const calMonthLabel = calendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const activityDays = new Set<number>()
  const dayTooltips = new Map<number, string[]>()
  applications.forEach((app) => {
    ;(app.statusHistory ?? []).forEach((entry) => {
      const d = new Date(entry.createdAt)
      if (d.getFullYear() === calYear && d.getMonth() === calMonthIdx) {
        const dayNum = d.getDate()
        activityDays.add(dayNum)
        const line = `${app.companyName} — moved to ${STATUS_LABELS[entry.status] ?? entry.status}`
        const existing = dayTooltips.get(dayNum)
        if (existing) existing.push(line)
        else dayTooltips.set(dayNum, [line])
      }
    })
  })

  const firstDayOfMonth = new Date(calYear, calMonthIdx, 1).getDay()
  const daysInMonth = new Date(calYear, calMonthIdx + 1, 0).getDate()
  const isCurrentMonth =
    nowDate.getFullYear() === calYear && nowDate.getMonth() === calMonthIdx
  const todayDay = nowDate.getDate()

  type CalCell = { day: number | null; isToday: boolean; isActivity: boolean }
  const cells: CalCell[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ day: null, isToday: false, isActivity: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isCurrentMonth && d === todayDay
    cells.push({ day: d, isToday, isActivity: !isToday && activityDays.has(d) })
  }
  const rem = cells.length % 7
  if (rem !== 0) {
    for (let i = 0; i < 7 - rem; i++) {
      cells.push({ day: null, isToday: false, isActivity: false })
    }
  }

  const totalApps = stats?.totalApplications ?? 0

  return (
    <div className="flex flex-col gap-[14px]">

      {/* 1. Header band */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[21px] font-extrabold tracking-[-0.5px] text-[#111827] leading-[1.15]">
            Hello, {firstName}
          </h1>
          <p className="text-[12px] font-medium text-[#374151] mt-1.5">
            Here's your job search status for today.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[11px] font-semibold text-[#6B7280] tracking-[0.04em] uppercase">
            {headerDate}
          </p>
          {loading ? (
            <p className="text-[11px] text-[#9CA3AF] mt-2">Loading your status...</p>
          ) : error ? (
            <p className="text-[11px] text-red-500 mt-2">{error}</p>
          ) : (
            <p className="text-[11px] text-[#9CA3AF] mt-2">
              You have{" "}
              <span className="font-semibold text-[#374151]">
                {totalApps} {totalApps === 1 ? "application" : "applications"}
              </span>{" "}
              tracked —{" "}
              <span className="font-semibold text-[#374151]">
                {staleApps.length} {staleApps.length === 1 ? "has" : "have"}
              </span>{" "}
              had no update in 14+ days.
            </p>
          )}
        </div>
      </div>

      {/* 2. Pipeline strip */}
      <div
        className="flex bg-white border border-[#E5E7EB] rounded-[10px] overflow-hidden flex-shrink-0"
        style={{ boxShadow: CARD_SHADOW }}
      >
        {PIPELINE_STAGES.map((stage, i) => {
          const count = loading ? 0 : pipelineCounts[stage]
          const isZero = count === 0
          const isPeak = !loading && stage === peakStage
          const isNz = !isZero

          return (
            <div
              key={stage}
              className={`flex-1 flex flex-col items-center justify-center px-2 py-[14px] pb-[12px] relative${
                i < PIPELINE_STAGES.length - 1 ? " border-r border-[#F0F1F4]" : ""
              }`}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{
                  background: isZero ? "transparent" : "#FC8019",
                  opacity: isPeak ? 1 : isNz ? 0.28 : 0,
                }}
              />
              <div
                className="text-[30px] font-extrabold leading-none tracking-[-1.5px]"
                style={{ color: isPeak ? "#FC8019" : isNz ? "#374151" : "#D1D5DB" }}
              >
                {count}
              </div>
              <div
                className={`text-[10px] mt-[4px] tracking-[0.02em] ${isPeak ? "font-semibold" : "font-medium"}`}
                style={{ color: isPeak ? "#FC8019" : isNz ? "#6B7280" : "#9CA3AF" }}
              >
                {STAGE_LABELS[stage]}
              </div>
            </div>
          )
        })}
      </div>

      {/* 3. Three-column grid */}
      <div className="grid gap-[14px]" style={{ gridTemplateColumns: "1fr 1.35fr 1fr" }}>

        {/* Recent Activity */}
        <div
          className="bg-white border border-[#E5E7EB] rounded-[10px] flex flex-col overflow-hidden self-start"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <div className="flex items-center justify-between px-4 py-[12px] pb-[11px] border-b border-[#E5E7EB] flex-shrink-0">
            <span className="text-[12.5px] font-bold text-[#111827]">Recent Activity</span>
            <span className="text-[10px] text-[#9CA3AF] font-medium">Last 5 changes</span>
          </div>
          <div>
            {loading ? (
              <p className="px-4 py-6 text-[13px] text-[#6B7280]">Loading...</p>
            ) : recentActivity.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-[#9CA3AF] text-center">No activity yet.</p>
            ) : (
              recentActivity.map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-4 py-[10px] gap-[10px]${
                    i < recentActivity.length - 1 ? " border-b border-[#F0F1F4]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#111827] truncate">
                      {entry.companyName}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-[1px] truncate">
                      {entry.jobTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="inline-flex items-center text-[10px] font-bold px-[7px] py-[2px] rounded-full text-white leading-[1.5] tracking-[0.01em] whitespace-nowrap"
                      style={{ background: STATUS_BADGE_BG[entry.status] ?? "#6B7280" }}
                    >
                      {STATUS_LABELS[entry.status]}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Calendar — no overflow-hidden so tooltips can escape */}
        <div
          className="bg-white border border-[#E5E7EB] rounded-[10px] flex flex-col self-stretch"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <div className="flex items-center justify-between px-4 py-[12px] pb-[11px] border-b border-[#E5E7EB] flex-shrink-0">
            <span className="text-[12.5px] font-bold text-[#111827]">Activity Calendar</span>
            <span className="text-[10px] text-[#9CA3AF] font-medium">{calMonthLabel}</span>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex flex-col flex-1 px-[14px] py-[12px] gap-[10px]">

              {/* Month nav */}
              <div className="flex items-center justify-between flex-shrink-0">
                <button
                  onClick={() => setCalendarMonth((m) => shiftMonth(m, -1))}
                  className="w-[22px] h-[22px] rounded-[5px] border border-[#E5E7EB] bg-white flex items-center justify-center text-[#6B7280] hover:bg-[#F4F5F7] cursor-pointer"
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="5.5,1.5 2.5,4.5 5.5,7.5" />
                  </svg>
                </button>
                <span className="text-[12.5px] font-bold text-[#111827]">{calMonthLabel}</span>
                <button
                  onClick={() => setCalendarMonth((m) => shiftMonth(m, 1))}
                  className="w-[22px] h-[22px] rounded-[5px] border border-[#E5E7EB] bg-white flex items-center justify-center text-[#6B7280] hover:bg-[#F4F5F7] cursor-pointer"
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3.5,1.5 6.5,4.5 3.5,7.5" />
                  </svg>
                </button>
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-[1px] flex-1">
                {DOW.map((d) => (
                  <div
                    key={d}
                    className="text-center text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.05em] pb-[4px]"
                  >
                    {d}
                  </div>
                ))}
                {cells.map((cell, idx) => {
                  const tooltipLines = cell.day !== null ? dayTooltips.get(cell.day) : undefined
                  // Column 0-1 = left edge, grow right. Column 5-6 = right edge, grow left. Middle = center.
                  const col = idx % 7
                  const tooltipPos = col <= 1 ? "left-0" : col >= 5 ? "right-0" : "left-1/2 -translate-x-1/2"
                  const arrowPos  = col <= 1 ? "left-[10px]" : col >= 5 ? "right-[10px]" : "left-1/2 -translate-x-1/2"
                  return (
                    <div
                      key={idx}
                      className={`group aspect-square flex flex-col items-center justify-center rounded-[6px] text-[11px] font-medium relative${
                        cell.day === null
                          ? ""
                          : cell.isToday
                          ? " bg-[#FC8019] text-white font-extrabold"
                          : cell.isActivity
                          ? " bg-[#FFF4EC] text-[#FC8019] font-bold"
                          : " text-[#6B7280]"
                      }`}
                    >
                      {cell.day !== null && (
                        <>
                          <span>{cell.day}</span>
                          {cell.isActivity && (
                            <span
                              className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-[#FC8019]"
                              style={{ opacity: 0.65 }}
                            />
                          )}
                          {tooltipLines && (
                            <div
                              className={`pointer-events-none absolute bottom-full mb-[8px] z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white border border-[#E5E7EB] rounded-[7px] px-[10px] py-[8px] text-left max-w-[200px] ${tooltipPos}`}
                              style={{ boxShadow: TOOLTIP_SHADOW }}
                            >
                              {tooltipLines.map((line, li) => (
                                <p
                                  key={li}
                                  className={`text-[11px] text-[#111827] whitespace-normal${li > 0 ? " mt-[3px]" : ""}`}
                                >
                                  {line}
                                </p>
                              ))}
                              {/* Arrow pointing down toward cell */}
                              <div
                                className={`absolute bottom-[-4px] w-[8px] h-[8px] bg-white border-r border-b border-[#E5E7EB] rotate-45 ${arrowPos}`}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-[14px] pt-[8px] border-t border-[#F0F1F4] flex-shrink-0">
                <div className="flex items-center gap-[5px] text-[10px] text-[#9CA3AF]">
                  <div className="w-[10px] h-[10px] rounded-[3px] bg-[#FC8019] flex-shrink-0" />
                  Today
                </div>
                <div className="flex items-center gap-[5px] text-[10px] text-[#9CA3AF]">
                  <div
                    className="w-[10px] h-[10px] rounded-[3px] bg-[#FFF4EC] flex-shrink-0"
                    style={{ border: "1px solid #FC8019" }}
                  />
                  Activity
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Needs Attention */}
        <div
          className="bg-white border border-[#E5E7EB] rounded-[10px] flex flex-col overflow-hidden self-start"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <div className="flex items-center justify-between px-4 py-[12px] pb-[11px] border-b border-[#E5E7EB] flex-shrink-0">
            <span className="text-[12.5px] font-bold text-[#111827]">Needs Attention</span>
            <span className="text-[10px] text-[#9CA3AF] font-medium">14+ days no update</span>
          </div>
          <div>
            {loading ? (
              <p className="px-4 py-6 text-[13px] text-[#6B7280]">Loading...</p>
            ) : staleApps.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-[#9CA3AF] text-center">
                All applications are active.
              </p>
            ) : (
              staleApps.map((app, i) => {
                const days = Math.floor(
                  (Date.now() - new Date(app.dateApplied).getTime()) / (1000 * 60 * 60 * 24)
                )
                return (
                  <div
                    key={app.id}
                    className={`flex items-center justify-between px-4 py-[10px] gap-[10px]${
                      i < staleApps.length - 1 ? " border-b border-[#F0F1F4]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827] truncate">
                        {app.companyName}
                      </p>
                      <p className="text-[11px] text-[#6B7280] mt-[1px] truncate">
                        {app.jobTitle}
                      </p>
                    </div>
                    <span className="flex-shrink-0 bg-[#B91C1C] text-white text-[10px] font-bold px-[7px] py-[2px] rounded-full leading-[1.6] whitespace-nowrap">
                      {days}d
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
