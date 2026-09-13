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

// Solid badge colors — used for the header status badge and the history timeline.
// Matches the mockup's --s-* design tokens exactly.
const STATUS_COLORS: Record<ApplicationStatus, string> = {
  APPLIED: "bg-[#1D4ED8] text-white",
  SCREENING: "bg-[#92400E] text-white",
  INTERVIEW: "bg-[#6D28D9] text-white",
  ASSIGNMENT: "bg-[#C2410C] text-white",
  OFFER: "bg-[#15803D] text-white",
  REJECTED: "bg-[#9F1239] text-white",
}

// Bare hex of the same tokens, for places that need a text color rather than a badge
// (pipeline dots, "Current stage" value in the Details card).
const STATUS_HEX: Record<ApplicationStatus, string> = {
  APPLIED: "#1D4ED8",
  SCREENING: "#92400E",
  INTERVIEW: "#6D28D9",
  ASSIGNMENT: "#C2410C",
  OFFER: "#15803D",
  REJECTED: "#9F1239",
}

// Light-wash pill colors — used for the clickable "change status" pills.
const STATUS_PILL_ACTIVE: Record<ApplicationStatus, string> = {
  APPLIED: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
  SCREENING: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
  INTERVIEW: "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]",
  ASSIGNMENT: "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]",
  OFFER: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
  REJECTED: "bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]",
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

// The pipeline stepper only tracks the "forward" path — Rejected is a branch,
// not a stage, so it's surfaced via the status pills / history instead.
const PIPELINE_STATUSES: ApplicationStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "ASSIGNMENT",
  "OFFER",
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function daysSince(dateStr: string) {
  const then = new Date(dateStr)
  const now = new Date()
  const diffMs = now.setHours(0, 0, 0, 0) - new Date(then).setHours(0, 0, 0, 0)
  const days = Math.max(0, Math.round(diffMs / 86400000))
  if (days === 0) return "Today"
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

function toISODate(date: Date) {
  return date.toISOString().split("T")[0]
}

function scoreLabel(score: number) {
  if (score >= 85) return "Strong fit — you're well aligned"
  if (score >= 65) return "Good fit — a few gaps to close"
  return "Needs work to close the gap"
}

// ─── Small presentational pieces ───────────────────────────────────────────────

function CheckIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CrossIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ─── Pipeline Stepper ───────────────────────────────────────────────────────────
// Renders the 5-stage forward pipeline. When the application is REJECTED, the
// step matching the applicant's last stage before rejection (from statusHistory)
// is shown in the "rejected" red state; everything after stays empty.

function PipelineStepper({ application }: { application: Application }) {
  let activeIndex = PIPELINE_STATUSES.indexOf(application.status)
  let rejectedAt = -1

  if (application.status === "REJECTED") {
    const sorted = [...(application.statusHistory ?? [])].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    const lastNonRejected = [...sorted].reverse().find((h) => h.status !== "REJECTED")
    rejectedAt = lastNonRejected ? PIPELINE_STATUSES.indexOf(lastNonRejected.status) : 0
    activeIndex = -1
  }

  return (
    <div className="flex items-center gap-0 relative">
      {PIPELINE_STATUSES.map((status, index) => {
        const isDone = activeIndex > -1 && index < activeIndex
        const isActive = activeIndex > -1 && index === activeIndex
        const isRejectedHere = rejectedAt === index
        const lineFilled = isDone || isActive || (rejectedAt > -1 && index < rejectedAt) || isRejectedHere
        const isLast = index === PIPELINE_STATUSES.length - 1

        return (
          <div key={status} className="flex flex-col items-center flex-1 relative">
            {!isLast && (
              <div
                className={`absolute top-[13px] left-1/2 w-full h-[2px] z-0 ${
                  lineFilled ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"
                }`}
              />
            )}
            <div
              className={`w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center relative z-10 flex-shrink-0 ${
                isDone
                  ? "bg-[#FF6B35] border-[#FF6B35] text-white"
                  : isActive
                  ? "bg-white border-[#FF6B35] text-[#FF6B35] shadow-[0_0_0_4px_rgba(255,107,53,0.12)]"
                  : isRejectedHere
                  ? "bg-[#9F1239] border-[#9F1239] text-white"
                  : "bg-white border-[#E5E7EB] text-[#9CA3AF]"
              }`}
            >
              {isDone && <CheckIcon />}
              {isActive && <span className="w-[8px] h-[8px] rounded-full bg-[#FF6B35]" />}
              {isRejectedHere && <CrossIcon />}
              {!isDone && !isActive && !isRejectedHere && (
                <span className="w-[9px] h-[9px] rounded-full border-2 border-[#9CA3AF]" />
              )}
            </div>
            <span
              className={`mt-[7px] text-[10.5px] font-medium text-center whitespace-nowrap ${
                isActive
                  ? "text-[#FF6B35] font-semibold"
                  : isDone
                  ? "text-[#6B7280]"
                  : isRejectedHere
                  ? "text-[#9F1239] font-semibold"
                  : "text-[#9CA3AF]"
              }`}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Score ring (Resume match) ─────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1 mb-[18px]">
      <div className="relative w-[88px] h-[88px]">
        <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="7" />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="#FF6B35"
            strokeWidth="7"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-bold text-gray-900 tracking-tight">{score}</span>
          <span className="text-[10px] text-gray-400 font-medium -mt-0.5">% match</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 font-medium">{scoreLabel(score)}</span>
    </div>
  )
}

// ─── Job description modal ──────────────────────────────────────────────────────

function JobDescriptionModal({
  jobDescription,
  onClose,
}: {
  jobDescription: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[80vh] bg-white rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F1F4] flex-shrink-0">
          <h3 className="text-[15px] font-semibold text-gray-900">Job description</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">
          <pre className="text-[13px] text-[#374151] whitespace-pre-wrap font-sans leading-[1.65]">
            {jobDescription}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { getToken } = useAuth()

  // ── Tab / UI-only state ──
  const [activeTab, setActiveTab] = useState<"overview" | "aitools" | "reminder">("overview")
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [jdModalOpen, setJdModalOpen] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)

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

  // ─── Close overflow menu on outside click ──────────────────────────────────

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
  const answeredCount = currentQuestions.filter((q) => (answers[q.id] ?? "").trim() !== "").length
  const progressPct = currentQuestions.length > 0 ? (answeredCount / currentQuestions.length) * 100 : 0
  const sortedHistory = application.statusHistory
    ? [...application.statusHistory].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : []

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen -m-8">

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[380px] bg-white rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-7"
          >
            <div className="w-11 h-11 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-4 text-[#DC2626]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete this application?</h3>
            <p className="text-[13.5px] text-gray-500 leading-relaxed mb-6">
              This will permanently remove {application.companyName} — {application.jobTitle} from your
              tracker. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="text-sm px-4 py-2 rounded-[6px] text-gray-500 border border-[#E5E7EB] hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm font-semibold px-4 py-2 rounded-[6px] bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job description modal */}
      {jdModalOpen && application.jobDescription && (
        <JobDescriptionModal
          jobDescription={application.jobDescription}
          onClose={() => setJdModalOpen(false)}
        />
      )}

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-8 h-[58px] flex items-center gap-4 flex-shrink-0">
        <Link
          href="/applications"
          className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 flex-shrink-0 transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Applications
        </Link>
        <div className="w-px h-[18px] bg-[#E5E7EB] flex-shrink-0" />
        <span className="text-[15px] font-semibold text-gray-900">{application.companyName}</span>
        <span className="text-[13px] text-gray-500">{application.jobTitle}</span>
        <div
          className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-[3px] rounded-full text-white flex-shrink-0 ${STATUS_COLORS[application.status]}`}
        >
          <span className="w-[5px] h-[5px] rounded-full bg-white/65" />
          {STATUS_LABELS[application.status]}
        </div>

        <div className="ml-auto flex items-center gap-2" ref={overflowRef}>
          <div className="relative">
            <button
              onClick={() => setOverflowOpen((o) => !o)}
              className="w-8 h-8 rounded-[6px] border border-[#E5E7EB] flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              aria-label="More actions"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {overflowOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.09),0_1px_4px_rgba(0,0,0,0.05)] min-w-[160px] overflow-hidden z-50">
                <button
                  disabled
                  title="Coming soon"
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium text-gray-300 cursor-not-allowed text-left"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit details
                  <span className="ml-auto text-[10px] text-gray-300">Soon</span>
                </button>
                <button
                  onClick={() => {
                    setOverflowOpen(false)
                    setConfirmDelete(true)
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 text-left transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Tabs bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-8 pt-3 bg-white border-b border-[#E5E7EB] flex-shrink-0">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 pt-2 pb-[11px] text-[13.5px] -mb-px border-b-2 transition-colors ${
            activeTab === "overview"
              ? "text-[#FF6B35] font-semibold border-[#FF6B35]"
              : "text-gray-500 font-medium border-transparent hover:text-gray-900"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("aitools")}
          className={`flex items-center gap-1.5 px-4 pt-2 pb-[11px] text-[13.5px] -mb-px border-b-2 transition-colors ${
            activeTab === "aitools"
              ? "text-[#FF6B35] font-semibold border-[#FF6B35]"
              : "text-gray-500 font-medium border-transparent hover:text-gray-900"
          }`}
        >
          AI Tools
          <span className="text-[11px] font-semibold bg-[rgba(255,107,53,0.12)] text-[#FF6B35] px-1.5 py-px rounded-full">
            2
          </span>
        </button>
        <button
          onClick={() => setActiveTab("reminder")}
          className={`px-4 pt-2 pb-[11px] text-[13.5px] -mb-px border-b-2 transition-colors ${
            activeTab === "reminder"
              ? "text-[#FF6B35] font-semibold border-[#FF6B35]"
              : "text-gray-500 font-medium border-transparent hover:text-gray-900"
          }`}
        >
          Reminder
        </button>
      </div>

      {/* ── Page body ─────────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 py-7 pb-12">

        {/* Inline error banner (status/notes/delete errors that don't kill the page) */}
        {error && (
          <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] px-3.5 py-2.5 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ════════════════ OVERVIEW TAB ════════════════ */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">

            {/* Left column */}
            <div>
              {/* Company card */}
              <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] mb-4">

                <div className="px-[22px] pt-[22px] pb-5 border-b border-[#F0F1F4]">
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-11 h-11 rounded-[10px] border border-[#E5E7EB] bg-[#F3F4F6] flex items-center justify-center text-lg font-bold text-[#FF6B35] flex-shrink-0">
                      {application.companyName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-900 tracking-tight">{application.companyName}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{application.jobTitle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-[#F3F4F6] border border-[#E5E7EB] px-2.5 py-[3px] rounded-full">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      {SOURCE_LABELS[application.source]}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-[#F3F4F6] border border-[#E5E7EB] px-2.5 py-[3px] rounded-full">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Applied {formatDate(application.dateApplied)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-[#F3F4F6] border border-[#E5E7EB] px-2.5 py-[3px] rounded-full">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {daysSince(application.dateApplied)}
                    </span>
                  </div>
                </div>

                {/* Pipeline */}
                <div className="px-[22px] py-5">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="text-[11px] font-semibold text-gray-400 tracking-wide uppercase">Pipeline</div>
                    {statusUpdated && <span className="text-[13px] text-[#15803D] font-medium">Updated</span>}
                  </div>
                  <PipelineStepper application={application} />

                  {/* Clickable status pills */}
                  <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-[#F0F1F4]">
                    {ALL_STATUSES.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        disabled={updatingStatus}
                        className={`px-3 py-1 rounded-full text-xs font-medium border-[1.5px] transition-all disabled:opacity-50 ${
                          application.status === status
                            ? STATUS_PILL_ACTIVE[status]
                            : "bg-[#F3F4F6] text-gray-500 border-transparent hover:border-[#E5E7EB] hover:text-gray-900"
                        }`}
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* History */}
                {sortedHistory.length > 0 && (
                  <div className="px-[22px] py-5 border-t border-[#F0F1F4]">
                    <div className="text-[11px] font-semibold text-gray-400 tracking-wide uppercase mb-3">
                      Status history
                    </div>
                    <div className="flex flex-col">
                      {sortedHistory.map((entry, index) => (
                        <div key={entry.id} className="flex items-start gap-3 relative pb-3.5 last:pb-0">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <span
                              className={`rounded-full mt-1 flex-shrink-0 ${
                                index === 0 ? "w-[10px] h-[10px] bg-[#FF6B35] mt-1" : "w-2 h-2 bg-[#E5E7EB] mt-[5px]"
                              }`}
                            />
                            {index < sortedHistory.length - 1 && (
                              <div className="w-px bg-[#E5E7EB] flex-1 min-h-[18px] mt-1" />
                            )}
                          </div>
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`inline-flex items-center text-[11.5px] font-semibold px-2 py-0.5 rounded-full text-white ${STATUS_COLORS[entry.status]}`}
                            >
                              {STATUS_LABELS[entry.status]}
                            </span>
                            <span className="text-[11.5px] text-gray-400">{formatDate(entry.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="px-[18px] pt-3.5 pb-3 border-b border-[#F0F1F4]">
                  <span className="text-[13px] font-semibold text-gray-900">Notes</span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Add notes, links, contacts, anything useful about this application…"
                  className="w-full min-h-[110px] px-4 py-3.5 text-[13.5px] text-gray-900 resize-y outline-none leading-relaxed"
                />
                <div className="flex items-center justify-end gap-2.5 px-3.5 py-2.5 border-t border-[#F0F1F4] bg-[#FAFAFA] rounded-b-[10px]">
                  {notesSaved && !notesChanged && (
                    <span className="text-[12.5px] text-[#15803D] font-medium">Saved</span>
                  )}
                  <button
                    onClick={handleSaveNotes}
                    disabled={!notesChanged || savingNotes}
                    className="text-[13px] font-semibold px-4 py-[7px] bg-[#FF6B35] text-white rounded-[6px] disabled:opacity-45 hover:bg-[#E85A26] transition-colors"
                  >
                    {savingNotes ? "Saving..." : "Save notes"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              {/* Details */}
              <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="px-[18px] pt-3.5 pb-3 border-b border-[#F0F1F4]">
                  <span className="text-[13px] font-semibold text-gray-900">Details</span>
                </div>
                <div className="p-[18px] flex flex-col gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-[6px] bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0 text-gray-500">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400 font-medium mb-px">Source</div>
                      <div className="text-[13px] text-gray-900 font-medium">{SOURCE_LABELS[application.source]}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-[6px] bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0 text-gray-500">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400 font-medium mb-px">Applied on</div>
                      <div className="text-[13px] text-gray-900 font-medium">{formatDate(application.dateApplied)}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-[6px] bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0 text-gray-500">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400 font-medium mb-px">Days since applied</div>
                      <div className="text-[13px] text-gray-900 font-medium">{daysSince(application.dateApplied)}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-[6px] bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0 text-gray-500">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400 font-medium mb-px">Current stage</div>
                      <div
                        className="text-[13px] font-semibold"
                        style={{ color: STATUS_HEX[application.status] }}
                      >
                        {STATUS_LABELS[application.status]}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Job description */}
              {application.jobDescription && (
                <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="px-[18px] pt-3.5 pb-3 border-b border-[#F0F1F4] flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-gray-900">Job description</span>
                    <button
                      onClick={() => setJdModalOpen(true)}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-500 border border-[#E5E7EB] rounded-[6px] px-2.5 py-1 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                      Expand
                    </button>
                  </div>
                  <div className="px-[18px] py-4 max-h-[280px] overflow-y-auto">
                    <pre className="text-[12.5px] text-[#374151] whitespace-pre-wrap font-sans leading-[1.65]">
                      {application.jobDescription}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ AI TOOLS TAB ════════════════ */}
        {activeTab === "aitools" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

            {/* Resume Analysis */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F0F1F4] flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-[8px] bg-[#FFF4EF] text-[#FF6B35] flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Resume match</div>
                    <div className="text-xs text-gray-500 mt-0.5">How well your resume fits this JD</div>
                  </div>
                </div>
                <button
                  onClick={handleAnalyzeResume}
                  disabled={analyzingResume}
                  className="text-[13px] font-semibold px-3.5 py-[7px] bg-[#FF6B35] text-white rounded-[6px] disabled:opacity-45 hover:bg-[#E85A26] whitespace-nowrap transition-colors"
                >
                  {analyzingResume ? "Analysing..." : "Analyse"}
                </button>
              </div>

              <div className="p-5">
                {analysisError && (
                  <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] px-3.5 py-2.5 text-sm text-red-600">
                    {analysisError}
                  </div>
                )}

                {!analysis && !analysisError && (
                  <div className="flex flex-col items-center justify-center text-center gap-2.5 py-7 px-5">
                    <div className="w-12 h-12 rounded-[12px] bg-[#FFF4EF] flex items-center justify-center mb-1">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    </div>
                    <div className="text-[13.5px] font-semibold text-gray-900">No analysis yet</div>
                    <div className="text-xs text-gray-500 max-w-[220px]">
                      Click Analyse to compare your resume against this job description
                    </div>
                  </div>
                )}

                {analysis && (
                  <div>
                    <ScoreRing score={analysis.matchScore} />

                    {analysis.missingKeywords.length > 0 && (
                      <div className="mb-3.5">
                        <div className="text-[11.5px] font-semibold text-gray-400 mb-2.5">Missing keywords</div>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.missingKeywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="text-[11.5px] font-medium px-2.5 py-[3px] rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.suggestions.length > 0 && (
                      <div>
                        <div className="text-[11.5px] font-semibold text-gray-400 mb-2.5">Suggestions</div>
                        <div className="flex flex-col gap-2">
                          {analysis.suggestions.map((suggestion, i) => (
                            <div key={i} className="flex gap-2 text-[12.5px] text-gray-700 leading-relaxed">
                              <span className="w-[5px] h-[5px] rounded-full bg-[#FF6B35] flex-shrink-0 mt-[6px]" />
                              <span>{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Interview Prep — spans full width once questions exist */}
            <div
              className={`bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden ${
                currentQuestions.length > 0 ? "md:col-span-2" : ""
              }`}
            >
              <div className="px-5 py-4 border-b border-[#F0F1F4] flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-[8px] bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Interview prep</div>
                    <div className="text-xs text-gray-500 mt-0.5">AI questions based on this job description</div>
                  </div>
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
                    className="text-[13px] font-semibold px-3.5 py-[7px] bg-[#FF6B35] text-white rounded-[6px] disabled:opacity-45 hover:bg-[#E85A26] whitespace-nowrap transition-colors"
                  >
                    {generatingPrep
                      ? "Generating..."
                      : currentQuestions.length > 0
                      ? "Regenerate"
                      : "Generate"}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-xs text-gray-500">Replace questions and answers?</span>
                    <button
                      onClick={() => {
                        setConfirmRegenerate(false)
                        handleGenerateInterviewPrep()
                      }}
                      className="text-[13px] font-semibold px-3 py-[7px] bg-red-600 text-white rounded-[6px] hover:bg-red-700"
                    >
                      Yes, regenerate
                    </button>
                    <button
                      onClick={() => setConfirmRegenerate(false)}
                      className="text-[13px] px-2 text-gray-500 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="p-5">
                {prepError && (
                  <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] px-3.5 py-2.5 text-sm text-red-600">
                    {prepError}
                  </div>
                )}

                {currentQuestions.length === 0 && !prepError && (
                  <div className="flex flex-col items-center justify-center text-center gap-2.5 py-7 px-5">
                    <div className="w-12 h-12 rounded-[12px] bg-[#F5F3FF] flex items-center justify-center mb-1">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div className="text-[13.5px] font-semibold text-gray-900">No questions yet</div>
                    <div className="text-xs text-gray-500 max-w-[220px]">
                      Generate role-specific interview questions to practise with
                    </div>
                  </div>
                )}

                {currentQuestions.length > 0 && (
                  <div>
                    {/* Progress indicator — visual only, Save Answers stays below per spec */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                        {answeredCount} of {currentQuestions.length} answered
                      </span>
                      <div className="h-1 bg-[#E5E7EB] rounded-full flex-1 overflow-hidden">
                        <div
                          className="h-full bg-[#FF6B35] rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {currentQuestions.map((q, index) => {
                        const isAnswered = (answers[q.id] ?? "").trim() !== ""
                        return (
                          <div key={q.id} className="border border-[#E5E7EB] rounded-[6px] overflow-hidden">
                            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-[#F3F4F6] border-b border-[#E5E7EB]">
                              <div className="w-5 h-5 rounded-full bg-[#FF6B35] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-px">
                                {index + 1}
                              </div>
                              <div className="text-[13px] font-medium text-gray-900 leading-relaxed">
                                {q.question}
                              </div>
                              {isAnswered && (
                                <div className="ml-auto flex-shrink-0 text-[#15803D]">
                                  <CheckIcon size={16} />
                                </div>
                              )}
                            </div>
                            <textarea
                              value={answers[q.id] ?? ""}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                              }
                              rows={2}
                              placeholder="Write your answer here…"
                              className="w-full min-h-[70px] px-3.5 py-[11px] text-[13px] text-gray-900 resize-y outline-none leading-relaxed"
                            />
                          </div>
                        )
                      })}

                      {/* Save answers */}
                      <div className="flex items-center justify-between pt-1">
                        {answersSaved && (
                          <span className="text-sm text-[#15803D] font-medium">Answers saved.</span>
                        )}
                        <div className="ml-auto">
                          <button
                            onClick={handleSaveAnswers}
                            disabled={savingAnswers}
                            className="text-[13px] font-semibold px-4 py-[7px] bg-[#FF6B35] text-white rounded-[6px] disabled:opacity-45 hover:bg-[#E85A26] transition-colors"
                          >
                            {savingAnswers ? "Saving..." : "Save answers"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ REMINDER TAB ════════════════ */}
        {activeTab === "reminder" && (
          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">

            {/* Form */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="px-5 pt-4 pb-3.5 border-b border-[#F0F1F4]">
                <div className="text-sm font-semibold text-gray-900">Set a reminder</div>
                <div className="text-[12.5px] text-gray-500 mt-0.5">Get an email when you need to follow up</div>
              </div>
              <div className="p-5">
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Reminder date</label>
                  <input
                    type="date"
                    min={toISODate(new Date())}
                    value={reminderDate}
                    onChange={(e) => {
                      setReminderDate(e.target.value)
                      setReminderSaved(false)
                      setReminderError(null)
                    }}
                    className="w-full border border-[#E5E7EB] rounded-[6px] px-3 py-[9px] text-[13.5px] text-gray-900 bg-white outline-none focus:border-[#FF6B35] focus:ring-[3px] focus:ring-[rgba(255,107,53,0.12)] cursor-pointer"
                  />
                </div>
                <div className="mb-5">
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Note (optional)</label>
                  <textarea
                    value={reminderNotes}
                    onChange={(e) => setReminderNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g. Follow up on application status, ask about timeline…"
                    className="w-full border border-[#E5E7EB] rounded-[6px] px-3 py-[9px] text-[13.5px] text-gray-900 bg-white outline-none focus:border-[#FF6B35] focus:ring-[3px] focus:ring-[rgba(255,107,53,0.12)] resize-y leading-relaxed"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCreateReminder}
                    disabled={savingReminder}
                    className="text-[13px] font-semibold px-4 py-2 bg-[#FF6B35] text-white rounded-[6px] disabled:opacity-45 hover:bg-[#E85A26] transition-colors"
                  >
                    {savingReminder ? "Saving..." : "Set reminder"}
                  </button>
                  {reminderSaved && (
                    <span className="text-sm text-[#15803D] font-medium">Reminder set.</span>
                  )}
                  {reminderError && (
                    <span className="text-sm text-red-500">{reminderError}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Info + upcoming */}
            <div>
              <div className="bg-[#FFF4EF] border border-[rgba(255,107,53,0.2)] rounded-[10px] p-4">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#FF6B35] mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  How reminders work
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    "Pick a date — the day you want to follow up if you haven't heard back.",
                    "On that morning, ApplynTrack sends an email to your registered address.",
                    "The email includes the company name, role, and your note so you have full context.",
                    "You can update or delete a reminder any time before it fires.",
                  ].map((line) => (
                    <div key={line} className="flex gap-2 text-[12.5px] text-gray-700 leading-relaxed">
                      <span className="text-[#FF6B35] flex-shrink-0">•</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming reminders — static placeholder; no list endpoint exists yet */}
              <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] mt-4">
                <div className="px-[18px] pt-3.5 pb-3 border-b border-[#F0F1F4] text-[13px] font-semibold text-gray-900">
                  Upcoming reminders
                </div>
                <div className="px-[18px] py-8 text-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <div className="text-[13px] text-gray-500">No reminders set for this application</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}