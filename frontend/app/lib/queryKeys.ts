export const qk = {
  sync: (uid: string) => ["user-sync", uid] as const,
  profile: (uid: string) => ["profile", uid] as const,
  applications: (uid: string) => ["applications", uid] as const,
  application: (uid: string, id: string) => ["application", uid, id] as const,
  dashboardStats: (uid: string) => ["dashboard-stats", uid] as const,
  resumeAnalysisAll: (uid: string) => ["resume-analysis", uid] as const,
  resumeAnalysis: (uid: string, appId: string) => ["resume-analysis", uid, appId] as const,
}
