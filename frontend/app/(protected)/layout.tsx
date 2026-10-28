// app/(protected)/layout.tsx
"use client"

import { useEffect } from "react"
import Sidebar from "../components/Sidebar"
import { useUserSync } from "../lib/queries"

export default function ProtectedLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { error, isError } = useUserSync()

  useEffect(() => {
    if (isError) console.error("User sync failed:", error)
  }, [error, isError])

  return (
    <div className="flex h-screen flex-col lg:flex-row bg-surface overflow-hidden">
      <Sidebar />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <main className="h-full">{children}</main>
      </div>
    </div>
  )
}
