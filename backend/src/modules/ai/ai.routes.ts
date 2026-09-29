import { Router } from "express"
import { requireUser } from "../../middleware/auth"
import {
  analyzeResumeController,
  getResumeAnalysisController
} from "./ai.controller"

const router = Router()

router.use(requireUser)
router.post("/analyze-resume", analyzeResumeController)
router.get("/resume-analysis/:appId", getResumeAnalysisController)

export default router