import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { buttonStyles } from "../../components/ui/Button"
import { SECTION, SectionEyebrow, WRAP } from "./primitives"
import { cn } from "../../lib/cn"

export default function ClosingCta() {
  return (
    <section
      id="start"
      className={cn(SECTION, "bg-brand text-white overflow-hidden")}
    >
      <div className={WRAP}>
        <div className="relative">
          <span
            aria-hidden="true"
            className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 text-[clamp(200px,24vw,420px)] font-bold leading-[0.8] tracking-[-0.06em] text-white/[0.14] whitespace-nowrap select-none"
          >
            47
          </span>
          <div className="relative lg:max-w-[62%]">
            <SectionEyebrow className="text-sm2">EARLY ACCESS</SectionEyebrow>
            <h2 className="m-0 mt-7 text-[clamp(40px,5.2vw,88px)] leading-[1.04] font-semibold tracking-[-0.045em]">
              Your next application deserves better than{" "}
              <span className="relative inline-block whitespace-nowrap">
                row 47
                <svg
                  aria-hidden="true"
                  viewBox="0 0 300 18"
                  preserveAspectRatio="none"
                  className="absolute left-[2%] -bottom-2 w-[96%] h-5"
                >
                  <path
                    d="M2 12 C 60 4, 140 4, 200 8 S 280 12, 298 6"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              .
            </h2>
            <p className="m-0 mt-8 text-[19px] font-medium leading-[1.6] max-w-[620px]">
              Job tracking is free. Bring every application into one place and
              see what&apos;s actually moving.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-7">
              <Link
                href="/sign-in"
                className={buttonStyles({
                  variant: "white",
                  size: "lg",
                  className: "font-bold shadow-hero-cta",
                })}
              >
                Start tracking — it&apos;s free
                <ArrowRight size={18} strokeWidth={2.4} />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2.5 text-[17px] font-semibold hover:opacity-80 transition-opacity"
              >
                Sign in <ArrowRight size={18} strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
