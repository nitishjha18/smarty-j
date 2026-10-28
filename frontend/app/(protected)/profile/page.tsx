"use client"

import { useRef, useState } from "react"
import { Eye, FileText, Lock, RefreshCw, Upload } from "lucide-react"
import Skeleton from "../../components/Skeleton"
import Avatar from "../../components/ui/Avatar"
import Button from "../../components/ui/Button"
import Eyebrow from "../../components/ui/Eyebrow"
import { FieldError, FieldHint, Input, Label } from "../../components/ui/Field"
import { useProfile, useUpdateProfile, useUploadResume } from "../../lib/queries"
import { buttonStyles } from "../../components/ui/Button"
import { cn } from "../../lib/cn"

function resumeFileName(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || "resume.pdf")
  } catch {
    return "resume.pdf"
  }
}

export default function ProfilePage() {
  const profileQuery = useProfile()
  const updateProfile = useUpdateProfile()
  const uploadResume = useUploadResume()
  const profile = profileQuery.data ?? null
  const loading = profileQuery.isPending
  const error = profileQuery.error?.message ?? null

  const [name, setName] = useState("")
  const [targetRole, setTargetRole] = useState("")
  const [experienceLevel, setExperienceLevel] = useState("")
  const [initializedFor, setInitializedFor] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [replaceWarningOpen, setReplaceWarningOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize the fields once per fetched profile, so a refetch never overwrites typing.
  if (profile && initializedFor !== profile.id) {
    setInitializedFor(profile.id)
    setName(profile.name ?? "")
    setTargetRole(profile.targetRole ?? "")
    setExperienceLevel(profile.experienceLevel ?? "")
  }

  const handleSaveProfile = async () => {
    setProfileError(null)
    setProfileSaved(false)
    try {
      await updateProfile.mutateAsync({ name, targetRole, experienceLevel })
      setProfileSaved(true)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleUploadResume = async (selectedFile: File | null) => {
    setUploadError(null)
    setUploadSuccess(false)

    if (!selectedFile) {
      setUploadError("Please select a PDF file.")
      return
    }
    if (selectedFile.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.")
      return
    }

    try {
      await uploadResume.mutateAsync(selectedFile)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setUploadSuccess(true)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err))
    }
  }

  const openFilePicker = () => fileInputRef.current?.click()

  if (loading) {
    return (
      <div className="flex max-w-[720px] flex-col gap-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return <div className="text-sm text-danger">{error}</div>
  }

  if (!profile) {
    return <div className="text-sm text-muted">Profile not found.</div>
  }

  const uploading = uploadResume.isPending

  return (
    <div className="max-w-[720px]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={(e) => handleUploadResume(e.target.files?.[0] ?? null)}
        className="hidden"
      />

      {/* Header */}
      <header>
        <h1 className="m-0 text-[32px] font-semibold leading-[1.15] tracking-[-0.03em]">
          Profile
        </h1>
        <p className="m-0 mt-2 text-[15px] text-body">
          Your details and the resume used for AI fit.
        </p>
      </header>

      {/* You */}
      <section className="mt-8">
        <Eyebrow className="border-b border-line pb-2.5">You</Eyebrow>
        <div className="mt-5 flex items-center gap-3.5">
          <Avatar name={profile.name || profile.email} src={profile.profilePicture} size={48} fontSize={17} />
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{profile.name}</div>
            <div className="mt-0.5 truncate text-sm text-body">{profile.email}</div>
            <div className="mt-0.5 flex items-center gap-[5px] text-xs text-muted">
              <Lock size={11} aria-hidden="true" />
              Managed by your Google sign-in
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="profile-role">Target Role</Label>
            <Input
              id="profile-role"
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Backend Engineer"
            />
          </div>
          <div>
            <Label htmlFor="profile-level">Experience Level</Label>
            <Input
              id="profile-level"
              type="text"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              placeholder="e.g. Fresher"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {profileSaved && (
            <span role="status" className="font-mono text-mono tracking-[0.06em] text-success">
              Profile saved.
            </span>
          )}
          {profileError && <FieldError>{profileError}</FieldError>}
          <Button size="cta" onClick={handleSaveProfile} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </section>

      {/* Resume */}
      <section className="mt-10">
        <Eyebrow className="border-b border-line pb-2.5">Resume</Eyebrow>

        {profile.resumeUrl ? (
          <div className="relative mt-5 rounded-card border border-line bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint-bg text-brand">
                <FileText size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-medium">
                  {uploading ? "Uploading…" : resumeFileName(profile.resumeUrl)}
                </p>
                <p className="m-0 mt-1 font-mono text-mono uppercase tracking-[0.06em] text-muted">
                  PDF
                </p>
              </div>
              <div className="relative flex items-center gap-2">
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={uploading}
                  className={buttonStyles({
                    variant: "outline",
                    size: "none",
                    className: cn(
                      "h-[34px] gap-1.5 rounded-ctl px-3 text-sm2",
                      uploading && "pointer-events-none opacity-50"
                    ),
                  })}
                >
                  <Eye size={14} />
                  View
                </a>
                <Button
                  variant="outline"
                  size="none"
                  className="h-[34px] gap-1.5 rounded-ctl px-3 text-sm2"
                  disabled={uploading}
                  onClick={() => setReplaceWarningOpen((o) => !o)}
                  aria-haspopup="dialog"
                  aria-expanded={replaceWarningOpen}
                >
                  <RefreshCw size={14} />
                  Replace
                </Button>

                {replaceWarningOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setReplaceWarningOpen(false)}
                      className="fixed inset-0 z-20 cursor-default"
                    />
                    <div
                      role="dialog"
                      aria-labelledby="replace-title"
                      className="absolute right-0 top-[calc(100%+8px)] z-30 w-80 max-w-[calc(100vw-48px)] rounded-card border border-line bg-surface p-4 shadow-pop"
                    >
                      <div id="replace-title" className="text-sm font-semibold">
                        Replace your resume?
                      </div>
                      <p className="m-0 mt-1.5 text-sm2 leading-normal text-body">
                        Saved AI fit results for your applications will be cleared. You can
                        re-analyze any application afterwards.
                      </p>
                      <div className="mt-3.5 flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setReplaceWarningOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setReplaceWarningOpen(false)
                            openFilePicker()
                          }}
                        >
                          Choose new PDF
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            {uploading && (
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-b-card"
              >
                <div className="h-full w-2/3 animate-pulse bg-brand-logo" />
              </div>
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleUploadResume(e.dataTransfer.files?.[0] ?? null)
            }}
            className="relative mt-5 flex flex-col items-center gap-1.5 rounded-card border-[1.5px] border-dashed border-line-dashed p-7 text-center"
          >
            <Upload size={22} className="text-brand" aria-hidden="true" />
            <div className="mt-1 text-sm font-semibold">Upload your resume</div>
            <div className="text-sm2 text-muted">
              Unlocks AI resume fit on your applications. PDF only, up to 5 MB.
            </div>
            <Button size="cta" className="mt-2.5" onClick={openFilePicker} disabled={uploading}>
              {uploading ? "Uploading..." : "Choose PDF"}
            </Button>
            {uploading && (
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-b-card"
              >
                <div className="h-full w-2/3 animate-pulse bg-brand-logo" />
              </div>
            )}
          </div>
        )}

        {uploadError && <FieldError className="mt-2">{uploadError}</FieldError>}
        {uploadSuccess && (
          <p role="status" className="m-0 mt-2 font-mono text-mono tracking-[0.06em] text-success">
            Resume uploaded successfully.
          </p>
        )}
        <FieldHint className="mt-2.5">
          PDF only, up to 5 MB. This resume is used for AI fit on every application.
        </FieldHint>
      </section>
    </div>
  )
}
