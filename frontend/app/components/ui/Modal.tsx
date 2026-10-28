"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { cn } from "../../lib/cn"

const WIDTHS = {
  sm: "max-w-[440px]",
  md: "max-w-[600px]",
  lg: "max-w-[900px]",
}

/**
 * Centered dialog over a dimmed backdrop. Closes on Esc and backdrop click.
 * Used for dialogs and for pages presented as modals (detail, new application).
 */
export default function Modal({
  onClose,
  size = "md",
  label,
  showClose = true,
  className,
  children,
}: {
  onClose: () => void
  size?: keyof typeof WIDTHS
  label: string
  showClose?: boolean
  className?: string
  children: React.ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    panelRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-ink/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "relative w-full bg-surface rounded-modal shadow-modal focus:outline-none my-auto",
          WIDTHS[size],
          className
        )}
      >
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 size-8 inline-flex items-center justify-center rounded-ctl text-body hover:bg-surface-hover hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
