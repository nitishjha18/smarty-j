import type { ApplicationStatus } from "../../types"

/** Sample data for the landing-page mockups. Not app data. */
export type Company = {
  name: string
  companyDomain: string
  role: string
  source: string
  date: string
  quiet?: number
}

export const COMPANIES: Record<string, Company> = {
  google: { name: "Google", companyDomain: "google.com", role: "Senior Frontend Engineer", source: "LinkedIn", date: "Sep 17", quiet: 27 },
  microsoft: { name: "Microsoft", companyDomain: "microsoft.com", role: "Frontend Engineer II", source: "Company website", date: "Sep 23", quiet: 21 },
  vercel: { name: "Vercel", companyDomain: "vercel.com", role: "Senior Frontend Engineer", source: "Company website", date: "Oct 6" },
  stripe: { name: "Stripe", companyDomain: "stripe.com", role: "Product Engineer", source: "Company website", date: "Sep 24" },
  notion: { name: "Notion", companyDomain: "notion.so", role: "Product Engineer", source: "Referral", date: "Oct 4" },
  airbnb: { name: "Airbnb", companyDomain: "airbnb.com", role: "Frontend Engineer, Hosting", source: "LinkedIn", date: "Sep 9" },
  linear: { name: "Linear", companyDomain: "linear.app", role: "Frontend Engineer", source: "LinkedIn", date: "Sep 30" },
  figma: { name: "Figma", companyDomain: "figma.com", role: "Software Engineer, Web Platform", source: "Referral", date: "Sep 27" },
  shopify: { name: "Shopify", companyDomain: "shopify.com", role: "Senior React Developer", source: "Company website", date: "Aug 25" },
  netflix: { name: "Netflix", companyDomain: "netflix.com", role: "UI Engineer", source: "LinkedIn", date: "Sep 1" },
}

export type BoardColumnData = {
  status: ApplicationStatus
  ids: string[]
  /** Card shown lifted above its slot (hero illustration). */
  lifted?: string
}

export const HERO_COLUMNS: BoardColumnData[] = [
  { status: "APPLIED", ids: ["google", "microsoft", "vercel"] },
  { status: "SCREENING", ids: ["notion"], lifted: "stripe" },
  { status: "INTERVIEW", ids: ["airbnb", "linear"] },
]

export const BOARD_COLUMNS: BoardColumnData[] = [
  { status: "APPLIED", ids: ["google", "microsoft", "vercel"] },
  { status: "SCREENING", ids: ["stripe", "notion"] },
  { status: "INTERVIEW", ids: ["airbnb", "linear"] },
  { status: "ASSIGNMENT", ids: ["figma"] },
  { status: "OFFER", ids: ["shopify"] },
  { status: "REJECTED", ids: ["netflix"] },
]

export const STRIP: { n: string; status: ApplicationStatus }[] = [
  { n: "3", status: "APPLIED" },
  { n: "2", status: "SCREENING" },
  { n: "2", status: "INTERVIEW" },
  { n: "1", status: "ASSIGNMENT" },
  { n: "1", status: "OFFER" },
]
