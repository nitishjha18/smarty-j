"use client"

import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getApplications } from "../../lib/api"
import { Application, ApplicationStatus, ApplicationSource } from "../../types"

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

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  APPLIED: "#1D4ED8",
  SCREENING: "#92400E",
  INTERVIEW: "#6D28D9",
  ASSIGNMENT: "#C2410C",
  OFFER: "#15803D",
  REJECTED: "#9F1239",
}

const STATUS_ORDER: ApplicationStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "ASSIGNMENT",
  "OFFER",
  "REJECTED",
]

const STALE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

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

  const staleCount = applications.filter(
    (app) =>
      app.status === "APPLIED" &&
      Date.now() - new Date(app.dateApplied).getTime() >= STALE_THRESHOLD_MS
  ).length

  const subtitle = loading
    ? "Loading your applications..."
    : error
    ? ""
    : applications.length === 0
    ? "Your pipeline is empty."
    : `${applications.length} ${applications.length === 1 ? "application" : "applications"} across six stages.`

  // layout.tsx wraps children in <main className="min-h-full p-6"> (p-6 = 24px × 2 sides = 48px).
  // min-h-full doesn't give <main> a definite height for h-full to resolve against,
  // so we subtract the known padding directly from 100vh.
  return (
    <div className="h-[calc(100vh-48px)] flex flex-col p-8 overflow-hidden">

      {/* Header */}
      <div className="shrink-0 flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#111827] tracking-tight">Applications</h1>
            {!loading && !error && applications.length > 0 && (
              <span className="text-xs font-semibold text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
                {applications.length}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-[#6B7280] mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {!loading && !error && applications.length > 0 && (
            <p className="text-sm text-[#6B7280] text-right">
              You have{" "}
              <span className="font-semibold text-[#111827]">
                {applications.length} {applications.length === 1 ? "application" : "applications"}
              </span>{" "}
              tracked &mdash;{" "}
              {staleCount === 0 ? (
                "all up to date."
              ) : (
                <>
                  <span className="font-semibold text-[#111827]">
                    {staleCount} {staleCount === 1 ? "has" : "have"}
                  </span>{" "}
                  had no update in 14+ days.
                </>
              )}
            </p>
          )}
          <button
            onClick={() => router.push("/applications/new")}
            className="bg-[#FC8019] text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            + New Application
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-sm text-[#9CA3AF]">Loading your applications...</div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {/* Empty state */}
      {!loading && !error && applications.length === 0 && (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] px-6 py-16 text-center">
            <p className="text-sm font-medium text-[#111827] mb-1">No applications yet</p>
            <p className="text-sm text-[#9CA3AF] mb-4">Start tracking by adding your first application.</p>
            <button
              onClick={() => router.push("/applications/new")}
              className="bg-[#FC8019] text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              + New Application
            </button>
          </div>
        </div>
      )}

      {/* Kanban board — grid fills remaining height, columns stretch to match */}
      {!loading && !error && applications.length > 0 && (
        <div className="flex-1 min-h-0 grid grid-cols-6 gap-4 pb-2">
          {columns.map(({ status, items }) => (
            <div
              key={status}
              className="min-w-0 h-full flex flex-col bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              {/* Accent strip */}
              <div className="shrink-0 h-[3px] w-full" style={{ backgroundColor: STATUS_COLORS[status] }} />

              {/* Column header */}
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#F0F1F4]">
                <span className="text-[12.5px] font-bold text-[#111827]">
                  {STATUS_LABELS[status]}
                </span>
                <span
                  className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                >
                  {items.length}
                </span>
              </div>

              {/* Column body */}
              <div className="flex-1 min-h-0 flex flex-col gap-2.5 p-3 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="text-xs text-[#9CA3AF] text-center py-6">No applications</div>
                ) : (
                  items.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => router.push(`/applications/${app.id}`)}
                      className="bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-3 flex flex-col gap-1.5 cursor-pointer hover:border-[#FC8019] hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-all"
                    >
                      <p className="text-[13px] font-semibold text-[#111827] truncate">
                        {app.companyName}
                      </p>
                      <p className="text-[11px] text-[#6B7280] truncate">
                        {app.jobTitle}
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-[#9CA3AF]">
                          {SOURCE_LABELS[app.source]}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF]">
                          {formatDate(app.dateApplied)}
                        </span>
                      </div>
                      <span
                        className="self-start mt-1 text-[10px] font-medium text-white px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[app.status] }}
                      >
                        {STATUS_LABELS[app.status]}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
