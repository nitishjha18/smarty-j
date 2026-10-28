import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { buttonStyles } from "../../components/ui/Button"
import { HERO_COLUMNS } from "./data"
import { MockColumn } from "./primitives"

const ANNOTATION =
  "hero-ann hidden min-[1100px]:block absolute font-hand text-2xl font-semibold leading-[1.15] text-white whitespace-nowrap -translate-x-1/2"

export default function Hero() {
  return (
    <section
      id="top"
      className="bg-brand text-white flex items-center min-[1100px]:min-h-screen pt-32 pb-20 min-[1100px]:pt-[162px] min-[1100px]:pb-[108px]"
    >
      <div className="w-full max-w-[calc(1640px+2*clamp(24px,5vw,96px))] mx-auto px-[clamp(24px,5vw,96px)]">
        <div className="flex flex-col min-[1100px]:flex-row min-[1100px]:items-center min-[1100px]:justify-between gap-12 min-[1100px]:gap-24 w-full">
          <div className="min-w-0 min-[1100px]:flex-[0_1_580px] max-w-[580px]">
            <p className="m-0 font-mono text-sm2 font-medium tracking-eyebrow leading-[1.6]">
              FREE JOB APPLICATION TRACKER
            </p>
            <h1 className="m-0 mt-7 text-[clamp(44px,3.6vw,60px)] leading-[1.04] font-semibold tracking-[-0.035em] whitespace-nowrap">
              Stop{" "}
              <span className="relative inline-block">
                guessing
                <svg
                  aria-hidden="true"
                  viewBox="0 0 300 18"
                  preserveAspectRatio="none"
                  className="absolute left-[1%] -bottom-2 w-[98%] h-[18px]"
                >
                  <path
                    d="M3 9 C 22 3, 40 15, 62 8 S 104 3, 126 10 S 170 15, 196 7 S 252 3, 297 10"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <br />
              where you stand.
            </h1>
            <p className="m-0 mt-8 text-[19px] leading-[1.6] font-medium max-w-[520px] text-balance">
              You&apos;ve applied to forty companies across five websites.
              ApplynTrack shows which ones moved, which went quiet, and how
              well your resume fits each role.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
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
              <a
                href="#how"
                className="inline-flex items-center gap-2.5 text-[17px] font-medium hover:opacity-80 transition-opacity"
              >
                See how it works
                <ArrowRight size={18} strokeWidth={2.4} />
              </a>
            </div>
            <p className="m-0 mt-8 text-sm font-medium leading-[1.6] max-w-[520px]">
              No card needed. Works with Naukri, LinkedIn, Internshala,
              referrals and any career page. You add your own applications, so
              there is nothing to connect.
            </p>
          </div>

          <div className="relative min-w-0 w-full min-[1100px]:flex-1 min-[1100px]:max-w-[920px] min-[1100px]:pt-[110px]">
            <span
              className={ANNOTATION}
              style={{ top: 0, left: "calc(16px + (100% - 64px) / 6)" }}
            >
              27 days, no reply —
              <br />
              time to nudge
            </span>
            <svg
              aria-hidden="true"
              width="26"
              height="44"
              viewBox="0 0 26 44"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="hero-ann hidden min-[1100px]:block absolute"
              style={{ top: 62, left: "calc(16px + (100% - 64px) / 6 - 13px)" }}
            >
              <path d="M6 2 C 22 12, 0 26, 13 38" />
              <path d="M4 29 L13 40 L22 30" />
            </svg>
            <span
              className={ANNOTATION}
              style={{
                top: 28,
                left: "calc(16px + (100% - 64px) / 3 + 16px + (100% - 64px) / 6)",
              }}
            >
              click to update
            </span>
            <svg
              aria-hidden="true"
              width="26"
              height="40"
              viewBox="0 0 26 40"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="hero-ann hidden min-[1100px]:block absolute"
              style={{
                top: 66,
                left: "calc(16px + (100% - 64px) / 3 + 16px + (100% - 64px) / 6 - 13px)",
              }}
            >
              <path d="M8 2 C 0 12, 22 22, 12 34" />
              <path d="M3 26 L12 37 L21 27" />
            </svg>

            <div className="bg-surface text-ink rounded-modal overflow-hidden shadow-[0_0_0_1px_rgba(23,23,23,0.07),0_8px_24px_rgba(23,23,23,0.08),0_30px_60px_-30px_rgba(23,23,23,0.25)]">
              <div className="h-12 flex items-center gap-7 px-4 border-b border-line">
                <div className="flex gap-1.5">
                  <span className="size-[9px] rounded-full bg-line" />
                  <span className="size-[9px] rounded-full bg-line" />
                  <span className="size-[9px] rounded-full bg-brand-logo" />
                </div>
                <span className="ml-[22px] font-mono text-sm2 text-body truncate">
                  applyntrack.app/applications
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 items-stretch">
                {HERO_COLUMNS.map((col) => (
                  <MockColumn key={col.status} column={col} large />
                ))}
              </div>
            </div>

            <div className="hero-ann hidden min-[1100px]:inline-flex absolute -bottom-5 items-center gap-[11px] bg-surface rounded-full py-[9px] pr-[18px] pl-[9px] shadow-[0_0_0_1px_rgba(23,23,23,0.06),0_8px_24px_rgba(23,23,23,0.2)] whitespace-nowrap text-ink"
              style={{ left: "calc(16px + (100% - 64px) / 3 * 2 + 32px + 14px)" }}
            >
              <span className="size-6 rounded-ctl bg-brand-logo inline-flex items-center justify-center text-white">
                <Check size={14} strokeWidth={3} />
              </span>
              <span className="text-sm font-medium">Resume fit</span>
              <span className="text-[15px] font-semibold text-brand">
                82/100
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
