"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Bell,
  Check,
  Copy,
  Flag,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react"
import type { Application, ApplicationStatus } from "../../../types"
import CompanyLogo from "../../../components/CompanyLogo"
import Skeleton from "../../../components/Skeleton"
import Button from "../../../components/ui/Button"
import Chip, { Tag } from "../../../components/ui/Chip"
import EmptyState from "../../../components/ui/EmptyState"
import Eyebrow from "../../../components/ui/Eyebrow"
import { FieldError, FieldHint, Input, Label, Textarea } from "../../../components/ui/Field"
import Modal from "../../../components/ui/Modal"
import ScoreMeter, { ScoreBar } from "../../../components/ui/ScoreMeter"
import Stepper from "../../../components/ui/Stepper"
import { StatusDot, StatusLabel, StatusTransition } from "../../../components/ui/StatusBadge"
import Tabs from "../../../components/ui/Tabs"
import {
  useAnalyzeResume,
  useApplication,
  useCreateReminder,
  useDeleteApplication,
  useResumeAnalysis,
  useUpdateApplication,
} from "../../../lib/queries"
import { cn } from "../../../lib/cn"
import {
  daysSince,
  daysSinceLastStatusChange,
  formatDateTime,
  formatDateUS,
} from "../../../lib/dates"
import { PIPELINE_STAGES, SOURCE_LABELS } from "../../../lib/status"
import ApplicationsPage from "../page"

type TabValue = "overview" | "ai" | "reminder"

const TABS: { value: TabValue; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "ai", label: "AI Resume Fit" },
  { value: "reminder", label: "Reminder" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(date: Date) {
  return date.toISOString().split("T")[0]
}

function inDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

function scoreLabel(score: number) {
  if (score >= 85) return "Strong fit — you're well aligned"
  if (score >= 65) return "Good fit — a few gaps to close"
  return "Needs work to close the gap"
}

function scoreTag(score: number) {
  if (score >= 85) return "STRONG"
  if (score >= 65) return "GOOD"
  return "NEEDS WORK"
}

// Rejected is a branch, not a stage: the stepper shows the last stage reached
// (from statusHistory) in the red "rejected" state.
function rejectedStageIndex(application: Application) {
  const sorted = [...(application.statusHistory ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  const lastNonRejected = [...sorted].reverse().find((h) => h.status !== "REJECTED")
  return lastNonRejected ? Math.max(0, PIPELINE_STAGES.indexOf(lastNonRejected.status)) : 0
}

const SECTION_DIVIDER = "mt-5 border-t border-line pt-5"

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationQuery = useApplication(id)
  const analysisQuery = useResumeAnalysis(id)
  const updateApplication = useUpdateApplication(id)
  const deleteApplication = useDeleteApplication()
  const analyzeResume = useAnalyzeResume()
  const createReminder = useCreateReminder()
  const application = applicationQuery.data ?? null
  const loading = applicationQuery.isPending
  const savedAnalysis = analysisQuery.isError ? null : analysisQuery.data ?? null
  const loadingAnalysis = analysisQuery.isPending
  const [now] = useState(() => Date.now())

  // ── Tab / UI-only state ──
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    const requested = searchParams.get("tab")
    return TABS.some((t) => t.value === requested) ? (requested as TabValue) : "overview"
  })
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [jdModalOpen, setJdModalOpen] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)

  // ── Notes state ──
  const [notes, setNotes] = useState("")
  const [notesInitFor, setNotesInitFor] = useState<string | null>(null)
  const [notesSaved, setNotesSaved] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const error = applicationQuery.error?.message ?? actionError

  // ── Status state ──
  const [statusUpdated, setStatusUpdated] = useState(false)

  // ── Delete state ──
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Resume analysis state ──
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // ── Reminder state ──
  const [reminderDate, setReminderDate] = useState("")
  const [reminderNotes, setReminderNotes] = useState("")
  const [reminderSaved, setReminderSaved] = useState(false)
  const [reminderError, setReminderError] = useState<string | null>(null)

  // Initialize the notes editor once per application, so a refetch never replaces typing.
  if (application && notesInitFor !== application.id) {
    setNotesInitFor(application.id)
    setNotes(application.notes ?? "")
  }

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

  // ─── Status update ────────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!application || updateApplication.isPending || newStatus === application.status) return

    setStatusUpdated(false)
    try {
      await updateApplication.mutateAsync({ status: newStatus })
      setStatusUpdated(true)
      setTimeout(() => setStatusUpdated(false), 2000)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  // ─── Notes save ───────────────────────────────────────────────────────────

  const handleSaveNotes = async () => {
    if (!application || updateApplication.isPending) return

    try {
      await updateApplication.mutateAsync({ notes })
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to save notes")
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    try {
      await deleteApplication.mutateAsync(id)
      router.push("/applications")
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete application")
      setConfirmDelete(false)
    }
  }

  // ─── Resume Analysis ──────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!application) return

    // Client-side pre-check — no point calling the API without a JD
    if (!application.jobDescription) {
      setAnalysisError("Add a job description to this application first.")
      return
    }

    setAnalysisError(null)
    try {
      await analyzeResume.mutateAsync(application.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed"
      // Surface the backend's specific "no resume" error clearly
      if (message.toLowerCase().includes("resume")) {
        setAnalysisError("No resume uploaded. Upload one from your profile page.")
      } else {
        setAnalysisError(message)
      }
    }
  }

  const improvementPrompt =
    savedAnalysis && application
      ? `I applied for a ${application.jobTitle} role at ${application.companyName}. My resume was analysed and here is what came back:

Match Score: ${savedAnalysis.matchScore}/100
Missing Keywords: ${savedAnalysis.missingKeywords.join(", ")}
Red Flags: ${savedAnalysis.redFlags.join(", ")}
Strongest Points: ${savedAnalysis.strongestPoints.join(", ")}
Recruiter Take: ${savedAnalysis.recruiterTake}

Please help me improve my resume to address these gaps.`
      : ""

  const handleCopyPrompt = () => {
    if (!savedAnalysis || !application) return
    navigator.clipboard.writeText(improvementPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── Create Reminder ──────────────────────────────────────────────────────

  const handleCreateReminder = async () => {
    if (!reminderDate) {
      setReminderError("Please select a reminder date.")
      return
    }

    setReminderError(null)
    setReminderSaved(false)

    try {
      await createReminder.mutateAsync({
        applicationId: id,
        reminderDate,
        notes: reminderNotes.trim() || undefined,
      })
      setReminderSaved(true)
      setReminderDate("")
      setReminderNotes("")
    } catch (err: unknown) {
      setReminderError(err instanceof Error ? err.message : "Failed to set reminder")
    }
  }

  const pickReminderDate = (value: string) => {
    setReminderDate(value)
    setReminderSaved(false)
    setReminderError(null)
  }

  // ─── Render: modal frame ──────────────────────────────────────────────────

  const close = () => router.push("/applications")
  const frame = (content: React.ReactNode, escape = true) => (
    <>
      {/* The board stays visible behind the dialog, like the design. */}
      <ApplicationsPage />
      <Modal
        onClose={close}
        size="lg"
        label="Application details"
        showClose={false}
        closeOnEscape={escape}
        className="flex h-[min(820px,calc(100vh-48px))] flex-col overflow-hidden"
      >
        {content}
      </Modal>
    </>
  )

  // ─── Render: loading / error ──────────────────────────────────────────────

  if (loading) {
    return frame(
      <div className="flex flex-col gap-5 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (error && !application) {
    return frame(<div className="p-8 text-danger">{error}</div>)
  }

  if (!application) {
    return frame(<div className="p-8 text-muted">Application not found.</div>)
  }

  const notesChanged = notes !== (application.notes ?? "")
  const sortedHistory = application.statusHistory
    ? [...application.statusHistory].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : []
  const quietDays = daysSinceLastStatusChange(application, now)
  const isQuiet = quietDays >= 14
  const isRejected = application.status === "REJECTED"

  // ─── Render ───────────────────────────────────────────────────────────────

  return frame(
    <>
      {/* Delete confirmation modal */}
      {confirmDelete && (
        <Modal
          size="sm"
          label="Delete application"
          showClose={false}
          onClose={() => !deleteApplication.isPending && setConfirmDelete(false)}
        >
          <div className="p-7">
            <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-danger-tint text-danger">
              <Trash2 size={20} />
            </div>
            <h3 className="m-0 mb-2 text-base font-semibold">Delete this application?</h3>
            <p className="m-0 mb-6 text-sm2 leading-relaxed text-body">
              This will permanently remove {application.companyName} — {application.jobTitle} from
              your tracker. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteApplication.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleteApplication.isPending}
              >
                {deleteApplication.isPending ? "Deleting..." : "Yes, delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Job description modal */}
      {jdModalOpen && application.jobDescription && (
        <Modal size="md" label="Job description" onClose={() => setJdModalOpen(false)}>
          <div className="flex max-h-[80vh] flex-col">
            <div className="shrink-0 border-b border-line px-6 py-4">
              <h3 className="m-0 text-[15px] font-semibold">Job description</h3>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <pre className="m-0 whitespace-pre-wrap font-sans text-sm2 leading-[1.65] text-body">
                {application.jobDescription}
              </pre>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="shrink-0 px-8 pt-7">
        <div className="flex items-start gap-3.5">
          <CompanyLogo
            domain={application.companyDomain}
            name={application.companyName}
            size={44}
            tone={application.status}
          />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-2xl font-semibold leading-[1.2] tracking-[-0.03em]">
              {application.companyName}
            </h1>
            <p className="m-0 mt-0.5 text-[15px] text-body">{application.jobTitle}</p>
            <p className="m-0 mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-mono uppercase tracking-[0.06em] text-muted">
              <StatusLabel status={application.status} className="text-ink" />
              <span aria-hidden="true">·</span>
              <span>{SOURCE_LABELS[application.source]}</span>
              <span aria-hidden="true">·</span>
              <span>Applied {formatDateUS(application.dateApplied)}</span>
              <span aria-hidden="true">·</span>
              {isQuiet ? (
                <span className="text-brand">Quiet {quietDays} days</span>
              ) : (
                <span>{daysSince(application.dateApplied)}</span>
              )}
            </p>
          </div>

          <div ref={overflowRef} className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOverflowOpen((o) => !o)}
              className="inline-flex size-8 items-center justify-center rounded-ctl text-ink transition-colors hover:bg-surface-hover"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
            >
              <MoreVertical size={18} />
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="inline-flex size-8 items-center justify-center rounded-ctl text-ink transition-colors hover:bg-surface-hover"
            >
              <X size={18} />
            </button>
            {overflowOpen && (
              <div
                role="menu"
                className="absolute right-9 top-[38px] z-50 min-w-[200px] rounded-btn bg-surface p-1 shadow-[0_0_0_1px_var(--color-line),0_8px_24px_rgba(23,23,23,0.12)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled
                  title="Coming soon"
                  className="flex h-9 w-full cursor-not-allowed items-center gap-2 rounded-chip px-2.5 text-left text-sm2 font-medium text-faint"
                >
                  <Pencil size={14} />
                  Edit details
                  <span className="ml-auto text-micro text-faint">Soon</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOverflowOpen(false)
                    setConfirmDelete(true)
                  }}
                  className="flex h-9 w-full items-center gap-2 rounded-chip px-2.5 text-left text-sm2 font-medium text-danger transition-colors hover:bg-surface-hover"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <Tabs tabs={TABS} value={activeTab} onChange={setActiveTab} className="mt-[22px]" />
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-6">
        {/* Inline error banner (status/notes/delete errors that don't kill the page) */}
        {error && (
          <div className="mb-4 rounded-ctl border border-danger/30 bg-danger-tint px-3.5 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        {/* ════════════════ OVERVIEW TAB ════════════════ */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-6">
            <section>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Eyebrow>Stage</Eyebrow>
                  {statusUpdated && (
                    <span role="status" className="font-mono text-mono tracking-[0.06em] text-success">
                      Updated
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!isRejected && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange("REJECTED")}
                      disabled={updateApplication.isPending}
                      className="inline-flex items-center gap-1.5 py-1 text-sm2 font-medium text-body transition-colors hover:text-ink disabled:opacity-50"
                    >
                      <StatusDot status="REJECTED" />
                      Mark as rejected
                    </button>
                  )}
                </div>
              </div>
              <Stepper
                current={application.status}
                rejectedAt={isRejected ? rejectedStageIndex(application) : undefined}
                onSelect={handleStatusChange}
                disabled={updateApplication.isPending}
              />
            </section>

            <section>
              <Eyebrow className="mb-2.5">Notes</Eyebrow>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add notes, links, contacts, anything useful about this application…"
                className="min-h-[120px] text-sm"
              />
              <div className="mt-2.5 flex items-center justify-end gap-2.5">
                {notesSaved && !notesChanged && (
                  <span role="status" className="font-mono text-mono tracking-[0.06em] text-success">
                    Saved
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveNotes}
                  disabled={!notesChanged || updateApplication.isPending}
                >
                  {updateApplication.isPending ? "Saving..." : "Save notes"}
                </Button>
              </div>
            </section>

            {application.jobDescription && (
              <section>
                <div className="mb-2.5 flex items-center justify-between">
                  <Eyebrow>Job description</Eyebrow>
                  <button
                    type="button"
                    onClick={() => setJdModalOpen(true)}
                    className="text-sm2 font-medium text-body transition-colors hover:text-ink"
                  >
                    Expand
                  </button>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  <pre className="m-0 whitespace-pre-wrap font-sans text-sm leading-[1.6] text-body">
                    {application.jobDescription}
                  </pre>
                </div>
              </section>
            )}

            {sortedHistory.length > 0 && (
              <section>
                <Eyebrow className="mb-3">Status history</Eyebrow>
                <ol className="m-0 flex list-none flex-col p-0">
                  {sortedHistory.map((entry, index) => (
                    <li key={entry.id} className="relative flex min-h-12 gap-3 pb-2.5">
                      {index < sortedHistory.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-0 left-[9.5px] top-[22px] w-px bg-line"
                        />
                      )}
                      <CompanyLogo
                        domain={application.companyDomain}
                        name={application.companyName}
                        size={20}
                        tone={entry.status}
                      />
                      <div className="min-w-0">
                        <div className="text-sm leading-[22px]">
                          <StatusTransition
                            from={sortedHistory[index + 1]?.status ?? null}
                            to={entry.status}
                            size="sm"
                          />
                        </div>
                        <div className="mt-0.5 font-mono text-mono tracking-[0.04em] text-muted">
                          {formatDateTime(entry.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}

        {/* ════════════════ AI RESUME FIT TAB ════════════════ */}
        {activeTab === "ai" && (
          <div className="flex flex-col gap-4">
            {/* Resume banner */}
            <p className="m-0 text-sm2 text-body">
              Analysis is based on your currently uploaded resume.{" "}
              <Link href="/profile" className="text-brand hover:underline">
                Update resume in Profile
              </Link>{" "}
              to reanalyse with a newer version.
            </p>

            {/* Loading state */}
            {loadingAnalysis && <div className="text-sm2 text-body">Loading...</div>}

            {/* No analysis yet */}
            {!loadingAnalysis && !savedAnalysis && (
              <EmptyState
                title="No analysis yet"
                description="Compare your resume against this job description"
                action={
                  <div className="flex flex-col items-center gap-3">
                    {analysisError && <div className="text-sm text-danger">{analysisError}</div>}
                    <Button onClick={handleAnalyze} disabled={analyzeResume.isPending}>
                      {analyzeResume.isPending ? "Analysing..." : "Analyse resume"}
                    </Button>
                  </div>
                }
              />
            )}

            {/* Analysis results */}
            {!loadingAnalysis && savedAnalysis && (
              <div className="rounded-[14px] border border-line bg-surface p-6">
                {/* Reanalyse error (results are visible, so surface it here) */}
                {analysisError && (
                  <div className="mb-4 text-sm text-danger">{analysisError}</div>
                )}

                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <Eyebrow>Resume fit</Eyebrow>
                    <h2 className="m-0 mt-2.5 text-lg font-semibold tracking-[-0.01em]">
                      {application.companyName} — {application.jobTitle}
                    </h2>
                  </div>
                  <ScoreMeter
                    score={savedAnalysis.matchScore}
                    label={scoreTag(savedAnalysis.matchScore)}
                    className="shrink-0"
                  />
                </div>
                <ScoreBar score={savedAnalysis.matchScore} className="mt-5" />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <Eyebrow>Analyzed {formatDateUS(savedAnalysis.createdAt)}</Eyebrow>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAnalyze}
                    disabled={analyzeResume.isPending}
                  >
                    {analyzeResume.isPending ? "Analysing..." : "Reanalyse"}
                  </Button>
                </div>
                <p className="m-0 mt-5 text-[15px] leading-[1.6] text-body">
                  {scoreLabel(savedAnalysis.matchScore)}
                </p>

                {savedAnalysis.missingKeywords.length > 0 && (
                  <div className={SECTION_DIVIDER}>
                    <Eyebrow>Missing keywords</Eyebrow>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {savedAnalysis.missingKeywords.map((kw, i) => (
                        <Tag key={i}>
                          {kw}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}

                <div className={SECTION_DIVIDER}>
                  <Eyebrow>Strongest points</Eyebrow>
                  <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0 text-sm">
                    {savedAnalysis.strongestPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check size={16} className="mt-0.5 shrink-0 text-success" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {savedAnalysis.redFlags.length > 0 && (
                  <div className={SECTION_DIVIDER}>
                    <Eyebrow>Red flags</Eyebrow>
                    <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0 text-sm">
                      {savedAnalysis.redFlags.map((flag, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Flag size={16} className="mt-0.5 shrink-0 text-danger" />
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={SECTION_DIVIDER}>
                  <Eyebrow>Recruiter take</Eyebrow>
                  <blockquote className="m-0 mt-3 border-l-2 border-brand-logo py-0.5 pl-3.5 text-[17px] font-medium leading-normal">
                    {savedAnalysis.recruiterTake}
                  </blockquote>
                </div>

                <div className={SECTION_DIVIDER}>
                  <div className="flex items-center justify-between gap-3">
                    <Eyebrow>Improvement prompt</Eyebrow>
                    <div className="flex items-center gap-2.5">
                      {copied && (
                        <span role="status" className="font-mono text-mono tracking-[0.06em] text-success">
                          Copied!
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyPrompt}
                        aria-label="Copy improvement prompt"
                      >
                        <Copy size={13} />
                        Copy
                      </Button>
                    </div>
                  </div>
                  <pre className="m-0 mt-3 whitespace-pre-wrap rounded-btn bg-surface-alt p-3.5 font-mono text-[12.5px] leading-[1.6] text-body">
                    {improvementPrompt}
                  </pre>
                  <FieldHint className="mt-2.5">Paste this into your preferred AI tool to improve your resume for this role.</FieldHint>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════ REMINDER TAB ════════════════ */}
        {activeTab === "reminder" && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* Form */}
            <div>
              <Eyebrow className="mb-2.5">Remind me on</Eyebrow>
              <div className="flex flex-wrap gap-2">
                <Chip compact selected={reminderDate === inDays(1)} onClick={() => pickReminderDate(inDays(1))}>
                  Tomorrow
                </Chip>
                <Chip compact selected={reminderDate === inDays(3)} onClick={() => pickReminderDate(inDays(3))}>
                  In 3 days
                </Chip>
                <Chip compact selected={reminderDate === inDays(7)} onClick={() => pickReminderDate(inDays(7))}>
                  Next week
                </Chip>
              </div>
              <Label className="sr-only">Reminder date</Label>
              <Input
                type="date"
                min={toISODate(new Date())}
                value={reminderDate}
                onChange={(e) => pickReminderDate(e.target.value)}
                placeholder="Pick a date"
                className="mt-2.5 cursor-pointer"
              />
              {reminderError && <FieldError className="mt-2">{reminderError}</FieldError>}

              <Eyebrow className="mb-2.5 mt-5">Note (optional)</Eyebrow>
              <Textarea
                value={reminderNotes}
                onChange={(e) => setReminderNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Follow up on application status, ask about timeline…"
                className="min-h-[120px] text-sm"
              />

              <Button
                size="cta"
                className="mt-4 w-full"
                onClick={handleCreateReminder}
                disabled={createReminder.isPending}
              >
                <Bell size={15} />
                {createReminder.isPending ? "Saving..." : "Set reminder"}
              </Button>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <p className="m-0 text-xs text-muted">
                  We&apos;ll email you on this date with the application details.
                </p>
                {reminderSaved && (
                  <span role="status" className="shrink-0 font-mono text-mono tracking-[0.06em] text-success">
                    Reminder set.
                  </span>
                )}
              </div>
            </div>

            {/* Upcoming — static placeholder; no list endpoint exists yet */}
            <div>
              <Eyebrow className="mb-1">Upcoming</Eyebrow>
              <div className={cn("rounded-card border border-dashed border-line-dashed px-4 py-8 text-center")}>
                <Bell size={28} className="mx-auto mb-2.5 text-faint" strokeWidth={1.5} />
                <div className="text-sm2 text-muted">No reminders set for this application</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>,
    !confirmDelete && !jdModalOpen
  )
}
