import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { buttonStyles } from "../../components/ui/Button"
import { cn } from "../../lib/cn"
import {
  Bullets,
  COL_L,
  COL_R,
  GRID12,
  H2,
  LEAD,
  SECTION,
  SectionEyebrow,
  WRAP,
} from "./primitives"

export default function FollowUp() {
  return (
    <section id="follow" className={cn(SECTION, "bg-surface lg:pb-36")}>
      <div className={WRAP}>
        <div className={cn(GRID12, "items-center")}>
          <div className={COL_L}>
            <SectionEyebrow className="text-brand-dark">
              03 — FOLLOW UP
            </SectionEyebrow>
            <h2 className={H2}>
              Never let an application{" "}
              <span className="text-brand">go quiet</span>.
            </h2>
            <p className={cn(LEAD, "mt-8 text-body max-w-[620px]")}>
              Set a reminder date on any application. On that morning, you get
              an email telling you exactly who to follow up with.
            </p>
            <Bullets
              className="mt-9"
              markerClass="bg-brand-logo"
              items={[
                "A reminder on every application",
                "Context included in the email",
                "No more searching through old tabs",
              ]}
            />
          </div>

          <div className={cn(COL_R, "relative")}>
            <div className="bg-surface rounded-modal overflow-hidden shadow-[0_0_0_1px_rgba(23,23,23,0.07),0_8px_24px_rgba(23,23,23,0.08)]">
              <div className="px-6 sm:px-8 py-[26px] border-b border-line grid grid-cols-[72px_minmax(0,1fr)] sm:grid-cols-[96px_minmax(0,1fr)] gap-y-4 items-baseline">
                <span className="font-mono text-xs text-muted">FROM</span>
                <span className="text-[17px] break-words">
                  reminders@applyntrack.online
                </span>
                <span className="font-mono text-xs text-muted">SUBJECT</span>
                <span className="text-[17px]">Time to follow up with Microsoft</span>
              </div>
              <div className="px-6 sm:px-8 pt-10 pb-[76px]">
                <p className="m-0 text-[19px] leading-[1.6] text-body">
                  Hi there, you applied for Associate Software Engineer at Microsoft 21
                  days ago. A short follow-up could move this forward.
                </p>
                <Link
                  href="/sign-in"
                  className={buttonStyles({
                    size: "none",
                    className: "mt-[26px] gap-3 px-[22px] py-3.5 text-base",
                  })}
                >
                  Open application <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <span className="absolute right-6 -bottom-[18px] bg-brand-tint border border-brand-border rounded-btn px-4 py-[9px] font-mono text-sm font-medium text-ink shadow-[0_8px_20px_-10px_rgba(242,90,29,0.45)]">
              Remind me · Oct 14
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
