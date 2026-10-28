"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import type { KeyboardCoordinateGetter } from "@dnd-kit/core"
import { FileText, Plus } from "lucide-react"
import type { Application, ApplicationStatus } from "../../types"
import CompanyLogo from "../../components/CompanyLogo"
import Skeleton from "../../components/Skeleton"
import { buttonStyles } from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import { useApplications, useMoveApplication } from "../../lib/queries"
import { cn } from "../../lib/cn"
import { daysSinceLastStatusChange, formatShortDate } from "../../lib/dates"
import {
  ALL_STATUSES,
  SOURCE_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
} from "../../lib/status"

// Backend's definition of "stale" (dashboard.md §2/§8): APPLIED status,
// 14+ days since dateApplied. Drives the header count only.
const STALE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000

// ─── Drag and drop ────────────────────────────────────────────────────────────

// Prefer the column under the pointer; keyboard drags have no pointer, so fall
// back to the column the dragged card overlaps most.
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : rectIntersection(args)
}

// Arrow left/right jump to the neighbouring column.
const columnKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context: { active, over, droppableRects, collisionRect } }
) => {
  if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return undefined
  event.preventDefault()
  if (!active || !collisionRect) return currentCoordinates

  const activeStatus = (active.data.current?.app as Application | undefined)?.status
  const fromStatus = (over?.id as ApplicationStatus | undefined) ?? activeStatus
  const fromIndex = fromStatus ? ALL_STATUSES.indexOf(fromStatus) : 0
  const nextIndex = Math.min(
    ALL_STATUSES.length - 1,
    Math.max(0, fromIndex + (event.code === "ArrowRight" ? 1 : -1))
  )
  const rect = droppableRects.get(ALL_STATUSES[nextIndex])
  if (!rect) return currentCoordinates
  return {
    x: rect.left + rect.width / 2 - collisionRect.width / 2,
    y: rect.top + 80,
  }
}

const statusName = (id: unknown) => STATUS_LABELS[id as ApplicationStatus] ?? String(id)
const companyOf = (data: { current?: Record<string, unknown> | null } | undefined) =>
  (data?.current?.app as Application | undefined)?.companyName ?? "application"

const announcements: Announcements = {
  onDragStart: ({ active }) => `Picked up ${companyOf(active.data)}.`,
  onDragOver: ({ active, over }) =>
    over ? `${companyOf(active.data)} is over ${statusName(over.id)}.` : undefined,
  onDragEnd: ({ active, over }) => {
    const app = active.data.current?.app as Application | undefined
    if (!over || !app || over.id === app.status) {
      return `${companyOf(active.data)} was not moved.`
    }
    return `Moved ${app.companyName} to ${statusName(over.id)}.`
  },
  onDragCancel: ({ active }) => `Move cancelled. ${companyOf(active.data)} was not moved.`,
}

const screenReaderInstructions = {
  draggable:
    "Press space to pick up this application, then use the left and right arrow keys to choose a column and space to drop it. Press escape to cancel. Press enter to open the application.",
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CardBody({ app, now }: { app: Application; now: number }) {
  const days = daysSinceLastStatusChange(app, now)
  const isStale = days >= 14

  return (
    <>
      {isStale && (
        <div className="mb-2 font-mono text-[10.5px] leading-[1.2] tracking-[0.06em] text-brand">
          QUIET {days} DAYS
        </div>
      )}
      <div className="flex items-start gap-2.5">
        <CompanyLogo
          domain={app.companyDomain}
          name={app.companyName}
          size={28}
          tone={app.status}
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-[1.3] tracking-[-0.01em] text-ink">
            {app.companyName}
          </div>
          <div className="mt-0.5 line-clamp-2 text-sm2 leading-[1.35] text-body">
            {app.jobTitle}
          </div>
        </div>
      </div>
      <div className="ml-[38px] mt-2.5 truncate font-mono text-[10.5px] uppercase leading-[1.2] tracking-[0.06em] text-muted">
        {SOURCE_LABELS[app.source]} · {formatShortDate(app.dateApplied)}
      </div>
    </>
  )
}

function ApplicationCard({
  app,
  now,
  moving,
}: {
  app: Application
  now: number
  moving: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: app.id,
    data: { app },
    disabled: moving,
  })
  const isStale = daysSinceLastStatusChange(app, now) >= 14

  return (
    <Link
      ref={setNodeRef}
      href={`/applications/${app.id}`}
      draggable={false}
      data-stale={isStale ? "true" : undefined}
      {...attributes}
      role={undefined}
      {...listeners}
      aria-busy={moving || undefined}
      className={cn(
        "block shrink-0 touch-manipulation select-none rounded-btn bg-surface p-3 shadow-[0_0_0_1px_var(--color-line),0_1px_2px_rgba(23,23,23,0.04)] transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-[0_0_0_1px_var(--color-line-strong),0_4px_12px_rgba(23,23,23,0.06)]",
        app.status === "REJECTED" && "opacity-70",
        isDragging && "opacity-40",
        moving && "pointer-events-none animate-pulse opacity-60"
      )}
    >
      <CardBody app={app} now={now} />
    </Link>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function BoardColumn({
  status,
  items,
  now,
  movingIds,
  draggingFrom,
}: {
  status: ApplicationStatus
  items: Application[]
  now: number
  movingIds: Set<string>
  /** Status of the card being dragged, or null when nothing is dragged. */
  draggingFrom: ApplicationStatus | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const highlight = isOver && draggingFrom !== null && draggingFrom !== status

  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABELS[status]}, ${items.length}`}
      className={cn(
        "flex h-full flex-[0_0_280px] flex-col rounded-card p-2 transition-colors",
        highlight
          ? cn("ring-2 ring-inset", STATUS_STYLES[status].ring, STATUS_STYLES[status].tint)
          : "bg-surface-alt"
      )}
    >
      <div className="shrink-0 px-2 pt-3">
        <div className="flex items-baseline justify-center gap-2">
          <h2 className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-ink">
            {STATUS_LABELS[status]}
          </h2>
          <span className="text-sm font-semibold tabular-nums text-body">{items.length}</span>
        </div>
        <div
          aria-hidden="true"
          className={cn(
            "mb-3 mt-3.5 h-1 rounded-[2px]",
            STATUS_STYLES[status].dot,
            status === "REJECTED" && "opacity-60"
          )}
        />
      </div>
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pt-px">
        {items.map((app) => (
          <ApplicationCard key={app.id} app={app} now={now} moving={movingIds.has(app.id)} />
        ))}
        {items.length === 0 && (
          <div className="flex h-14 shrink-0 items-center justify-center rounded-btn border-[1.5px] border-dashed border-line-dashed text-sm2 text-muted">
            No applications
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const { data, error: queryError, isPending } = useApplications()
  const moveApplication = useMoveApplication()
  const applications = data ?? []
  const loading = isPending
  const error = queryError?.message ?? null
  const [now] = useState(() => Date.now())
  const boardRef = useRef<HTMLDivElement>(null)
  const [moreToRight, setMoreToRight] = useState(false)

  const [activeApp, setActiveApp] = useState<Application | null>(null)
  const [activeWidth, setActiveWidth] = useState<number | undefined>(undefined)
  const [movingIds, setMovingIds] = useState<Set<string>>(() => new Set())
  const [moveError, setMoveError] = useState<string | null>(null)

  // Mouse: drag after 6px so a plain click still opens the card.
  // Touch: press and hold 200ms so scrolling the board still works.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: columnKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    })
  )

  const columns = ALL_STATUSES.map((status) => ({
    status,
    items: applications.filter((app) => app.status === status),
  }))

  // Header count — matches the backend's stale definition exactly
  // (dashboard.md §2/§8), unlike the per-card label above.
  const staleCount = applications.filter(
    (app) =>
      app.status === "APPLIED" &&
      now - new Date(app.dateApplied).getTime() >= STALE_THRESHOLD_MS
  ).length

  const showBoard = !loading && !error && applications.length > 0

  // Fade the right edge while more columns are hidden off-screen.
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const update = () =>
      setMoreToRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [showBoard])

  const onBoardScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    setMoreToRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }

  const scrollToStale = (e: React.MouseEvent) => {
    e.preventDefault()
    document
      .querySelector('[data-stale="true"]')
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    const app = active.data.current?.app as Application | undefined
    setActiveApp(app ?? null)
    setActiveWidth(active.rect.current.initial?.width)
    setMoveError(null)
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveApp(null)
    const app = active.data.current?.app as Application | undefined
    if (!app || !over) return
    const target = over.id as ApplicationStatus
    if (target === app.status || movingIds.has(app.id)) return

    setMovingIds((prev) => new Set(prev).add(app.id))
    try {
      await moveApplication.mutateAsync({ id: app.id, status: target })
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setMovingIds((prev) => {
        const next = new Set(prev)
        next.delete(app.id)
        return next
      })
    }
  }

  const newApplicationButton = (label: string) => (
    <Link href="/applications/new" className={buttonStyles({ size: "cta", className: "shrink-0" })}>
      <Plus size={16} strokeWidth={2.4} />
      {label}
    </Link>
  )

  return (
    <div className="flex h-full min-h-[480px] flex-col gap-6">
      {/* Header */}
      <header className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h1 className="m-0 text-[32px] font-semibold leading-[1.15] tracking-[-0.03em]">
            Applications
          </h1>
          {applications.length > 0 && newApplicationButton("New application")}
        </div>
        {!loading && !error && (
          <p className="m-0 mt-2 text-[15px] text-body">
            {applications.length} total
            {applications.length > 0 && (
              <>
                {" · "}
                {staleCount > 0 ? (
                  <a
                    href="#board"
                    onClick={scrollToStale}
                    className="font-medium text-brand transition-colors hover:text-brand-dark"
                  >
                    {staleCount} gone quiet →
                  </a>
                ) : (
                  <span className="font-medium text-success">
                    All caught up — no stale applications
                  </span>
                )}
              </>
            )}
          </p>
        )}
        {moveError && (
          <p role="alert" className="m-0 mt-2 text-sm text-danger">
            {moveError}
          </p>
        )}
      </header>

      {/* Loading */}
      {loading && (
        <div className="scroll-thin flex min-h-0 flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-2.5">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="flex h-full flex-[0_0_280px] flex-col gap-2 rounded-card bg-surface-alt p-3"
            >
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-1 items-center justify-center py-16">
          <div className="text-sm text-danger">{error}</div>
        </div>
      )}

      {/* Empty state — zero applications total */}
      {!loading && !error && applications.length === 0 && (
        <div className="flex flex-1 items-center justify-center py-16">
          <EmptyState
            className="w-full max-w-md"
            title="No applications yet"
            description="Start tracking your job search — add your first application and never lose track of where you stand."
            action={
              <span className="flex flex-col items-center gap-3">
                <FileText size={22} className="text-brand" aria-hidden="true" />
                {newApplicationButton("Add first application")}
              </span>
            }
          />
        </div>
      )}

      {/* Board */}
      {showBoard && (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          accessibility={{ announcements, screenReaderInstructions }}
          autoScroll={{ threshold: { x: 0.12, y: 0.12 }, acceleration: 12 }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveApp(null)}
        >
          <div id="board" className="relative min-h-0 flex-1">
            <div
              ref={boardRef}
              onScroll={onBoardScroll}
              className="scroll-thin flex h-full gap-4 overflow-x-auto overflow-y-hidden pb-2.5"
            >
              {columns.map(({ status, items }) => (
                <BoardColumn
                  key={status}
                  status={status}
                  items={items}
                  now={now}
                  movingIds={movingIds}
                  draggingFrom={activeApp?.status ?? null}
                />
              ))}
            </div>
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute bottom-2.5 right-0 top-0 w-[72px] bg-gradient-to-r from-white/0 to-white transition-opacity duration-150",
                moreToRight && !activeApp ? "opacity-100" : "opacity-0"
              )}
            />
          </div>
          <DragOverlay dropAnimation={null}>
            {activeApp ? (
              <div
                style={{ width: activeWidth }}
                className="rotate-2 cursor-grabbing rounded-btn bg-surface p-3 shadow-[0_0_0_1px_var(--color-line),0_12px_28px_rgba(23,23,23,0.16)]"
              >
                <CardBody app={activeApp} now={now} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
