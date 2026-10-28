import { Check } from "lucide-react"
import type { ApplicationStatus } from "../../types"
import { cn } from "../../lib/cn"
import { PIPELINE_STAGES, STATUS_LABELS, STATUS_STYLES } from "../../lib/status"

/**
 * Stage progress for the detail page: done stages filled with a check,
 * the current stage filled with a ring, later stages outlined.
 * Presentational only; pass `onSelect` to make stages clickable.
 */
export default function Stepper({
  current,
  onSelect,
  disabled,
}: {
  current: ApplicationStatus
  onSelect?: (status: ApplicationStatus) => void
  disabled?: boolean
}) {
  const currentIndex = PIPELINE_STAGES.indexOf(current)

  return (
    <ol className="flex items-start">
      {PIPELINE_STAGES.map((stage, i) => {
        const done = i < currentIndex
        const isCurrent = i === currentIndex
        const s = STATUS_STYLES[stage]
        return (
          <li key={stage} className="relative flex-1 flex flex-col items-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2",
                  i <= currentIndex
                    ? STATUS_STYLES[PIPELINE_STAGES[i - 1]].dot
                    : "bg-line-dashed"
                )}
              />
            )}
            <button
              type="button"
              disabled={disabled || !onSelect}
              onClick={() => onSelect?.(stage)}
              aria-current={isCurrent ? "step" : undefined}
              className="relative flex flex-col items-center gap-2 disabled:cursor-default"
            >
              <span
                className={cn(
                  "size-8 rounded-full inline-flex items-center justify-center text-xs font-semibold",
                  done || isCurrent
                    ? cn(s.dot, "text-white")
                    : "bg-surface border-[1.5px] border-line-strong text-muted",
                  isCurrent && "ring-4 ring-brand-tint"
                )}
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-xs",
                  isCurrent ? "font-semibold text-ink" : "font-medium text-muted"
                )}
              >
                {STATUS_LABELS[stage]}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
