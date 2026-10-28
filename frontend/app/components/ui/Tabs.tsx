"use client"

import { cn } from "../../lib/cn"

/** Underline tabs. Controlled: parent owns the active value. */
export default function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn("flex gap-6 border-b border-line", className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "-mb-px py-2.5 text-sm font-medium border-b-2 transition-colors",
              active
                ? "border-brand-logo text-ink"
                : "border-transparent text-body hover:text-ink"
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
