import type { ButtonHTMLAttributes } from "react"
import { cn } from "../../lib/cn"

/** Toggle chip: source picker, quick-date picker. */
export default function Chip({
  selected = false,
  compact = false,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; compact?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "px-3 rounded-ctl border text-sm2 font-medium transition-colors",
        compact ? "py-1.5" : "py-[7px]",
        selected
          ? "border-brand bg-brand-tint-bg text-brand"
          : "border-line bg-surface text-ink hover:border-line-strong",
        className
      )}
      {...props}
    />
  )
}

/** Static tag (missing keywords, etc.). */
export function Tag({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-[5px] rounded-chip bg-brand-tint text-brand-dark text-sm2 font-medium",
        className
      )}
      {...props}
    />
  )
}
