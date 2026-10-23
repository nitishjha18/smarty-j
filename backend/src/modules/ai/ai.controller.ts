import { Request, Response } from "express"
import { analyzeResume, getResumeAnalysis } from "./ai.service"
import { badRequest } from "../../utils/AppError"

export const analyzeResumeController = async (req: Request, res: Response) => {
  const user = (req as any).user
  const { applicationId } = req.body

  if (!applicationId) {
    throw badRequest("applicationId is required")
  }

  const result = await analyzeResume(user.id, applicationId)
  res.status(200).json({ analysis: result })
}

export const getResumeAnalysisController = async (
  req: Request,
  res: Response
) => {
  const user = (req as any).user
  const appId = req.params.appId as string

  const result = await getResumeAnalysis(user.id, appId)
  res.status(200).json({ analysis: result })
}
