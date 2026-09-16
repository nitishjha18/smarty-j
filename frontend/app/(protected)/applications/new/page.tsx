"use client"

import { useAuth } from "@clerk/nextjs"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createApplication } from "../../../lib/api"
import { ApplicationSource } from "../../../types"

const SOURCES: { value: ApplicationSource; label: string }[] = [
  { value: "LINKED_IN", label: "LinkedIn" },
  { value: "NAUKARI", label: "Naukri" },
  { value: "REFERAL", label: "Referral" },
  { value: "COLDEMAIL", label: "Cold Email" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "OTHER_JOB_APPS", label: "Other" },
]

export default function NewApplicationPage() {
  const { getToken } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState({
    companyName: "",
    jobTitle: "",
    jobDescription: "",
    source: "LINKED_IN" as ApplicationSource,
    notes: "",
    dateApplied: new Date().toISOString().split("T")[0],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async () => {
    if (!form.companyName || !form.jobTitle || !form.source) {
      setError("Company name, job title, and source are required.")
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      const token = await getToken()
      if (!token) return
      const data = await createApplication(token, form)
      router.push(`/applications/${data.application.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-10 max-w-[900px]">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#111827]">New Application</h1>
        <p className="text-sm text-[#6B7280] mt-1.5">Track a job you've applied to.</p>
      </div>

      {/* Form card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-8">

        {/* Job Details section */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] mb-[18px]">
            Job Details
          </p>

          <div className="flex flex-col gap-5">
            {/* Company name */}
            <div>
              <label className="block text-[13px] font-medium text-[#111827] mb-[7px]">
                Company name<span className="text-[#EF4444] ml-0.5">*</span>
              </label>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="e.g. Google"
                className="w-full text-sm text-[#111827] placeholder-[#9CA3AF] bg-white border border-[#E5E7EB] rounded-lg px-3.5 py-2.5 outline-none transition-colors focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10"
              />
            </div>

            {/* Job title */}
            <div>
              <label className="block text-[13px] font-medium text-[#111827] mb-[7px]">
                Job title<span className="text-[#EF4444] ml-0.5">*</span>
              </label>
              <input
                name="jobTitle"
                value={form.jobTitle}
                onChange={handleChange}
                placeholder="e.g. Backend Engineer"
                className="w-full text-sm text-[#111827] placeholder-[#9CA3AF] bg-white border border-[#E5E7EB] rounded-lg px-3.5 py-2.5 outline-none transition-colors focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10"
              />
            </div>

            {/* Source + Date applied */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-[7px]">
                  Source<span className="text-[#EF4444] ml-0.5">*</span>
                </label>
                <select
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                  className="w-full text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg px-3.5 py-2.5 pr-10 outline-none cursor-pointer transition-colors focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%236B7280%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3e%3cpolyline%20points=%276%209%2012%2015%2018%209%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.9rem_center] bg-[length:16px]"
                >
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-[7px]">
                  Date applied
                </label>
                <input
                  type="date"
                  name="dateApplied"
                  value={form.dateApplied}
                  onChange={handleChange}
                  className="w-full text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg px-3.5 py-2.5 outline-none transition-colors focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#E5E7EB] my-7" />

        {/* Additional Details section */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] mb-[18px]">
            Additional Details
          </p>

          <div className="flex flex-col gap-5">
            {/* Job description */}
            <div>
              <label className="block text-[13px] font-medium text-[#111827] mb-[7px]">
                Job description
              </label>
              <textarea
                name="jobDescription"
                value={form.jobDescription}
                onChange={handleChange}
                placeholder="Paste the job description here..."
                rows={5}
                className="w-full text-sm text-[#111827] placeholder-[#9CA3AF] bg-white border border-[#E5E7EB] rounded-lg px-3.5 py-2.5 outline-none transition-colors focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 resize-y min-h-[140px] leading-relaxed"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[13px] font-medium text-[#111827] mb-[7px]">
                Notes
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any notes about this application..."
                rows={3}
                className="w-full text-sm text-[#111827] placeholder-[#9CA3AF] bg-white border border-[#E5E7EB] rounded-lg px-3.5 py-2.5 outline-none transition-colors focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 resize-y min-h-[100px] leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <p className="text-sm text-[#EF4444] mt-6">{error}</p>}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-[#E5E7EB]">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#FF6B35] hover:bg-[#E85A2A] text-white text-sm font-semibold rounded-lg px-[22px] py-[11px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Save Application"}
          </button>
          <button
            onClick={() => router.back()}
            className="text-sm font-medium text-[#6B7280] hover:text-[#111827] hover:underline transition-colors px-1 py-[11px]"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  )
}