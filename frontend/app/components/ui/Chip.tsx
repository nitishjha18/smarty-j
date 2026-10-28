import type { ButtonHTMLAttributes } from "react"
import { cn } from "../../lib/cn"

/** Toggle chip: source picker, quick-date picker. */
export default function Chip({
  selected = false,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "h-8 px-3 rounded-ctl border text-sm2 font-medium transition-colors",
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
        "inline-flex items-center h-7 px-2.5 rounded-chip bg-brand-tint text-brand-dark text-xs font-medium",
        className
      )}
      {...props}
    />
  )
}
