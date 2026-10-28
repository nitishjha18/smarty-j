"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import BrandLogo from "../../components/BrandLogo"
import { buttonStyles } from "../../components/ui/Button"
import { cn } from "../../lib/cn"

/** Transparent over the orange hero, white with blur once scrolled. */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const link = cn(
    "transition-colors",
    scrolled ? "text-ink hover:text-brand" : "text-white hover:opacity-80"
  )

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-[72px] border-b transition-colors",
        scrolled
          ? "bg-white/90 backdrop-blur-md border-line"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="h-full flex items-center justify-between gap-6 px-[clamp(24px,3vw,56px)]">
        <div className="flex items-center gap-8">
          <BrandLogo href="#top" size="lg" onDark={!scrolled} />
          <nav className="hidden md:flex gap-8 text-base font-medium">
            <a href="#product" className={link}>
              Product
            </a>
            <a href="#how" className={link}>
              How it works
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4 sm:gap-7 text-base font-medium">
          <Link href="/sign-in" className={link}>
            Sign in
          </Link>
          <Link
            href="/sign-in"
            className={buttonStyles({
              variant: scrolled ? "primary" : "white",
              size: "none",
              className: "px-[22px] py-3 text-base font-semibold",
            })}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}
