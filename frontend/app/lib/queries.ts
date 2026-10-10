"use client"

import { useAuth } from "@clerk/nextjs"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  analyzeResume,
  createApplication,
  createReminder,
  deleteApplication,
  getApplication,
  getApplications,
  getDashboardStats,
  getProfile,
  getResumeAnalysis,
  syncUser,
  updateApplication,
  updateProfile,
  uploadResume,
} from "./api"
import { qk } from "./queryKeys"
import type { Application, DashboardStats, ResumeAnalysis, User } from "../types"

function useAuthenticatedUser() {
  return useAuth()
}

async function getRequiredToken(getToken: () => Promise<string | null>) {
  const token = await getToken()
  if (!token) throw new Error("Not authenticated")
  return token
}

export function useUserSync() {
  const { getToken, userId, isSignedIn, isLoaded } = useAuthenticatedUser()

  return useQuery({
    queryKey: qk.sync(userId ?? ""),
    queryFn: async () => syncUser(await getRequiredToken(getToken)),
    staleTime: Infinity,
    retry: 1,
    enabled: isLoaded && isSignedIn && !!userId,
  })
}

function useSyncedAuth() {
  const { getToken, userId, isSignedIn, isLoaded } = useAuthenticatedUser()
  const synced = useUserSync().isSuccess
  const enabled = isLoaded && isSignedIn && !!userId && synced
  return { getToken, userId, enabled }
}

export function useProfile() {
  const { getToken, userId, enabled } = useSyncedAuth()
  return useQuery({
    queryKey: qk.profile(userId ?? ""),
    queryFn: async (): Promise<User> => (await getProfile(await getRequiredToken(getToken))).user,
    enabled,
  })
}

export function useApplications() {
  const { getToken, userId, enabled } = useSyncedAuth()
  return useQuery({
    queryKey: qk.applications(userId ?? ""),
    queryFn: async (): Promise<Application[]> =>
      (await getApplications(await getRequiredToken(getToken))).applications,
    enabled,
  })
}

export function useApplication(id: string) {
  const queryClient = useQueryClient()
  const { getToken, userId, enabled } = useSyncedAuth()
  return useQuery({
    queryKey: qk.application(userId ?? "", id),
    queryFn: async (): Promise<Application> =>
      (await getApplication(await getRequiredToken(getToken), id)).application,
    placeholderData: () =>
      queryClient
        .getQueryData<Application[]>(qk.applications(userId ?? ""))
        ?.find((application) => application.id === id),
    enabled: enabled && !!id,
  })
}

export function useDashboardStats() {
  const { getToken, userId, enabled } = useSyncedAuth()
  return useQuery({
    queryKey: qk.dashboardStats(userId ?? ""),
    queryFn: async (): Promise<DashboardStats> =>
      (await getDashboardStats(await getRequiredToken(getToken))).stats,
    enabled,
  })
}

export function useResumeAnalysis(appId: string) {
  const { getToken, userId, enabled } = useSyncedAuth()
  return useQuery({
    queryKey: qk.resumeAnalysis(userId ?? "", appId),
    queryFn: async (): Promise<ResumeAnalysis | null> =>
      (await getResumeAnalysis(await getRequiredToken(getToken), appId)).analysis ?? null,
    enabled: enabled && !!appId,
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  const { getToken, userId } = useSyncedAuth()
  return useMutation({
    mutationFn: async (data: object) => createApplication(await getRequiredToken(getToken), data),
    onSuccess: () => {
      if (!userId) return
      void queryClient.invalidateQueries({ queryKey: qk.applications(userId) })
      void queryClient.invalidateQueries({ queryKey: qk.dashboardStats(userId) })
    },
  })
}

export function useUpdateApplication(id: string) {
  const queryClient = useQueryClient()
  const { getToken, userId } = useSyncedAuth()
  return useMutation({
    mutationFn: async (data: object) => updateApplication(await getRequiredToken(getToken), id, data),
    onSuccess: (res) => {
      if (!userId) return
      queryClient.setQueryData(qk.application(userId, id), res.application)
      void queryClient.invalidateQueries({ queryKey: qk.applications(userId) })
      void queryClient.invalidateQueries({ queryKey: qk.dashboardStats(userId) })
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()
  const { getToken, userId } = useSyncedAuth()
  return useMutation({
    mutationFn: async (id: string) => deleteApplication(await getRequiredToken(getToken), id),
    onSuccess: (_res, id) => {
      if (!userId) return
      queryClient.cancelQueries({ queryKey: qk.application(userId, id) })
      queryClient.cancelQueries({ queryKey: qk.resumeAnalysis(userId, id) })
      queryClient.removeQueries({ queryKey: qk.application(userId, id), exact: true })
      queryClient.removeQueries({ queryKey: qk.resumeAnalysis(userId, id), exact: true })
      queryClient.setQueryData<Application[]>(qk.applications(userId), (applications) =>
        applications?.filter((application) => application.id !== id)
      )
      void queryClient.invalidateQueries({ queryKey: qk.dashboardStats(userId) })
    },
  })
}

export function useAnalyzeResume() {
  const queryClient = useQueryClient()
  const { getToken, userId } = useSyncedAuth()
  return useMutation({
    mutationFn: async (applicationId: string) =>
      analyzeResume(await getRequiredToken(getToken), applicationId),
    onSuccess: (res, applicationId) => {
      if (userId) queryClient.setQueryData(qk.resumeAnalysis(userId, applicationId), res.analysis)
    },
  })
}

export function useUploadResume() {
  const queryClient = useQueryClient()
  const { getToken, userId } = useSyncedAuth()
  return useMutation({
    mutationFn: async (file: File) => uploadResume(await getRequiredToken(getToken), file),
    onSuccess: (res) => {
      if (!userId) return
      queryClient.setQueryData<User>(qk.profile(userId), (profile) =>
        profile ? { ...profile, resumeUrl: res.resumeUrl, resumeText: res.resumeText } : profile
      )
      queryClient.setQueriesData<ResumeAnalysis | null>(
        { queryKey: qk.resumeAnalysisAll(userId) },
        null
      )
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { getToken, userId } = useSyncedAuth()
  return useMutation({
    mutationFn: async (data: object) => updateProfile(await getRequiredToken(getToken), data),
    onSuccess: (res) => {
      if (userId) queryClient.setQueryData(qk.profile(userId), res.user)
    },
  })
}

export function useCreateReminder() {
  const { getToken } = useSyncedAuth()
  return useMutation({
    mutationFn: async (data: object) => createReminder(await getRequiredToken(getToken), data),
  })
}
