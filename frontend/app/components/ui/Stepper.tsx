import { Check, X } from "lucide-react"
import type { ApplicationStatus } from "../../types"
import { cn } from "../../lib/cn"
import { PIPELINE_STAGES, STATUS_LABELS, STATUS_STYLES } from "../../lib/status"

/**
 * Stage progress for the detail page: done stages filled with a check,
 * the current stage filled with a ring, later stages outlined.
 * For a rejected application pass `rejectedAt` (index into PIPELINE_STAGES of
 * the last stage reached): that stage shows red with a cross, later ones stay empty.
 * Pass `onSelect` to make stages clickable.
 */
export default function Stepper({
  current,
  rejectedAt,
  onSelect,
  disabled,
}: {
  current: ApplicationStatus
  rejectedAt?: number
  onSelect?: (status: ApplicationStatus) => void
  disabled?: boolean
}) {
  const isRejected = rejectedAt !== undefined
  const currentIndex = isRejected ? -1 : PIPELINE_STAGES.indexOf(current)
  const reachedIndex = isRejected ? rejectedAt : currentIndex

  return (
    <ol className="m-0 mt-1.5 grid list-none grid-cols-5 p-0">
      {PIPELINE_STAGES.map((stage, i) => {
        const done = i < reachedIndex
        const isCurrent = i === currentIndex
        const rejectedHere = isRejected && i === rejectedAt
        const filled = done || isCurrent
        return (
          <li key={stage} className="relative flex justify-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[calc(-50%+14px)] top-[13px] h-0.5 w-[calc(100%-28px)]",
                  i <= reachedIndex
                    ? isRejected
                      ? "bg-line-strong"
                      : STATUS_STYLES[PIPELINE_STAGES[i - 1]].dot
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
                  "inline-flex size-7 items-center justify-center rounded-full border-[1.5px] text-xs font-semibold leading-none",
                  rejectedHere
                    ? "border-st-rejected bg-st-rejected text-white"
                    : filled
                      ? cn(STATUS_STYLES[stage].dot, STATUS_STYLES[stage].border, "text-white")
                      : "border-line-strong bg-surface text-muted",
                  isCurrent && "ring-4 ring-brand-tint"
                )}
              >
                {rejectedHere ? (
                  <X size={14} strokeWidth={3} />
                ) : done ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "text-xs",
                  isCurrent || rejectedHere
                    ? "font-semibold text-ink"
                    : "font-medium text-muted"
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
