import { cn } from "../../lib/cn"

export default function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center rounded-card border border-dashed border-line-dashed bg-surface-alt px-6 py-10",
        className
      )}
    >
      <p className="m-0 text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 mb-0 text-sm2 text-muted max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
