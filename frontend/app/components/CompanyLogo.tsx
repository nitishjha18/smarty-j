"use client"

import { useState } from "react"
import type { ApplicationStatus } from "../types"
import { cn } from "../lib/cn"
import { STATUS_STYLES } from "../lib/status"

const CLIENT_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID

export default function CompanyLogo({
  domain,
  name,
  size = 28,
  tone,
}: {
  domain?: string | null
  name: string
  size?: number
  /** Colors the letter-avatar fallback with this status color (design's letter tiles). */
  tone?: ApplicationStatus
}) {
  const [failed, setFailed] = useState(false)
  const showImage = !!domain && !!CLIENT_ID && !failed

  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-center overflow-hidden font-semibold",
        showImage || !tone
          ? "bg-surface-alt border border-line text-muted"
          : cn(STATUS_STYLES[tone].dot, "text-white")
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        fontSize: Math.round(size * 0.4),
      }}
    >
      {showImage ? (
        // Plain <img> on purpose: Brandfetch requires logo links to be embedded directly
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={domain}
          src={`https://cdn.brandfetch.io/${domain}/icon?c=${CLIENT_ID}`}
          alt={`${name} logo`}
          width={size}
          height={size}
          className="w-full h-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{name.trim().charAt(0).toUpperCase() || "?"}</span>
      )}
    </div>
  )
}
