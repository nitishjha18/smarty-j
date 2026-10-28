import { cn } from "../../lib/cn"
import { COL_R, GRID12, LEAD, SECTION, WRAP } from "./primitives"

const STEPS = [
  {
    n: "01",
    title: "Add your applications",
    body: "From Naukri, LinkedIn, Internshala, referrals or anywhere else. Paste the job description too.",
  },
  {
    n: "02",
    title: "Upload your resume once",
    body: "We reuse it to check your fit for every role you add.",
  },
  {
    n: "03",
    title: "Move cards, get nudged",
    body: "Update a card's status as things change. We'll flag what's gone quiet and remind you to follow up.",
  },
]

export default function Steps() {
  return (
    <section id="how" className={cn(SECTION, "bg-peach")}>
      <div className={WRAP}>
        <div className={cn(GRID12, "items-end")}>
          <h2 className="m-0 lg:col-span-6 text-[clamp(40px,4.6vw,76px)] leading-[1.06] font-semibold tracking-tight-display">
            Set up in <span className="text-brand-accent">three steps</span>.
          </h2>
          <p className={cn(LEAD, COL_R, "text-ink-soft max-w-[560px]")}>
            Add your first application in under a minute. Nothing to connect,
            nothing to install.
          </p>
        </div>
        <div className={cn(GRID12, "mt-[72px] gap-y-0")}>
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className={cn(
                "lg:col-span-4 min-w-0",
                i > 0 &&
                  "pt-7 mt-7 border-t border-ink/10 lg:border-t-0 lg:pt-0 lg:mt-0 lg:border-l lg:pl-4 lg:-ml-4"
              )}
            >
              <p className="m-0 font-mono text-lg font-medium text-brand-darker">
                {s.n}
              </p>
              <h3 className="m-0 mt-8 text-[28px] font-semibold tracking-[-0.015em]">
                {s.title}
              </h3>
              <p className="m-0 mt-[18px] text-lg leading-[1.65] text-ink-soft">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
