import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  TextareaHTMLAttributes,
} from "react"
import { cn } from "../../lib/cn"

const CONTROL =
  "block w-full bg-surface border border-line rounded-btn px-3 text-sm text-ink placeholder:text-faint transition-shadow focus:outline-none focus:border-brand focus:shadow-focus disabled:bg-surface-alt disabled:text-muted"

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-sm2 font-medium text-ink mb-2", className)}
      {...props}
    />
  )
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, "h-11", className)} {...props} />
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(CONTROL, "py-3 leading-normal resize-y", className)}
      {...props}
    />
  )
}

/** Helper line under a field. */
export function FieldHint({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1.5 text-xs text-muted", className)} {...props} />
}

/** Inline form error. */
export function FieldError({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      role="alert"
      className={cn("text-sm2 text-danger", className)}
      {...props}
    />
  )
}
