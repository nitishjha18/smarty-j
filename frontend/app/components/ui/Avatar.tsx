import { cn } from "../../lib/cn"

/** Round initials avatar; pass `src` to show a photo instead. */
export default function Avatar({
  name,
  src,
  size = 32,
  className,
}: {
  name: string
  src?: string | null
  size?: number
  className?: string
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover shrink-0", className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-brand-logo text-white font-semibold shrink-0",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.375) }}
    >
      {initials}
    </span>
  )
}
