"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import type { ApplicationSource } from "../../../types"
import CompanySearchInput from "../../../components/CompanySearchInput"
import Button from "../../../components/ui/Button"
import Chip from "../../../components/ui/Chip"
import { FieldError, FieldHint, Input, Label, Textarea } from "../../../components/ui/Field"
import Modal from "../../../components/ui/Modal"
import { useCreateApplication } from "../../../lib/queries"
import { SOURCE_LABELS } from "../../../lib/status"
import ApplicationsPage from "../page"

const SOURCES = Object.keys(SOURCE_LABELS) as ApplicationSource[]

const todayISO = () => new Date().toISOString().split("T")[0]

const Required = () => <span className="ml-0.5 text-danger">*</span>

export default function NewApplicationPage() {
  const router = useRouter()
  const createApplication = useCreateApplication()

  const [form, setForm] = useState({
    companyName: "",
    companyDomain: "",
    jobTitle: "",
    jobDescription: "",
    source: "LINKED_IN" as ApplicationSource,
    notes: "",
    dateApplied: todayISO(),
  })
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
      setError(null)
      const data = await createApplication.mutateAsync({
        ...form,
        companyDomain: form.companyDomain || undefined,
      })
      router.push(`/applications/${data.application.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const close = () => router.back()

  return (
    <>
      {/* The board stays visible behind the dialog, like the design. */}
      <ApplicationsPage />

      <Modal
        onClose={close}
        size="md"
        label="New application"
        className="flex max-h-[min(820px,calc(100vh-48px))] flex-col overflow-hidden"
      >
        <div className="shrink-0 px-8 pb-0 pt-7 pr-16">
          <h1 className="m-0 text-[22px] font-semibold leading-[1.2] tracking-[-0.03em]">
            New application
          </h1>
          <p className="m-0 mt-1 text-sm text-body">Add a job to your tracking pipeline.</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-8 py-6">
          <div>
            <Label>
              Company name
              <Required />
            </Label>
            <CompanySearchInput
              value={form.companyName}
              domain={form.companyDomain}
              onChange={(name) =>
                setForm((prev) => ({ ...prev, companyName: name, companyDomain: "" }))
              }
              onSelect={({ name, domain }) =>
                setForm((prev) => ({ ...prev, companyName: name, companyDomain: domain }))
              }
            />
          </div>

          <div>
            <Label>
              Job title
              <Required />
            </Label>
            <Input
              name="jobTitle"
              value={form.jobTitle}
              onChange={handleChange}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>

          <div>
            <Label>
              Source
              <Required />
            </Label>
            <div role="group" aria-label="Source" className="flex flex-wrap gap-2">
              {SOURCES.map((value) => (
                <Chip
                  key={value}
                  selected={form.source === value}
                  onClick={() => setForm((prev) => ({ ...prev, source: value }))}
                >
                  {SOURCE_LABELS[value]}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <Label>Date applied</Label>
            <div className="grid grid-cols-2 items-center gap-3">
              <Input
                type="date"
                name="dateApplied"
                value={form.dateApplied}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, dateApplied: todayISO() }))}
                className="text-sm2 font-medium text-muted transition-colors hover:text-brand"
              >
                Today
              </button>
            </div>
          </div>

          <div>
            <Label>Job description</Label>
            <Textarea
              name="jobDescription"
              value={form.jobDescription}
              onChange={handleChange}
              placeholder="Paste the job description here…"
              rows={5}
              className="min-h-[140px]"
            />
            <FieldHint>Optional — used for AI resume fit.</FieldHint>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Any notes about this application..."
              rows={3}
              className="min-h-24"
            />
          </div>

          {error && <FieldError>{error}</FieldError>}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-line px-8 py-4">
          <Button variant="outline" size="none" className="h-11 px-4 text-sm" onClick={close}>
            Cancel
          </Button>
          <Button size="cta" onClick={handleSubmit} disabled={createApplication.isPending}>
            {!createApplication.isPending && <Check size={16} strokeWidth={2.6} />}
            {createApplication.isPending ? "Saving..." : "Save application"}
          </Button>
        </div>
      </Modal>
    </>
  )
}
