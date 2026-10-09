"use client"

import { useState } from "react"

const CLIENT_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID

export default function CompanyLogo({
  domain,
  name,
  size = 28,
}: {
  domain?: string | null
  name: string
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const showImage = !!domain && !!CLIENT_ID && !failed

  return (
    <div
      className="shrink-0 flex items-center justify-center overflow-hidden bg-[#F3F4F6] border border-[#E5E7EB] font-bold text-[#6B7280]"
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
