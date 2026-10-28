import CompanyLogo from "../../components/CompanyLogo"
import { cn } from "../../lib/cn"
import { STATUS_LABELS, STATUS_STYLES } from "../../lib/status"
import type { ApplicationStatus } from "../../types"
import { COMPANIES, type BoardColumnData } from "./data"

export const WRAP =
  "w-full max-w-[1400px] mx-auto px-[clamp(24px,4vw,64px)]"
export const H2 =
  "m-0 mt-7 text-[clamp(40px,4.6vw,76px)] leading-[1.06] font-semibold tracking-tight-display"
export const LEAD = "m-0 text-[20px] leading-[1.6]"
export const SECTION = "lg:min-h-screen flex flex-col justify-center py-28"
export const GRID12 = "grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-10"
export const COL_L = "lg:col-span-6 min-w-0"
export const COL_R = "lg:col-span-6 min-w-0"

export function SectionEyebrow({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <p
      className={cn(
        "m-0 font-mono text-sm font-medium tracking-eyebrow",
        className
      )}
    >
      {children}
    </p>
  )
}

/** Bullet list with square markers. */
export function Bullets({
  items,
  markerClass,
  className,
}: {
  items: string[]
  markerClass: string
  className?: string
}) {
  return (
    <ul
      className={cn(
        "m-0 p-0 list-none flex flex-col gap-[18px] text-[18px] text-ink",
        className
      )}
    >
      {items.map((item) => (
        <li key={item} className="flex items-center gap-4">
          <span className={cn("size-2.5 rounded-[2px] shrink-0", markerClass)} />
          {item}
        </li>
      ))}
    </ul>
  )
}

/** Mockup application card (landing illustrations only). */
export function MockCard({
  id,
  status,
  large = false,
  showQuiet = true,
  faded = false,
  lifted = false,
}: {
  id: string
  status: ApplicationStatus
  large?: boolean
  showQuiet?: boolean
  faded?: boolean
  lifted?: boolean
}) {
  const c = COMPANIES[id]
  const stale = showQuiet && status === "APPLIED" && !!c.quiet
  return (
    <div
      className={cn(
        "bg-surface rounded-btn",
        large ? "p-3.5" : "p-3",
        lifted
          ? "shadow-[0_0_0_1px_rgba(23,23,23,0.07),0_14px_30px_rgba(23,23,23,0.2)]"
          : "shadow-[0_0_0_1px_rgba(23,23,23,0.07),0_1px_2px_rgba(23,23,23,0.04)]",
        faded && "opacity-70"
      )}
    >
      {stale && (
        <div className="mb-2 font-mono text-[11px] leading-tight tracking-[0.06em] text-brand">
          QUIET {c.quiet} DAYS
        </div>
      )}
      <div className="flex items-start gap-2.5">
        <CompanyLogo domain={c.companyDomain} name={c.name} size={28} tone={status} />
        <div className="min-w-0">
          <div
            className={cn(
              "font-semibold tracking-[-0.01em] leading-[1.3] text-ink",
              large ? "text-[15px]" : "text-sm"
            )}
          >
            {c.name}
          </div>
          <div
            className={cn(
              "mt-0.5 text-body leading-[1.35]",
              large ? "text-sm" : "text-sm2"
            )}
          >
            {c.role}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex font-mono text-[11px] leading-[1.3] tracking-[0.06em] text-muted uppercase whitespace-nowrap">
        <span className="min-w-0 truncate">{c.source}</span>
        <span className="shrink-0">&nbsp;·&nbsp;{c.date}</span>
      </div>
    </div>
  )
}

/** One status column of the mockup board. */
export function MockColumn({
  column,
  large = false,
}: {
  column: BoardColumnData
  large?: boolean
}) {
  const { status, ids, lifted } = column
  const rejected = status === "REJECTED"
  return (
    <div className="min-w-0 flex flex-col rounded-card bg-surface-alt p-2">
      <div className="px-2 pt-3">
        <div className="flex items-baseline justify-center gap-2">
          <span
            className={cn(
              "font-semibold tracking-[-0.02em] text-ink whitespace-nowrap",
              large ? "text-[19px]" : "text-[17px]"
            )}
          >
            {STATUS_LABELS[status]}
          </span>
          <span
            className={cn(
              "font-semibold text-body tabular-nums",
              large ? "text-[15px]" : "text-sm"
            )}
          >
            {ids.length + (lifted ? 1 : 0)}
          </span>
        </div>
        <div
          className={cn(
            "mt-3.5 mb-3 h-1 rounded-[2px]",
            STATUS_STYLES[status].dot,
            rejected && "opacity-60"
          )}
        />
      </div>
      <div className="flex flex-col gap-2">
        {lifted && (
          <div className="relative h-[108px] rounded-btn border-[1.5px] border-dashed border-line-strong">
            <div className="absolute -top-1.5 left-0 z-[3] w-full translate-x-3.5 rotate-2">
              <MockCard id={lifted} status={status} large lifted />
            </div>
          </div>
        )}
        {ids.map((id) => (
          <MockCard
            key={id}
            id={id}
            status={status}
            large={large}
            faded={rejected}
          />
        ))}
      </div>
    </div>
  )
}
