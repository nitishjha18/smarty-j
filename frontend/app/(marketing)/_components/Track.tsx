import { Check } from "lucide-react"
import { cn } from "../../lib/cn"
import { PIPELINE_STAGES, STATUS_LABELS, STATUS_STYLES } from "../../lib/status"
import CompanyLogo from "../../components/CompanyLogo"
import { BOARD_COLUMNS, COMPANIES } from "./data"
import {
  Bullets,
  COL_L,
  COL_R,
  GRID12,
  H2,
  LEAD,
  MockColumn,
  SECTION,
  SectionEyebrow,
  WRAP,
} from "./primitives"

const HISTORY = [
  { from: "SCREENING", to: "INTERVIEW", when: "SEP 24, 2:30 PM" },
  { from: "APPLIED", to: "SCREENING", when: "SEP 16" },
  { from: null, to: "APPLIED", when: "SEP 9" },
] as const

const CURRENT = PIPELINE_STAGES.indexOf("INTERVIEW")

export default function Track() {
  return (
    <section id="product" className={cn(SECTION, "bg-surface")}>
      <div className={WRAP}>
        <div className={cn(GRID12, "items-start")}>
          <div className={COL_L}>
            <SectionEyebrow className="text-brand-dark">01 — TRACK</SectionEyebrow>
            <h2 className={H2}>
              Every application, <span className="text-brand">one board</span>.
            </h2>
          </div>
          <div className={COL_R}>
            <p className={cn(LEAD, "text-body")}>
              Add a role in seconds, paste the job description, and move it
              across Applied, Screening, Interview, Assignment, Offer or
              Rejected. Every move is timestamped, so you always know how long
              something has been sitting.
            </p>
            <Bullets
              className="mt-8"
              markerClass="bg-brand-logo"
              items={[
                "Six clear stages",
                "Full status history per application",
                "Stale applications flagged automatically after 14 days",
              ]}
            />
          </div>
        </div>
      </div>

        <div className="relative mx-auto mt-16 w-full max-w-[1800px] px-[clamp(16px,1.6vw,32px)] lg:mb-[150px] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-start">
          {BOARD_COLUMNS.map((col) => (
            <MockColumn key={col.status} column={col} large />
          ))}

          <div className="col-span-full mt-4 lg:mt-0 lg:absolute lg:right-4 lg:-bottom-[150px] lg:w-[420px] max-w-full bg-surface rounded-[14px] p-5 z-[5] shadow-[0_0_0_1px_rgba(23,23,23,0.07),0_12px_32px_rgba(23,23,23,0.14)]">
            <div className="flex items-center gap-3">
              <CompanyLogo domain={COMPANIES.airbnb.companyDomain} name="Airbnb" size={28} tone="APPLIED" />
              <div className="min-w-0">
                <div className="text-base font-semibold tracking-[-0.01em] leading-tight text-ink">
                  Airbnb
                </div>
                <div className="text-sm2 text-body leading-[1.35]">
                  {COMPANIES.airbnb.role}
                </div>
              </div>
            </div>

            <ol className="m-0 p-0 list-none mt-[22px] flex">
              {PIPELINE_STAGES.map((stage, i) => {
                const done = i < CURRENT
                const cur = i === CURRENT
                return (
                  <li
                    key={stage}
                    className="relative flex-1 min-w-0 flex flex-col items-center gap-2"
                  >
                    {i > 0 && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute top-[11px] -left-1/2 w-full h-0.5",
                          i - 1 < CURRENT
                            ? STATUS_STYLES[PIPELINE_STAGES[i - 1]].dot
                            : "bg-line-dashed"
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-[1] size-6 rounded-full flex items-center justify-center",
                        done || cur
                          ? STATUS_STYLES[stage].dot
                          : "bg-surface border-[1.5px] border-line-strong",
                        cur && "ring-4 ring-st-interview/20"
                      )}
                    >
                      {done && <Check size={13} strokeWidth={3} className="text-white" />}
                      {cur && <span className="size-2 rounded-full bg-white" />}
                    </span>
                    <span
                      className={cn(
                        "text-xs whitespace-nowrap",
                        cur ? "font-semibold text-ink" : "font-medium",
                        !done && !cur && "text-muted",
                        done && "text-ink"
                      )}
                    >
                      {STATUS_LABELS[stage]}
                    </span>
                  </li>
                )
              })}
            </ol>

            <div className="mt-5 pt-4 border-t border-line">
              <div className="font-mono text-mono tracking-[0.06em] text-muted">
                STATUS HISTORY
              </div>
              <div className="mt-3">
                {HISTORY.map((h, i) => (
                  <div key={h.to} className="relative flex gap-3 pb-3.5">
                    {i < HISTORY.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-[9.5px] top-6 bottom-0.5 w-px bg-line-dashed"
                      />
                    )}
                    <CompanyLogo
                      domain={COMPANIES.airbnb.companyDomain}
                      name="Airbnb"
                      size={20}
                      tone={h.to}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm leading-[22px] font-medium text-ink">
                        {h.from && (
                          <>
                            <span className="inline-flex items-center gap-1.5">
                              <span className={cn("size-2 rounded-[2px]", STATUS_STYLES[h.from].dot)} />
                              {STATUS_LABELS[h.from]}
                            </span>
                            <span className="text-muted">→</span>
                          </>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn("size-2 rounded-[2px]", STATUS_STYLES[h.to].dot)} />
                          {STATUS_LABELS[h.to]}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-mono text-muted">
                        {h.when}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
    </section>
  )
}
