"use client"

import { useEffect, useState } from "react"
import CompanyLogo from "./CompanyLogo"

const CLIENT_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID

type Brand = { name: string; domain: string; icon: string; verified: boolean }

export default function CompanySearchInput({
  value,
  domain,
  onChange,
  onSelect,
}: {
  value: string
  domain?: string
  onChange: (name: string) => void
  onSelect: (company: { name: string; domain: string }) => void
}) {
  const [results, setResults] = useState<Brand[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (value.trim().length < 2 || !CLIENT_ID) {
      setResults([])
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.brandfetch.io/v2/search/${encodeURIComponent(value.trim())}?c=${CLIENT_ID}`,
          { signal: controller.signal }
        )
        if (!res.ok) return
        const data: Brand[] = await res.json()
        setResults(data.slice(0, 5))
      } catch {
        // Aborted or failed: no suggestions, free-text entry still works
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value])

  return (
    <div className="relative">
      <input
        name="companyName"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="e.g. Google"
        autoComplete="off"
        className={`w-full text-sm text-[#111827] placeholder-[#9CA3AF] bg-white border border-[#E5E7EB] rounded-lg pl-3.5 py-2.5 outline-none transition-colors focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 ${
          domain ? "pr-12" : "pr-3.5"
        }`}
      />

      {/* Logo of the selected company, shown at the end of the input */}
      {domain && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <CompanyLogo key={domain} domain={domain} name={value} size={24} />
        </div>
      )}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg overflow-hidden">
          {results.map((r) => (
            <li
              key={r.domain}
              onMouseDown={() => {
                onSelect({ name: r.name, domain: r.domain })
                setOpen(false)
              }}
              className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-[#F9FAFB]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.icon} alt="" width={24} height={24} className="rounded shrink-0" />
              <span className="text-sm font-medium text-[#111827] truncate">{r.name}</span>
              <span className="text-xs text-[#9CA3AF] truncate">{r.domain}</span>
              {r.verified && <span className="ml-auto text-xs text-[#15803D]">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
