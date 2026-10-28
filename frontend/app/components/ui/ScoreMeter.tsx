import { cn } from "../../lib/cn"

/** Big score number plus a thin progress bar (AI resume fit). */
export default function ScoreMeter({
  score,
  label,
  className,
}: {
  score: number
  label?: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, score))
  return (
    <div className={className}>
      <div className="flex items-baseline justify-end gap-1">
        <span className="text-[56px] leading-none font-semibold tracking-tight text-brand">
          {score}
        </span>
        <span className="font-mono text-sm text-muted">/100</span>
      </div>
      {label && (
        <p className="m-0 text-right font-mono text-mono uppercase tracking-eyebrow text-muted">
          {label}
        </p>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("mt-4 h-1.5 w-full rounded-full bg-brand-tint")}
      >
        <div
          className="h-full rounded-full bg-brand-logo"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
