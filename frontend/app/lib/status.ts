import type { ApplicationSource, ApplicationStatus } from "../types"

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  ASSIGNMENT: "Assignment",
  OFFER: "Offer",
  REJECTED: "Rejected",
}

export const SOURCE_LABELS: Record<ApplicationSource, string> = {
  LINKED_IN: "LinkedIn",
  NAUKARI: "Naukri",
  REFERAL: "Referral",
  COLDEMAIL: "Cold Email",
  SOCIAL_MEDIA: "Social Media",
  OTHER_JOB_APPS: "Other",
}

/** Every status, in board order. */
export const ALL_STATUSES: ApplicationStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "ASSIGNMENT",
  "OFFER",
  "REJECTED",
]

/** Stages shown in the dashboard strip and the detail stepper (REJECTED is terminal). */
export const PIPELINE_STAGES: ApplicationStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "ASSIGNMENT",
  "OFFER",
]

/**
 * Tailwind class names per status. Full literal strings so Tailwind can see them.
 * dot: solid fill (dots, bars, stepper); tint: light background; text: readable label color.
 */
export const STATUS_STYLES: Record<
  ApplicationStatus,
  { dot: string; border: string; tint: string; text: string }
> = {
  APPLIED: {
    dot: "bg-st-applied",
    border: "border-st-applied",
    tint: "bg-st-applied-tint",
    text: "text-st-applied-text",
  },
  SCREENING: {
    dot: "bg-st-screening",
    border: "border-st-screening",
    tint: "bg-st-screening-tint",
    text: "text-st-screening-text",
  },
  INTERVIEW: {
    dot: "bg-st-interview",
    border: "border-st-interview",
    tint: "bg-st-interview-tint",
    text: "text-st-interview-text",
  },
  ASSIGNMENT: {
    dot: "bg-st-assignment",
    border: "border-st-assignment",
    tint: "bg-st-assignment-tint",
    text: "text-st-assignment-text",
  },
  OFFER: {
    dot: "bg-st-offer",
    border: "border-st-offer",
    tint: "bg-st-offer-tint",
    text: "text-st-offer-text",
  },
  REJECTED: {
    dot: "bg-st-rejected",
    border: "border-st-rejected",
    tint: "bg-st-rejected-tint",
    text: "text-st-rejected-text",
  },
}
