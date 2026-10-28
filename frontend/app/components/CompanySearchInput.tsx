"use client"

import { useEffect, useState } from "react"
import { Check, Search } from "lucide-react"
import CompanyLogo from "./CompanyLogo"
import { Input } from "./ui/Field"
import { cn } from "../lib/cn"

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

  const canSearch = value.trim().length >= 2 && !!CLIENT_ID

  useEffect(() => {
    if (!canSearch) return

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
  }, [value, canSearch])

  // Short input or no client ID: nothing to suggest, whatever the last response was.
  const visibleResults = canSearch ? results : []

  return (
    <div className="relative">
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <Input
        name="companyName"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Start typing a company name…"
        autoComplete="off"
        className={cn("pl-9", domain ? "pr-12" : "pr-3")}
      />

      {/* Logo of the selected company, shown at the end of the input */}
      {domain && (
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <CompanyLogo key={domain} domain={domain} name={value} size={24} />
        </div>
      )}

      {open && visibleResults.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-btn border border-line bg-surface p-0 shadow-pop">
          {visibleResults.map((r) => (
            <li
              key={r.domain}
              onMouseDown={() => {
                onSelect({ name: r.name, domain: r.domain })
                setOpen(false)
              }}
              className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-brand-tint-bg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.icon} alt="" width={24} height={24} className="shrink-0 rounded" />
              <span className="truncate text-sm font-medium text-ink">{r.name}</span>
              <span className="truncate text-xs text-muted">{r.domain}</span>
              {r.verified && (
                <Check size={14} className="ml-auto shrink-0 text-success" aria-label="Verified" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
