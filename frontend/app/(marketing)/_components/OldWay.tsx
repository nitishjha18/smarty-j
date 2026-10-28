import { Bell } from "lucide-react"
import { cn } from "../../lib/cn"
import { STATUS_LABELS, STATUS_STYLES } from "../../lib/status"
import CompanyLogo from "../../components/CompanyLogo"
import { COMPANIES, STRIP } from "./data"
import {
  COL_L,
  COL_R,
  GRID12,
  LEAD,
  SECTION,
  SectionEyebrow,
  WRAP,
} from "./primitives"

const ROWS: { cells: string[]; statusClass?: string }[] = [
  { cells: ["1", "Google", "SDE", "Naukri", "??", "follow up??"], statusClass: "bg-st-screening-tint" },
  { cells: ["2", "Stripe", "PE", "LinkedIn", "applied i…", ""], statusClass: "text-danger font-bold" },
  { cells: ["3", "Microsoft", "FE II", "website", "", "no reply"] },
  { cells: ["4", "Notion", "PE", "referral (…", "call on mo…", ""], statusClass: "bg-st-screening-tint" },
  { cells: ["5", "Airbnb", "FE", "LinkedIn", "interview!…", "prep"], statusClass: "bg-success-soft" },
]

const QUIET = [
  { days: "28", id: "google" },
  { days: "22", id: "microsoft" },
].map(({ days, id }) => ({ days, ...COMPANIES[id] }))

const CELL = "px-2.5 py-3 border border-line truncate"

export default function OldWay() {
  return (
    <section className={cn(SECTION, "bg-peach")}>
      <div className={WRAP}>
        <SectionEyebrow className="text-brand-darker">THE OLD WAY</SectionEyebrow>
        <div className={cn(GRID12, "mt-7 items-end")}>
          <h2 className="m-0 lg:col-span-6 text-[clamp(40px,4.6vw,76px)] leading-[1.05] font-semibold tracking-tight-display">
            From <span className="text-brand-accent">this</span>… to{" "}
            <span className="text-brand-accent">this</span>.
          </h2>
          <p className={cn(LEAD, "lg:col-span-6 text-ink-soft max-w-[560px]")}>
            Most job searches live in a spreadsheet that stopped being updated
            in week two.
          </p>
        </div>

        <div className={cn(GRID12, "relative mt-[72px] items-stretch")}>
          <div
            aria-hidden="true"
            className="hidden lg:flex absolute left-1/2 -top-[58px] -translate-x-1/2 items-end gap-1.5 z-[2]"
          >
            <span className="font-hand text-[28px] font-semibold leading-none text-brand-darker -rotate-[4deg] whitespace-nowrap">
              much better
            </span>
            <svg width="34" height="26" viewBox="0 0 34 26" fill="none" stroke="#A8340A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4 C 14 2, 24 8, 30 20" />
              <path d="M22 18 L30 21 L31 12" />
            </svg>
          </div>

          {/* spreadsheet */}
          <div
            className={cn(
              COL_L,
              "flex flex-col bg-surface rounded-modal overflow-hidden shadow-[0_0_0_1px_rgba(23,23,23,0.07),0_8px_24px_rgba(23,23,23,0.08)]"
            )}
          >
            <div className="flex items-center justify-between px-[22px] py-[18px] border-b border-line font-mono">
              <span className="flex items-center gap-2.5 text-[15px]">
                <span className="size-[11px] rounded-full bg-success" />
                job applications
              </span>
              <span className="text-sm2 text-muted">updated manually</span>
            </div>
            <div className="flex-1 overflow-x-auto px-[22px] pt-3.5">
              <table className="w-full min-w-[420px] table-fixed border-collapse font-mono text-sm2 text-ink">
                <colgroup>
                  <col style={{ width: 30 }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "22%" }} />
                  <col />
                </colgroup>
                <thead>
                  <tr className="text-muted">
                    <th className="border-b border-line py-2" />
                    {["A", "B", "C", "D", "E"].map((h) => (
                      <th key={h} className="p-2 font-normal border border-line border-t-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-medium">
                    <td className="py-3 text-center border-b border-line text-muted">#</td>
                    {["Company", "Role", "Site", "Status", "Notes"].map((h) => (
                      <td key={h} className={CELL}>
                        {h}
                      </td>
                    ))}
                  </tr>
                  {ROWS.map((row) => (
                    <tr key={row.cells[0]}>
                      <td className="py-3 text-center border-b border-line text-muted">
                        {row.cells[0]}
                      </td>
                      {row.cells.slice(1).map((cell, i) => (
                        <td
                          key={i}
                          className={cn(CELL, i === 3 && row.statusClass)}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="py-3 text-center text-muted">6</td>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <td key={i} className="px-2.5 py-3 border border-line border-b-0">
                        &#8203;
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* dashboard */}
          <div
            className={cn(
              COL_R,
              "flex flex-col bg-surface rounded-modal overflow-hidden shadow-[0_0_0_1px_rgba(23,23,23,0.07),0_8px_24px_rgba(23,23,23,0.08)]"
            )}
          >
            <div className="grid grid-cols-5 border-b border-line">
              {STRIP.map((p, i) => (
                <div
                  key={p.status}
                  className={cn(
                    "min-w-0 px-3.5 pt-5",
                    i < 4 && "border-r border-line"
                  )}
                >
                  <div className="text-[32px] font-semibold leading-none tabular-nums">
                    {p.n}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 font-mono text-micro tracking-[0.04em] text-body whitespace-nowrap overflow-hidden">
                    <span
                      className={cn(
                        "size-[7px] rounded-full shrink-0",
                        STATUS_STYLES[p.status].dot
                      )}
                    />
                    {STATUS_LABELS[p.status].toUpperCase()}
                  </div>
                  <div
                    aria-hidden="true"
                    className={cn("-mx-3.5 mt-[18px] h-1", STATUS_STYLES[p.status].dot)}
                  />
                </div>
              ))}
            </div>
            <div className="flex-1 px-[22px] pt-[22px] pb-2">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold">Gone quiet</span>
                <span className="font-mono text-mono tracking-[0.06em] text-muted">
                  2 APPS
                </span>
              </div>
              <div className="mt-1 mb-1.5 text-sm2 text-muted">
                No reply after 14 days
              </div>
              {QUIET.map((q, i) => (
                <div
                  key={q.name}
                  className={cn(
                    "grid grid-cols-[72px_minmax(0,1fr)_auto] gap-x-3.5 items-center py-[18px] border-t border-dashed",
                    i === 0 ? "border-transparent" : "border-line-dashed"
                  )}
                >
                  <div>
                    <div className="text-[34px] font-semibold tracking-tight-display leading-none text-brand">
                      {q.days}
                    </div>
                    <div className="mt-1 font-mono text-micro tracking-[0.06em] text-muted">
                      DAYS
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CompanyLogo domain={q.companyDomain} name={q.name} size={24} tone="APPLIED" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{q.name}</div>
                      <div className="text-sm2 text-body truncate">{q.role}</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 bg-surface border border-line rounded-ctl px-2.5 py-1.5 text-sm2 font-medium whitespace-nowrap">
                    <Bell size={13} />
                    Remind me
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
