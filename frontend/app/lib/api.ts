
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

async function apiFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Something went wrong")
  }

  return res.json()
}

// ─── User ───────────────────────────────────────────────

export const syncUser = (token: string) =>
  apiFetch("/api/user/sync", token, { method: "POST" })

export const getProfile = (token: string) =>
  apiFetch("/api/user/profile", token)

export const updateProfile = (token: string, data: object) =>
  apiFetch("/api/user/profile", token, {
    method: "PUT",
    body: JSON.stringify(data)
  })

export const uploadResume = async (token: string, file: File) => {
  const formData = new FormData()
  formData.append("resume", file)

  const res = await fetch(`${API_URL}/api/user/resume`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
    body: formData
    // Do NOT set Content-Type — browser sets it automatically with boundary
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Upload failed")
  }

  return res.json()
}

// ─── Applications ────────────────────────────────────────

export const createApplication = (token: string, data: object) =>
  apiFetch("/api/applications", token, {
    method: "POST",
    body: JSON.stringify(data)
  })

export const getApplications = (token: string) =>
  apiFetch("/api/applications", token)

export const getApplication = (token: string, id: string) =>
  apiFetch(`/api/applications/${id}`, token)

export const updateApplication = (token: string, id: string, data: object) =>
  apiFetch(`/api/applications/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data)
  })

export const deleteApplication = (token: string, id: string) =>
  apiFetch(`/api/applications/${id}`, token, { method: "DELETE" })

// ─── AI ──────────────────────────────────────────────────

export const analyzeResume = (token: string, applicationId: string) =>
  apiFetch("/api/ai/analyze-resume", token, {
    method: "POST",
    body: JSON.stringify({ applicationId })
  })

export const generateInterviewPrep = (token: string, applicationId: string) =>
  apiFetch("/api/ai/interview-prep", token, {
    method: "POST",
    body: JSON.stringify({ applicationId })
  })

export const saveAnswers = (token: string, answers: object[]) =>
  apiFetch("/api/ai/save-answers", token, {
    method: "POST",
    body: JSON.stringify({ answers })
  })

export const getAnswers = (token: string, appId: string) =>
  apiFetch(`/api/ai/answers/${appId}`, token)

// ─── Reminders ───────────────────────────────────────────

export const createReminder = (token: string, data: object) =>
  apiFetch("/api/reminders", token, {
    method: "POST",
    body: JSON.stringify(data)
  })

export const updateReminder = (token: string, id: string, data: object) =>
  apiFetch(`/api/reminders/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data)
  })

export const deleteReminder = (token: string, id: string) =>
  apiFetch(`/api/reminders/${id}`, token, { method: "DELETE" })

// ─── Dashboard ───────────────────────────────────────────

export const getDashboardStats = (token: string) =>
  apiFetch("/api/dashboard/stats", token)