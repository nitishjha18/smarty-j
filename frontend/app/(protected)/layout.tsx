// app/(protected)/layout.tsx
"use client"

import { useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import Sidebar from "../components/Sidebar"
import { syncUser } from "../lib/api"

export default function ProtectedLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const sync = async () => {
      try {
        const token = await getToken()
        if (token) await syncUser(token)
      } catch (err) {
        console.error("User sync failed:", err)
      }
    }

    sync()
  }, [isLoaded, isSignedIn])

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
