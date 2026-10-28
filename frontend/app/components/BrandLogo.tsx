import Link from "next/link"
import { Check } from "lucide-react"
import { cn } from "../lib/cn"

/** Orange check tile + wordmark. `onDark` flips the tile for the orange hero. */
export default function BrandLogo({
  href = "/",
  size = "md",
  onDark = false,
  className,
  onClick,
}: {
  href?: string
  size?: "md" | "lg"
  onDark?: boolean
  className?: string
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex items-center font-semibold tracking-[-0.02em] transition-colors",
        size === "lg" ? "gap-3 text-[22px]" : "gap-2.5 text-[17px]",
        onDark ? "text-white" : "text-ink",
        className
      )}
    >
      <span
        className={cn(
          "size-8 rounded-ctl inline-flex items-center justify-center shrink-0 transition-colors",
          onDark ? "bg-white text-brand" : "bg-brand-logo text-white"
        )}
      >
        <Check size={18} strokeWidth={3} aria-hidden="true" />
      </span>
      ApplynTrack
    </Link>
  )
}
