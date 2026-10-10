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
    <div className="flex h-screen bg-[#F4F5F7] overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <main className="min-h-full p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
