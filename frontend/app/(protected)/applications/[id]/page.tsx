"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import {
  getApplication,
  updateApplication,
  deleteApplication,
  analyzeResume,
  generateInterviewPrep,
  getAnswers,
  saveAnswers,
  createReminder
} from "../../../lib/api"
import type {
  Application,
  ApplicationStatus,
  AiInterview,
  AiInterviewQuestion,
} from "../../../types"



// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumeAnalysis {
  matchScore: number
  missingKeywords: string[]
  suggestions: string[]
}

// ─── Label Maps ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  ASSIGNMENT: "Assignment",
  OFFER: "Offer",
  REJECTED: "Rejected",
}

// Locked design system — solid background, white text, no light-wash variants.
const STATUS_COLORS: Record<ApplicationStatus, string> = {
  APPLIED: "bg-[#1D4ED8] text-white",
  SCREENING: "bg-[#92400E] text-white",
  INTERVIEW: "bg-[#6D28D9] text-white",
  ASSIGNMENT: "bg-[#C2410C] text-white",
  OFFER: "bg-[#15803D] text-white",
  REJECTED: "bg-[#9F1239] text-white",
}

const SOURCE_LABELS: Record<string, string> = {
  LINKED_IN: "LinkedIn",
  NAUKARI: "Naukri",
  REFERAL: "Referral",
  COLDEMAIL: "Cold Email",
  SOCIAL_MEDIA: "Social Media",
  OTHER_JOB_APPS: "Other",
}

const ALL_STATUSES: ApplicationStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "ASSIGNMENT",
  "OFFER",
  "REJECTED",
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ─── Date Picker Helpers ──────────────────────────────────────────────────────

function toISODate(date: Date) {
  return date.toISOString().split("T")[0]
}

function buildCalendarGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { date: Date; inCurrentMonth: boolean }[] = []

  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inCurrentMonth: true })
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date
    const next = new Date(last)
    next.setDate(next.getDate() + 1)
    cells.push({ date: next, inCurrentMonth: next.getMonth() === month })
  }

  return cells
}

// ─── Custom Reminder Date Picker ──────────────────────────────────────────────

function ReminderDatePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (isoDate: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const selected = value ? new Date(value + "T00:00:00") : null
  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth())

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const cells = buildCalendarGrid(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })
  const displayLabel = selected
    ? selected.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "Select a date"

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }
  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-[#FC8019]/20 focus:border-[#FC8019] ${
          selected ? "text-gray-800" : "text-gray-400"
        }`}
      >
        {displayLabel}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400 shrink-0">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-72 bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)] p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={goPrevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-[rgba(252,128,25,0.07)] hover:text-[#FC8019]"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-800">{monthLabel}</span>
            <button
              type="button"
              onClick={goNextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-[rgba(252,128,25,0.07)] hover:text-[#FC8019]"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {weekdays.map((wd) => (
              <span key={wd} className="text-xs font-medium text-gray-400 pb-1">
                {wd}
              </span>
            ))}

            {cells.map(({ date, inCurrentMonth }) => {
              const isPast = date < today
              const isSelected = selected && date.toDateString() === selected.toDateString()
              const isToday = date.toDateString() === today.toDateString()

              return (
                <button
                  type="button"
                  key={date.toISOString()}
                  disabled={isPast}
                  onClick={() => {
                    onChange(toISODate(date))
                    setOpen(false)
                  }}
                  className={`w-9 h-9 mx-auto flex items-center justify-center text-sm rounded-full transition-colors
                    ${!inCurrentMonth ? "text-gray-300" : "text-gray-700"}
                    ${isPast ? "text-gray-300 cursor-not-allowed" : "hover:bg-[rgba(252,128,25,0.07)] hover:text-[#FC8019]"}
                    ${isSelected ? "!bg-[#FC8019] !text-white" : ""}
                    ${isToday && !isSelected ? "border border-[#FC8019] text-[#FC8019]" : ""}
                  `}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


// ─── Component ────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { getToken } = useAuth()

  // ── Core application state ──
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Notes state ──
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  // ── Status state ──
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusUpdated, setStatusUpdated] = useState(false)

  // ── Delete state ──
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Resume analysis state ──
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
  const [analyzingResume, setAnalyzingResume] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // ── Interview prep state ──
  const [interviews, setInterviews] = useState<AiInterview[]>([])
  const [generatingPrep, setGeneratingPrep] = useState(false)
  const [prepError, setPrepError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [savingAnswers, setSavingAnswers] = useState(false)
  const [answersSaved, setAnswersSaved] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  // ── Reminder state ──
  const [reminderDate, setReminderDate] = useState("")
  const [reminderNotes, setReminderNotes] = useState("")
  const [savingReminder, setSavingReminder] = useState(false)
  const [reminderSaved, setReminderSaved] = useState(false)
  const [reminderError, setReminderError] = useState<string | null>(null)

  // ─── Mount: load application + existing interview answers ─────────────────

  useEffect(() => {
    if (!id) return

    const load = async () => {
      try {
        const token = await getToken()
        if (!token) return

        // Parallel fetch — application data and any existing interview answers
        const [appData, answersData] = await Promise.all([
          getApplication(token, id),
          getAnswers(token, id).catch(() => ({ interviews: [] })),
          // getAnswers can 404 if no interviews exist yet — treat that as empty
        ])

        const app: Application = appData.application
        setApplication(app)
        setNotes(app.notes ?? "")

        // If interview questions already exist, populate them
        if (answersData.interviews && answersData.interviews.length > 0) {
          setInterviews(answersData.interviews)

          // Pre-populate answers map from saved answers
          const savedAnswers: Record<string, string> = {}
          answersData.interviews.forEach((interview: AiInterview) => {
            interview.questions.forEach((q: AiInterviewQuestion) => {
              savedAnswers[q.id] = q.userAnswer ?? ""
            })
          })
          setAnswers(savedAnswers)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load application")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, getToken])

  // ─── Status update ────────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!application || updatingStatus || newStatus === application.status) return

    setUpdatingStatus(true)
    setStatusUpdated(false)
    try {
      const token = await getToken()
      if (!token) return
      const data = await updateApplication(token, id, { status: newStatus })
      setApplication(data.application)
      setStatusUpdated(true)
      setTimeout(() => setStatusUpdated(false), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  // ─── Notes save ───────────────────────────────────────────────────────────

  const handleSaveNotes = async () => {
    if (!application || savingNotes) return

    setSavingNotes(true)
    try {
      const token = await getToken()
      if (!token) return
      const data = await updateApplication(token, id, { notes })
      setApplication(data.application)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save notes")
    } finally {
      setSavingNotes(false)
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const token = await getToken()
      if (!token) return
      await deleteApplication(token, id)
      router.push("/applications")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete application")
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  // ─── Resume Analysis ──────────────────────────────────────────────────────

  const handleAnalyzeResume = async () => {
    if (!application) return

    // Client-side pre-check — no point calling the API without a JD
    if (!application.jobDescription) {
      setAnalysisError("Add a job description to this application first.")
      return
    }

    setAnalyzingResume(true)
    setAnalysis(null)
    setAnalysisError(null)

    try {
      const token = await getToken()
      if (!token) return
      const data = await analyzeResume(token, id)
      setAnalysis(data.analysis)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Analysis failed"
      // Surface the backend's specific error messages clearly
      if (message.toLowerCase().includes("resume")) {
        setAnalysisError("No resume uploaded. Upload one from your profile page.")
      } else {
        setAnalysisError(message)
      }
    } finally {
      setAnalyzingResume(false)
    }
  }

  // ─── Interview Prep ───────────────────────────────────────────────────────

  const handleGenerateInterviewPrep = async () => {
    setGeneratingPrep(true)
    setPrepError(null)

    try {
      const token = await getToken()
      if (!token) return
      const data = await generateInterviewPrep(token, id)

      // Backend returns { interviewPrep: { interviewId, questions } }
      // We need to shape this into AiInterview format for our state
      const newInterview: AiInterview = {
        id: data.interviewPrep.interviewId,
        applicationId: id,
        overallScore: null,
        overallFeedback: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: data.interviewPrep.questions,
      }

      setInterviews([newInterview])

      // Initialize answers map for the new questions
      const freshAnswers: Record<string, string> = {}
      data.interviewPrep.questions.forEach((q: AiInterviewQuestion) => {
        freshAnswers[q.id] = q.userAnswer ?? ""
      })
      setAnswers(freshAnswers)
      setAnswersSaved(false)
    } catch (err: unknown) {
      setPrepError(err instanceof Error ? err.message : "Failed to generate questions")
    } finally {
      setGeneratingPrep(false)
    }
  }

  // ─── Save Answers ─────────────────────────────────────────────────────────

  const handleSaveAnswers = async () => {
    if (interviews.length === 0) return

    setSavingAnswers(true)
    setAnswersSaved(false)

    try {
      const token = await getToken()
      if (!token) return

      // Build the payload — one entry per question that has an answer
      const answersPayload = Object.entries(answers)
        .filter(([, answer]) => answer.trim() !== "")
        .map(([questionId, answer]) => ({ questionId, answer }))

      await saveAnswers(token, answersPayload)
      setAnswersSaved(true)
    } catch (err: unknown) {
      setPrepError(err instanceof Error ? err.message : "Failed to save answers")
    } finally {
      setSavingAnswers(false)
    }
  }

  // ─── Create Reminder ──────────────────────────────────────────────────────

  const handleCreateReminder = async () => {
    if (!reminderDate) {
      setReminderError("Please select a reminder date.")
      return
    }
  
    setSavingReminder(true)
    setReminderError(null)
    setReminderSaved(false)
  
    try {
      const token = await getToken()
      if (!token) return
      await createReminder(token, {
        applicationId: id,
        reminderDate,
        notes: reminderNotes.trim() || undefined,
      })
      setReminderSaved(true)
      setReminderDate("")
      setReminderNotes("")
    } catch (err: unknown) {
      setReminderError(err instanceof Error ? err.message : "Failed to set reminder")
    } finally {
      setSavingReminder(false)
    }
  }

  // ─── Render: loading / error ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 text-gray-500">Loading...</div>
    )
  }

  if (error && !application) {
    return (
      <div className="p-8 text-red-500">{error}</div>
    )
  }

  if (!application) {
    return (
      <div className="p-8 text-gray-500">Application not found.</div>
    )
  }

  const notesChanged = notes !== (application.notes ?? "")
  const currentQuestions = interviews.flatMap((i) => i.questions).sort(
    (a, b) => a.questionNumber - b.questionNumber
  )

  // ─── Render ───────────────────────────────────────────────────────────────

return (
  <div className="max-w-3xl mx-auto p-8 space-y-8">

    {/* Delete confirmation modal */}
    {/* Delete confirmation modal */}
{confirmDelete && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    onClick={() => !deleting && setConfirmDelete(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-sm bg-white rounded-[10px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] p-6"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-6">
        Are you sure you want to remove this application?
      </h3>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => setConfirmDelete(false)}
          disabled={deleting}
          className="text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Yes, delete"}
        </button>
      </div>
    </div>
  </div>
)}
    {/* Identity + Status + History card */}
    <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{application.companyName}</h1>
          <p className="text-gray-500 mt-1">{application.jobTitle}</p>
          <p className="text-sm text-gray-400 mt-1">
            {SOURCE_LABELS[application.source]} · {formatDate(application.dateApplied)}
          </p>
        </div>

        {/* Delete */}
        <div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Inline error (for status/notes/delete errors that don't kill the page) */}
      {error && application && (
        <p className="text-sm text-red-500 mt-4">{error}</p>
      )}

      {/* Divider */}
      <div className="h-px bg-[#F0F1F4] my-6" />

      {/* Status */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Status</h2>
          {statusUpdated && (
            <span className="text-sm text-[#15803D]">Updated</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={updatingStatus}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-opacity disabled:opacity-50 ${
                application.status === status
                  ? `${STATUS_COLORS[status]} border border-transparent`
                  : "bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {/* History */}
      {application.statusHistory && application.statusHistory.length > 0 && (
        <>
          <div className="h-px bg-[#F0F1F4] my-6" />
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">History</h2>
            <div className="space-y-2">
              {[...application.statusHistory]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[entry.status]}`}
                    >
                      {STATUS_LABELS[entry.status]}
                    </span>
                    <span className="text-gray-400">{formatDate(entry.createdAt)}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>

{/* Notes */}
<div>
  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Notes</h2>
  <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      rows={4}
      placeholder="Add notes about this application..."
      className="w-full p-4 text-sm text-gray-800 resize-none focus:outline-none"
    />
    <div className="flex items-center justify-end gap-3 px-4 py-3 bg-[#F4F5F7] border-t border-[#E5E7EB]">
      {notesSaved && !notesChanged && (
        <span className="text-sm text-[#15803D]">Saved</span>
      )}
      <button
        onClick={handleSaveNotes}
        disabled={!notesChanged || savingNotes}
        className="text-sm px-4 py-1.5 bg-gray-900 text-white rounded-lg disabled:opacity-40 hover:bg-gray-700"
      >
        {savingNotes ? "Saving..." : "Save notes"}
      </button>
    </div>
  </div>
</div>

      {/* Job Description */}
      {application.jobDescription && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Job Description</h2>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            {application.jobDescription}
          </pre>
        </div>
      )}

      {/* ── AI Features ────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-6">AI Features</h2>

        {/* Resume Analysis */}
        <div className="border border-[#E5E7EB] border-t-[3px] border-t-[#FC8019] rounded-[10px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-5 mb-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Resume Analysis</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Compares your resume against the job description
              </p>
            </div>
            <button
              onClick={handleAnalyzeResume}
              disabled={analyzingResume}
              className="text-sm px-4 py-1.5 bg-gray-900 text-white rounded-lg disabled:opacity-50 hover:bg-gray-700 whitespace-nowrap"
            >
              {analyzingResume ? "Analyzing..." : "Analyze Resume"}
            </button>
          </div>

          {/* Analysis error */}
          {analysisError && (
            <p className="mt-3 text-sm text-red-500">{analysisError}</p>
          )}

          {/* Analysis results */}
          {analysis && (
            <div className="mt-4 space-y-4">
              {/* Match Score */}
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gray-900">{analysis.matchScore}%</span>
                <span className="text-sm text-gray-500">match with this job description</span>
              </div>

              {/* Missing Keywords */}
              {analysis.missingKeywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Missing Keywords
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.missingKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="px-2.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-xs"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {analysis.suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Suggestions
                  </p>
                  <ul className="space-y-1.5">
                    {analysis.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-gray-300 mt-0.5">→</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interview Prep */}
        <div className="border border-[#E5E7EB] border-t-[3px] border-t-[#FC8019] rounded-[10px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Interview Prep</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                AI-generated questions based on the job description
              </p>
            </div>

            {!confirmRegenerate ? (
              <button
                onClick={() => {
                  if (currentQuestions.length > 0) {
                    setConfirmRegenerate(true)
                  } else {
                    handleGenerateInterviewPrep()
                  }
                }}
                disabled={generatingPrep}
                className="text-sm px-4 py-1.5 bg-gray-900 text-white rounded-lg disabled:opacity-50 hover:bg-gray-700 whitespace-nowrap"
              >
                {generatingPrep
                  ? "Generating..."
                  : currentQuestions.length > 0
                  ? "Regenerate"
                  : "Generate Questions"}
              </button>
            ) : (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xs text-gray-500">Replace questions and answers?</span>
                <button
                  onClick={() => {
                    setConfirmRegenerate(false)
                    handleGenerateInterviewPrep()
                  }}
                  className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Yes, regenerate
                </button>
                <button
                  onClick={() => setConfirmRegenerate(false)}
                  className="text-sm px-3 py-1.5 text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Prep error */}
          {prepError && (
            <p className="mt-3 text-sm text-red-500">{prepError}</p>
          )}

          {/* Questions + Answer textareas */}
          {currentQuestions.length > 0 && (
            <div className="mt-4 space-y-5">
              {currentQuestions.map((q, index) => (
                <div key={q.id}>
                  <p className="text-sm font-medium text-gray-800 mb-1.5">
                    {index + 1}. {q.question}
                  </p>
                  <textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    rows={3}
                    placeholder="Write your answer..."
                    className="w-full border border-[#E5E7EB] rounded-[10px] p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#FC8019]/20 focus:border-[#FC8019]"
                  />
                </div>
              ))}

              {/* Save answers */}
              <div className="flex items-center justify-between pt-1">
                {answersSaved && (
                  <span className="text-sm text-[#15803D]">Answers saved.</span>
                )}
                <div className="ml-auto">
                  <button
                    onClick={handleSaveAnswers}
                    disabled={savingAnswers}
                    className="text-sm px-4 py-1.5 bg-gray-900 text-white rounded-lg disabled:opacity-50 hover:bg-gray-700"
                  >
                    {savingAnswers ? "Saving..." : "Save Answers"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reminder */}
<div>
  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Set Reminder</h2>
  <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-5 space-y-4">
    <div>
      <label className="text-xs text-gray-500 mb-1 block">Reminder Date</label>
      <ReminderDatePicker
        value={reminderDate}
        onChange={(iso) => {
          setReminderDate(iso)
          setReminderSaved(false)
          setReminderError(null)
        }}
      />
    </div>

    <div>
      <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
      <input
        type="text"
        value={reminderNotes}
        onChange={(e) => setReminderNotes(e.target.value)}
        placeholder="e.g. Follow up on application status"
        className="w-full border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#FC8019]/20 focus:border-[#FC8019]"
      />
    </div>

    <div className="flex items-center gap-3 pt-1">
      <button
        onClick={handleCreateReminder}
        disabled={savingReminder}
        className="text-sm px-4 py-1.5 bg-gray-900 text-white rounded-lg disabled:opacity-50 hover:bg-gray-700"
      >
        {savingReminder ? "Saving..." : "Set Reminder"}
      </button>
      {reminderSaved && (
        <span className="text-sm text-[#15803D]">Reminder set.</span>
      )}
      {reminderError && (
        <span className="text-sm text-red-500">{reminderError}</span>
      )}
    </div>
  </div>
</div>
    </div>
  )
}