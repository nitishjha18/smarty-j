import Link from "next/link"
import BrandLogo from "../../components/BrandLogo"
import { WRAP } from "./primitives"

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-line">
      <div
        className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-8`}
      >
        <BrandLogo href="#top" />
        <nav className="flex gap-6 text-sm text-body">
          <a href="#product" className="hover:text-brand transition-colors">
            Product
          </a>
          <a href="#how" className="hover:text-brand transition-colors">
            How it works
          </a>
          <Link href="/sign-in" className="hover:text-brand transition-colors">
            Sign in
          </Link>
        </nav>
        <p className="m-0 font-mono text-mono tracking-[0.06em] text-muted">
          © {new Date().getFullYear()} APPLYNTRACK
        </p>
      </div>
    </footer>
  )
}
