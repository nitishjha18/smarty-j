import { geminiModel } from "../../config/gemini"
import prisma from "../../config/db"

// --- Keyword extraction algorithm ---
const STOP_WORDS = new Set([
  "the", "and", "with", "you", "will", "for", "are", "this",
  "that", "have", "from", "they", "your", "which", "when",
  "our", "can", "been", "has", "its", "not", "but", "all",
  "who", "we", "in", "to", "of", "a", "an", "is", "be",
  "as", "at", "or", "on", "by", "it", "if", "do", "so",
  "up", "out", "use", "any", "may", "new", "also", "work",
  "role", "team", "good", "well", "able", "must", "join",
  "using", "used", "help", "build", "strong", "about", "such"
])

const extractKeywords = (text: string): string[] => {
  const words = text
    .replace(/[^a-zA-Z0-9+#.\-/]/g, " ")
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2)
    .filter(w => !STOP_WORDS.has(w.toLowerCase()))

  const unique = [...new Set(words.map(w => w.toLowerCase()))]
  return unique
}

const getMissingKeywords = (
  jobDescription: string,
  resumeText: string
): string[] => {
  const jdKeywords = extractKeywords(jobDescription)
  const resumeLower = resumeText.toLowerCase()

  return jdKeywords
    .filter(keyword => !resumeLower.includes(keyword))
    .slice(0, 10) // cap at 10 missing keywords
}

// --- Resume Analysis ---
export const analyzeResume = async (userId: string, applicationId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user?.resumeText) {
    throw new Error("Resume not found. Please upload your resume first.")
  }

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId }
  })

  if (!application) {
    throw new Error("Application not found.")
  }

  if (!application.jobDescription) {
    throw new Error("No job description found for this application.")
  }

  // Compute missing keywords locally — no Gemini call needed
  const missingKeywords = getMissingKeywords(
    application.jobDescription,
    user.resumeText
  )

  // Gemini call — only what requires intelligence
  const prompt = `
You are an expert technical recruiter.

Analyse this resume against the job description for a ${user.experienceLevel || "fresher"} applying for a ${user.targetRole || "software"} role at ${application.companyName}.

Return ONLY a JSON object with exactly this structure:
{
  "matchScore": <number between 0 and 100>,
  "strongestPoints": <array of 2-4 strings>,
  "redFlags": <array of 1-3 strings>,
  "recruiterTake": <single sentence string>
}

matchScore: how well the resume matches the job description.
strongestPoints: what in the resume aligns well with this JD.
redFlags: specific gaps or concerns a recruiter would notice.
recruiterTake: one honest sentence summarising how a recruiter would view this resume for this role.

Return ONLY the JSON object. No explanation, no markdown, no extra text.

RESUME:
${user.resumeText}

JOB DESCRIPTION:
${application.jobDescription}
`

  const result = await geminiModel.generateContent(prompt)
  const text = result.response.text()
  const clean = text.replace(/```json|```/g, "").trim()
  const parsed = JSON.parse(clean)

  // Save to DB — upsert so reanalysis overwrites previous result
  const saved = await prisma.resumeAnalysis.upsert({
    where: { applicationId },
    update: {
      suggestions: JSON.stringify([]),
      matchScore: parsed.matchScore,
      strongestPoints: JSON.stringify(parsed.strongestPoints),
      redFlags: JSON.stringify(parsed.redFlags),
      recruiterTake: parsed.recruiterTake,
      missingKeywords: JSON.stringify(missingKeywords)
    },
    create: {
      suggestions: JSON.stringify([]),
      applicationId,
      matchScore: parsed.matchScore,
      strongestPoints: JSON.stringify(parsed.strongestPoints),
      redFlags: JSON.stringify(parsed.redFlags),
      recruiterTake: parsed.recruiterTake,
      missingKeywords: JSON.stringify(missingKeywords)
    }
  })

  return {
    
    ...saved,
    missingKeywords: JSON.parse(saved.missingKeywords),
    strongestPoints: JSON.parse(saved.strongestPoints),
    redFlags: JSON.parse(saved.redFlags),
    suggestions: JSON.parse(saved.suggestions)
  }
}

// --- Get saved analysis ---
export const getResumeAnalysis = async (
  userId: string,
  applicationId: string
) => {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId }
  })

  if (!application) {
    throw new Error("Application not found.")
  }

  const analysis = await prisma.resumeAnalysis.findUnique({
    where: { applicationId }
  })

  if (!analysis) return null

  return {
    ...analysis,
    missingKeywords: JSON.parse(analysis.missingKeywords),
    strongestPoints: JSON.parse(analysis.strongestPoints),
    redFlags: JSON.parse(analysis.redFlags)
  }
}