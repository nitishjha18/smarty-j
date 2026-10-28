// components/Sidebar.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import {
  LayoutDashboard,
  BriefcaseBusiness,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import BrandLogo from "./BrandLogo"
import Avatar from "./ui/Avatar"
import { cn } from "../lib/cn"

const navLinks = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Applications",
    href: "/applications",
    icon: BriefcaseBusiness,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut } = useClerk()
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.fullName ||
    "User"
  const email = user?.primaryEmailAddress?.emailAddress

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {navLinks.map((link) => {
        const Icon = link.icon
        const isActive =
          pathname === link.href || pathname.startsWith(`${link.href}/`)

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={closeMenu}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 px-3 text-sm transition-colors",
              isActive
                ? "h-10 rounded-btn bg-brand text-white font-semibold shadow-cta hover:bg-brand-hover"
                : "h-9 rounded-ctl text-body font-medium hover:bg-brand/[0.07] hover:text-ink"
            )}
          >
            <Icon size={18} strokeWidth={1.8} />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )

  const userBlock = (
    <div className="mt-auto border-t border-line pt-4 px-1 flex items-center gap-2.5 min-w-0">
      <Avatar name={displayName} src={user?.imageUrl} size={32} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink truncate">
          {displayName}
        </div>
        {email && (
          <div className="text-xs text-muted truncate">{email}</div>
        )}
      </div>
      <button
        type="button"
        aria-label="Sign out"
        onClick={() => {
          queryClient.clear()
          signOut({ redirectUrl: "/sign-in" })
        }}
        className="shrink-0 size-8 inline-flex items-center justify-center rounded-ctl text-muted hover:bg-brand-tint-bg hover:text-danger transition-colors"
      >
        <LogOut size={16} />
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 h-screen flex-col gap-5 overflow-y-auto bg-sidebar border-r border-line px-4 pt-5 pb-4">
        <BrandLogo href="/dashboard" className="px-1 py-0.5" />
        {nav}
        {userBlock}
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden flex h-14 shrink-0 items-center justify-between bg-sidebar border-b border-line px-4">
        <BrandLogo href="/dashboard" onClick={closeMenu} />
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="size-9 inline-flex items-center justify-center rounded-ctl text-ink hover:bg-brand/[0.07] transition-colors"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-14 bottom-0 z-40 flex">
          <div className="flex w-full max-w-xs flex-col gap-5 overflow-y-auto bg-sidebar border-r border-line px-4 pt-5 pb-4 shadow-pop">
            {nav}
            {userBlock}
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="flex-1 bg-ink/40"
          />
        </div>
      )}
    </>
  )
}
