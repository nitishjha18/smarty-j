"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = exports.getResumeAnalysis = exports.analyzeResume = void 0;
const gemini_1 = require("../../config/gemini");
const db_1 = __importDefault(require("../../config/db"));
const logger_1 = require("../../config/logger");
const AppError_1 = require("../../utils/AppError");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return AppError_1.AppError; } });
const STOP_WORDS = new Set([
    "the", "and", "with", "you", "will", "for", "are", "this",
    "that", "have", "from", "they", "your", "which", "when",
    "our", "can", "been", "has", "its", "not", "but", "all",
    "who", "we", "in", "to", "of", "a", "an", "is", "be",
    "as", "at", "or", "on", "by", "it", "if", "do", "so",
    "up", "out", "use", "any", "may", "new", "also", "work",
    "role", "team", "good", "well", "able", "must", "join",
    "using", "used", "help", "build", "strong", "about", "such"
]);
const extractKeywords = (text) => {
    const words = text
        .replace(/[^a-zA-Z0-9+#.\-/]/g, " ")
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 2)
        .filter(w => !STOP_WORDS.has(w.toLowerCase()));
    const unique = [...new Set(words.map(w => w.toLowerCase()))];
    return unique;
};
const getMissingKeywords = (jobDescription, resumeText) => {
    const jdKeywords = extractKeywords(jobDescription);
    const resumeLower = resumeText.toLowerCase();
    return jdKeywords
        .filter(keyword => !resumeLower.includes(keyword))
        .slice(0, 10);
};
const AI_UNAVAILABLE_MESSAGE = "AI analysis is temporarily unavailable. Please try again in a moment.";
const isConfigError = (err) => {
    const anyErr = err;
    const status = anyErr?.status ?? anyErr?.statusCode ?? anyErr?.response?.status;
    if (status === 401 || status === 403)
        return true;
    const msg = String(anyErr?.message || "").toLowerCase();
    return (msg.includes("api key") ||
        msg.includes("api_key") ||
        msg.includes("permission denied"));
};
const callGemini = async (prompt) => {
    let text;
    try {
        const result = await gemini_1.geminiModel.generateContent(prompt);
        text = result.response.text();
    }
    catch (err) {
        if (isConfigError(err)) {
            logger_1.logger.error({ err }, "Gemini API key is missing, invalid, or lacks permission — check GEMINI_API_KEY configuration");
        }
        else {
            logger_1.logger.error({ err }, "Gemini request failed");
        }
        throw (0, AppError_1.serviceUnavailable)(AI_UNAVAILABLE_MESSAGE);
    }
    const clean = text.replace(/```json|```/g, "").trim();
    let parsed;
    try {
        parsed = JSON.parse(clean);
    }
    catch (err) {
        logger_1.logger.error({ err, raw: text }, "Gemini returned invalid JSON");
        throw (0, AppError_1.serviceUnavailable)(AI_UNAVAILABLE_MESSAGE);
    }
    if (typeof parsed?.matchScore !== "number" ||
        !Array.isArray(parsed?.strongestPoints) ||
        !Array.isArray(parsed?.redFlags) ||
        typeof parsed?.recruiterTake !== "string") {
        logger_1.logger.error({ parsed }, "Gemini response missing expected fields");
        throw (0, AppError_1.serviceUnavailable)(AI_UNAVAILABLE_MESSAGE);
    }
    return parsed;
};
const analyzeResume = async (userId, applicationId) => {
    const user = await db_1.default.user.findUnique({
        where: { id: userId }
    });
    if (!user?.resumeText) {
        throw (0, AppError_1.badRequest)("Resume not found. Please upload your resume first.");
    }
    const application = await db_1.default.application.findFirst({
        where: { id: applicationId, userId }
    });
    if (!application) {
        throw (0, AppError_1.notFound)("Application not found.");
    }
    if (!application.jobDescription) {
        throw (0, AppError_1.badRequest)("No job description found for this application.");
    }
    const missingKeywords = getMissingKeywords(application.jobDescription, user.resumeText);
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
`;
    const parsed = await callGemini(prompt);
    const saved = await db_1.default.resumeAnalysis.upsert({
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
    });
    return {
        ...saved,
        missingKeywords: JSON.parse(saved.missingKeywords),
        strongestPoints: JSON.parse(saved.strongestPoints),
        redFlags: JSON.parse(saved.redFlags),
        suggestions: JSON.parse(saved.suggestions)
    };
};
exports.analyzeResume = analyzeResume;
const getResumeAnalysis = async (userId, applicationId) => {
    const application = await db_1.default.application.findFirst({
        where: { id: applicationId, userId }
    });
    if (!application) {
        throw (0, AppError_1.notFound)("Application not found.");
    }
    const analysis = await db_1.default.resumeAnalysis.findUnique({
        where: { applicationId }
    });
    if (!analysis)
        return null;
    return {
        ...analysis,
        missingKeywords: JSON.parse(analysis.missingKeywords),
        strongestPoints: JSON.parse(analysis.strongestPoints),
        redFlags: JSON.parse(analysis.redFlags),
        suggestions: JSON.parse(analysis.suggestions)
    };
};
exports.getResumeAnalysis = getResumeAnalysis;
