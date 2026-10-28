import type { HTMLAttributes } from "react"
import { cn } from "../../lib/cn"

/** Mono, uppercase, wide-tracked label (section titles, field captions, meta). */
export default function Eyebrow({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "font-mono text-mono uppercase tracking-eyebrow text-muted m-0",
        className
      )}
      {...props}
    />
  )
}
