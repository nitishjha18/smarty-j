import type { ButtonHTMLAttributes } from "react"
import { cn } from "../../lib/cn"

type Variant = "primary" | "outline" | "ghost" | "white" | "danger"
type Size = "sm" | "md" | "lg"

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-hover active:bg-brand-active shadow-cta disabled:bg-brand-tint disabled:text-white disabled:shadow-none",
  outline:
    "bg-surface text-ink border border-line hover:border-line-strong disabled:text-faint disabled:hover:border-line",
  ghost: "bg-transparent text-body hover:bg-surface-hover hover:text-ink",
  white:
    "bg-white text-brand hover:bg-brand-tint-bg font-bold shadow-hero-cta",
  danger:
    "bg-danger text-white hover:opacity-90 disabled:opacity-50",
}

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-ctl gap-1.5",
  md: "h-10 px-4 text-sm rounded-btn gap-2",
  lg: "h-[52px] px-7 text-[17px] rounded-btn gap-3",
}

/** Class string for buttons, so `<Link>` can look like a button too. */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant
  size?: Size
  className?: string
} = {}) {
  return cn(
    "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    className
  )
}

export default function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  )
}
