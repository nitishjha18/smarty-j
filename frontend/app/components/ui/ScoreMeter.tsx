/** Big score number plus a tag under it (AI resume fit). Pair with `ScoreBar`. */
export default function ScoreMeter({
  score,
  label,
  className,
}: {
  score: number
  label?: string
  className?: string
}) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-end gap-1">
        <span className="text-[64px] font-semibold leading-[0.9] tracking-[-0.04em] text-brand">
          {score}
        </span>
        <span className="font-mono text-sm text-muted">/100</span>
      </div>
      {label && (
        <p className="m-0 mt-1.5 text-right font-mono text-mono uppercase tracking-[0.06em] text-muted">
          {label}
        </p>
      )}
    </div>
  )
}

/** Thin full-width progress bar for the score. */
export function ScoreBar({ score, className }: { score: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, score))
  return (
    <div
      role="meter"
      aria-label="Resume fit score"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`h-1.5 overflow-hidden rounded-[3px] bg-brand-tint ${className ?? ""}`}
    >
      <div className="h-full rounded-[3px] bg-brand-logo" style={{ width: `${pct}%` }} />
    </div>
  )
}
