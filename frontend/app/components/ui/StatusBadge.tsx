import type { ApplicationStatus } from "../../types"
import { cn } from "../../lib/cn"
import { STATUS_LABELS, STATUS_STYLES } from "../../lib/status"

/** Small colored square used in labels, history rows and the board header. */
export function StatusDot({
  status,
  className,
}: {
  status: ApplicationStatus
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 rounded-[2px] shrink-0",
        STATUS_STYLES[status].dot,
        className
      )}
    />
  )
}

/** Dot + label (design's "status label"). */
export function StatusLabel({
  status,
  className,
}: {
  status: ApplicationStatus
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <StatusDot status={status} />
      {STATUS_LABELS[status]}
    </span>
  )
}

/** Tinted pill, e.g. recent-activity rows and the detail header. */
export default function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus
  className?: string
}) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-6 px-2 rounded-chip text-xs font-semibold",
        s.tint,
        s.text,
        className
      )}
    >
      <StatusDot status={status} />
      {STATUS_LABELS[status]}
    </span>
  )
}
