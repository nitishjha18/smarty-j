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
      <div className="flex-1 min-w-0 overflow-y-auto">
        <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
