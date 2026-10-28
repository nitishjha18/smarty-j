import type { HTMLAttributes } from "react"
import { cn } from "../../lib/cn"

export default function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface border border-line rounded-card shadow-card",
        className
      )}
      {...props}
    />
  )
}
