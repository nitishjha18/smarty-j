import { ArrowRight, Check, Flag } from "lucide-react"
import { cn } from "../../lib/cn"
import { Tag } from "../../components/ui/Chip"
import { Bullets, H2, LEAD, SECTION, SectionEyebrow, WRAP } from "./primitives"

const LABEL = "m-0 font-mono text-mono tracking-[0.06em] text-muted"
const BLOCK = "mt-5 pt-5 border-t border-line"

export default function AiFit() {
  return (
    <section className={cn(SECTION, "bg-peach")}>
      <div className={WRAP}>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-[clamp(32px,5vw,80px)] items-center">
          <div className="min-w-0 bg-surface rounded-modal p-8 shadow-[0_0_0_1px_rgba(23,23,23,0.07),0_8px_24px_rgba(23,23,23,0.08)]">
            <p className={LABEL}>RESUME FIT</p>
            <div className="mt-2.5 flex items-start justify-between gap-5">
              <p className="m-0 text-lg tracking-[-0.01em] leading-[1.35]">
                <b className="font-semibold">Google</b>{" "}
                <span className="text-body">— Senior Frontend Engineer</span>
              </p>
              <div className="shrink-0 text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-[64px] font-semibold leading-[0.9] tracking-[-0.05em] text-brand">
                    82
                  </span>
                  <span className="font-mono text-sm text-muted">/100</span>
                </div>
                <div className={cn(LABEL, "mt-1.5")}>GOOD</div>
              </div>
            </div>
            <div className="mt-5 h-1.5 rounded-[3px] bg-brand-tint overflow-hidden">
              <div className="h-full w-[82%] rounded-[3px] bg-brand-logo" />
            </div>
            <div className="mt-3.5 flex items-center justify-between gap-3">
              <span className={LABEL}>ANALYZED SEP 21, 2026</span>
              <span className="inline-flex items-center bg-surface border border-line rounded-ctl px-3 py-1.5 text-sm2 font-medium">
                Re-analyze
              </span>
            </div>
            <p className="m-0 mt-[18px] text-[15px] leading-[1.6] text-body">
              Strong overall match. Your React and TypeScript experience aligns
              well with the role. Focus on highlighting performance
              optimization work.
            </p>

            <div className={BLOCK}>
              <p className={LABEL}>MISSING KEYWORDS</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Web Components",
                  "Search infrastructure",
                  "A/B testing",
                  "Internationalization (i18n)",
                ].map((k) => (
                  <Tag key={k} className="h-auto py-[5px] px-2.5 text-sm2">
                    {k}
                  </Tag>
                ))}
              </div>
            </div>

            <div className={BLOCK}>
              <p className={LABEL}>STRONGEST POINTS</p>
              <ul className="m-0 mt-3 p-0 list-none flex flex-col gap-2.5 text-sm">
                {[
                  "5+ years of React and TypeScript experience",
                  "Experience with SSR and modern build tooling",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <Check size={16} className="mt-0.5 shrink-0 text-success" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className={BLOCK}>
              <p className={LABEL}>RED FLAGS</p>
              <ul className="m-0 mt-3 p-0 list-none flex flex-col gap-2.5 text-sm">
                {[
                  "No explicit experience with Web Components mentioned",
                  "Limited mention of cross-team collaboration at scale",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <Flag size={16} className="mt-0.5 shrink-0 text-danger" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className={BLOCK}>
              <p className={LABEL}>RECRUITER TAKE</p>
              <blockquote className="m-0 mt-3 py-0.5 pl-3.5 border-l-[3px] border-brand-logo text-base font-medium leading-normal">
                This candidate looks like a solid fit on paper. The main gap is
                specific experience with large-scale search UI, but the
                frontend fundamentals are strong enough to warrant a screening
                call.
              </blockquote>
            </div>

            <span className="mt-[22px] inline-flex items-center gap-2 text-sm font-semibold text-brand-dark">
              Copy improvement prompt <ArrowRight size={16} />
            </span>
          </div>

          <div className="min-w-0">
            <SectionEyebrow className="text-brand-darker">
              02 — AI RESUME FIT
            </SectionEyebrow>
            <h2 className={H2}>
              See your resume the way a{" "}
              <span className="text-brand-accent">recruiter</span> does.
            </h2>
            <p className={cn(LEAD, "mt-8 text-ink-soft max-w-[680px]")}>
              Upload your resume once. For any application, get a match score,
              the keywords you&apos;re missing, your strongest points and the
              red flags a recruiter might notice.
            </p>
            <Bullets
              className="mt-9"
              markerClass="bg-brand-accent"
              items={[
                "Match score for every role",
                "Missing keywords called out clearly",
                "A recruiter's read on your fit",
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
