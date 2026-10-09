
export type ApplicationStatus =
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "ASSIGNMENT"
  | "OFFER"
  | "REJECTED"

export type ApplicationSource =
  | "LINKED_IN"
  | "NAUKARI"
  | "REFERAL"
  | "COLDEMAIL"
  | "SOCIAL_MEDIA"
  | "OTHER_JOB_APPS"

export interface User {
  id: string
  clerkId: string
  name: string
  email: string
  profilePicture: string | null
  targetRole: string | null
  experienceLevel: string | null
  resumeUrl: string | null
  resumeText: string | null
  createdAt: string
  updatedAt: string
}

export interface StatusHistory {
  id: string
  applicationId: string
  status: ApplicationStatus
  createdAt: string
}

export interface Application {
  id: string
  userId: string
  companyName: string
  companyDomain: string | null
  jobTitle: string
  jobDescription: string
  status: ApplicationStatus
  source: ApplicationSource
  dateApplied: string
  notes: string | null
  createdAt: string
  updatedAt: string
  statusHistory?: StatusHistory[]
}

export interface ResumeAnalysis {
  id: string
  applicationId: string
  matchScore: number
  missingKeywords: string[]
  strongestPoints: string[]
  redFlags: string[]
  recruiterTake: string
  suggestions: string[]
  createdAt: string
  updatedAt: string
}

export interface Reminder {
  id: string
  userId: string
  applicationId: string
  reminderDate: string
  isSent: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  totalApplications: number
  responseRate: number
  rejectionRate: number
  bestSource: ApplicationSource | null
  staleApplications: number
}