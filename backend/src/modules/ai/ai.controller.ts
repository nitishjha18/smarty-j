import { Request, Response } from "express"
import { analyzeResume, getResumeAnalysis } from "./ai.service"

export const analyzeResumeController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { applicationId } = req.body

    if (!applicationId) {
      res.status(400).json({ error: "applicationId is required" })
      return
    }

    const result = await analyzeResume(user.id, applicationId)
    res.status(200).json({ analysis: result })
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: "Internal server error" })
  }
}

export const getResumeAnalysisController = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user
    const appId = req.params.appId as string

    const result = await getResumeAnalysis(user.id, appId)
    res.status(200).json({ analysis: result })
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: "Internal server error" })
  }
}