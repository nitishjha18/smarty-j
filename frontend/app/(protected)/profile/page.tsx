"use client"

import { useAuth } from "@clerk/nextjs"
import { useEffect, useRef, useState } from "react"
import { getProfile, updateProfile, uploadResume } from "../../lib/api"
import { User } from "../../types"

export default function ProfilePage() {
  const { getToken } = useAuth()

  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [targetRole, setTargetRole] = useState("")
  const [experienceLevel, setExperienceLevel] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken()
        const data = await getProfile(token!)
        setProfile(data.user)
        setName(data.user.name ?? "")
        setTargetRole(data.user.targetRole ?? "")
        setExperienceLevel(data.user.experienceLevel ?? "")
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getToken])

  const handleSaveProfile = async () => {
    setProfileError(null)
    setProfileSaved(false)
    setSavingProfile(true)
    try {
      const token = await getToken()
      const data = await updateProfile(token!, { name, targetRole, experienceLevel })
      setProfile(data.user)
      setProfileSaved(true)
    } catch (err: any) {
      setProfileError(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleUploadResume = async () => {
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

    setUploadingResume(true)
    try {
      const token = await getToken()
      const data = await uploadResume(token!, selectedFile)
      setProfile((prev) =>
        prev ? { ...prev, resumeUrl: data.resumeUrl, resumeText: data.resumeText } : prev
      )
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setUploadSuccess(true)
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setUploadingResume(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-[#6B7280] text-sm">Loading profile...</div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-[#EF4444] text-sm">{error}</div>
    )
  }

  if (!profile) {
    return (
      <div className="p-8 text-[#6B7280] text-sm">Profile not found.</div>
    )
  }

  return (
    <div className="p-10 max-w-[900px]">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#111827]">Profile</h1>
        <p className="text-sm text-[#6B7280] mt-1.5">Your name and job search preferences.</p>
      </div>

      {/* Profile info card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-8">
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-[13px] font-medium text-[#111827] mb-[7px]">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg px-3.5 py-2.5 outline-none transition-colors focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#111827] mb-[7px]">
              Target Role
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Backend Engineer"
              className="w-full text-sm text-[#111827] placeholder-[#9CA3AF] bg-white border border-[#E5E7EB] rounded-lg px-3.5 py-2.5 outline-none transition-colors focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#111827] mb-[7px]">
              Experience Level
            </label>
            <input
              type="text"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              placeholder="e.g. Fresher"
              className="w-full text-sm text-[#111827] placeholder-[#9CA3AF] bg-white border border-[#E5E7EB] rounded-lg px-3.5 py-2.5 outline-none transition-colors focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10"
            />
          </div>
        </div>

        <div className="mt-7">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="bg-[#FF6B35] hover:bg-[#E85A2A] text-white text-sm font-semibold rounded-lg px-[22px] py-[11px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
          {profileSaved && (
            <p className="mt-3 text-sm text-[#16A34A]">Profile saved.</p>
          )}
          {profileError && (
            <p className="mt-3 text-sm text-[#EF4444]">{profileError}</p>
          )}
        </div>
      </div>

      {/* Resume card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 mt-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#111827] mb-1">Resume</h2>
          <p className="text-[13px] text-[#6B7280]">
            Upload your resume once. It will be used for AI resume analysis on any application.
          </p>
        </div>

        {/* Current resume state */}
        {profile.resumeUrl ? (
          <div className="flex items-center gap-3.5 mb-6 p-4 bg-[#FFF8F5] border border-[#FFD9C7] rounded-[10px]">
            <div className="w-[30px] h-[30px] flex-shrink-0 rounded-full bg-[#FF6B35] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827] mb-0.5">Resume uploaded</p>
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-medium text-[#6B7280] underline hover:text-[#111827] transition-colors"
              >
                View current resume
              </a>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-[#F9FAFB] border border-dashed border-[#D1D5DB] rounded-[10px]">
            <p className="text-sm text-[#6B7280]">No resume uploaded yet.</p>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Upload a resume to unlock AI resume analysis on your applications.
            </p>
          </div>
        )}

        {/* Upload controls */}
        <div>
          <label className="block text-[13px] font-medium text-[#111827] mb-[7px]">
            {profile.resumeUrl ? "Replace resume" : "Upload resume"}
          </label>
          <div className="flex items-center gap-3 border border-[#E5E7EB] rounded-lg py-2 pl-3.5 pr-2 max-w-[480px]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 bg-[#F3F4F6] border border-[#E5E7EB] hover:bg-[#E9EAEC] rounded-md px-3.5 py-[7px] text-[13px] font-medium text-[#111827] transition-colors"
            >
              Choose File
            </button>
            <span className="text-[13px] text-[#6B7280] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {selectedFile ? selectedFile.name : "No file chosen"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => {
                setUploadError(null)
                setUploadSuccess(false)
                setSelectedFile(e.target.files?.[0] ?? null)
              }}
              className="hidden"
            />
          </div>
        </div>

        <div className="mt-7">
          <button
            onClick={handleUploadResume}
            disabled={uploadingResume}
            className="bg-[#FF6B35] hover:bg-[#E85A2A] text-white text-sm font-semibold rounded-lg px-[22px] py-[11px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingResume ? "Uploading..." : "Upload"}
          </button>

          {uploadSuccess && (
            <p className="mt-3 text-sm text-[#16A34A]">Resume uploaded successfully.</p>
          )}
          {uploadError && (
            <p className="mt-3 text-sm text-[#EF4444]">{uploadError}</p>
          )}
        </div>
      </div>

    </div>
  )
}