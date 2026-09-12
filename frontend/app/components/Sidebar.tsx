// components/Sidebar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import { LayoutDashboard, BriefcaseBusiness, User, LogOut } from "lucide-react"

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

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.firstName?.[0] ?? "U"

  const targetRole = user?.publicMetadata?.targetRole as string | undefined

  return (
    <aside className="w-[220px] h-screen flex flex-col bg-white border-r border-[#E5E7EB]">

      {/* Logo block */}
      <div className="px-[18px] pt-[20px] pb-[17px] border-b border-[#F0F1F4]">
        <span className="text-[16px] font-extrabold tracking-[-0.4px] text-[#111827]">Applyn</span>
        <span className="text-[16px] font-extrabold tracking-[-0.4px] text-[#FC8019]">Track</span>
      </div>

      {/* Nav section */}
      <nav className="flex flex-col gap-[1px] px-[8px] pt-[8px]">
        {navLinks.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex items-center gap-[8px] px-[10px] py-[8px] rounded-[7px] text-[13px] transition-colors ${
                isActive
                  ? "bg-[#FFF4EC] text-[#FC8019] font-semibold"
                  : "text-[#6B7280] font-medium hover:bg-[rgba(252,128,25,0.07)] hover:text-[#111827]"
              }`}
            >
              {isActive && (
                <span className="absolute left-[-8px] top-[4px] bottom-[4px] w-[3px] bg-[#FC8019] rounded-r-[3px]" />
              )}
              <Icon size={14} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* User section — pinned to bottom */}
      <div className="mt-auto border-t border-[#F0F1F4] px-[14px] py-[13px] flex items-center gap-[9px]">
        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={user.firstName || "User"}
            className="w-[30px] h-[30px] rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-[30px] h-[30px] rounded-full bg-[#FC8019] flex items-center justify-center text-white text-[10.5px] font-bold flex-shrink-0">
            {initials}
          </div>
        )}

        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[12.5px] font-semibold text-[#111827] leading-[1.2] truncate">
            {user?.firstName} {user?.lastName}
          </span>
          {targetRole && (
            <span className="text-[10.5px] text-[#9CA3AF] mt-[1px] truncate">
              {targetRole}
            </span>
          )}
        </div>

        <button
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="flex-shrink-0 text-[#9CA3AF] hover:text-[#DC2626] transition-colors bg-transparent border-0 p-0 cursor-pointer"
        >
          <LogOut size={14} />
        </button>
      </div>

    </aside>
  )
}
