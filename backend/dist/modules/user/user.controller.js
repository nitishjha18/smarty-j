"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileController = exports.uploadResumeController = exports.uploadMiddleware = exports.getProfileController = exports.syncUserController = void 0;
const express_1 = require("@clerk/express");
const multer_1 = __importDefault(require("multer"));
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../config/logger");
const AppError_1 = require("../../utils/AppError");
const user_service_1 = require("./user.service");
const PDFParser = require("pdf2json");
const syncUserController = async (req, res) => {
    const { userId } = (0, express_1.getAuth)(req);
    if (!userId) {
        throw (0, AppError_1.unauthorized)("Unauthorized");
    }
    const clerkUser = await express_1.clerkClient.users.getUser(userId);
    const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;
    if (!primaryEmail) {
        throw (0, AppError_1.badRequest)("Clerk user has no email address");
    }
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        primaryEmail;
    const user = await (0, user_service_1.syncUser)(userId, name, primaryEmail, clerkUser.imageUrl);
    res.status(200).json({ user });
};
exports.syncUserController = syncUserController;
const getProfileController = async (req, res) => {
    const { userId } = (0, express_1.getAuth)(req);
    if (!userId) {
        throw (0, AppError_1.unauthorized)("Unauthorized");
    }
    const user = await (0, user_service_1.getUserByClerkId)(userId);
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.status(200).json({ user });
};
exports.getProfileController = getProfileController;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: MAX_RESUME_BYTES },
});
exports.uploadMiddleware = upload.single("resume");
const extractPdfText = (buffer) => new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
        try {
            let text = "";
            pdfData.Pages.forEach((page) => {
                page.Texts.forEach((textItem) => {
                    textItem.R.forEach((r) => {
                        try {
                            text += decodeURIComponent(r.T) + " ";
                        }
                        catch {
                            text += r.T + " ";
                        }
                    });
                });
                text += "\n";
            });
            resolve(text.trim());
        }
        catch (err) {
            reject(err);
        }
    });
    pdfParser.on("pdfParser_dataError", (error) => {
        reject(error);
    });
    pdfParser.parseBuffer(buffer);
});
const uploadResumeController = async (req, res) => {
    if (!req.file) {
        throw (0, AppError_1.badRequest)("No file uploaded");
    }
    if (req.file.mimetype !== "application/pdf") {
        throw (0, AppError_1.badRequest)("Only PDF files are allowed");
    }
    const user = req.user;
    let resumeText;
    try {
        resumeText = await extractPdfText(req.file.buffer);
    }
    catch (err) {
        logger_1.logger.warn({ err: err instanceof Error ? err : { value: err } }, "pdf2json failed to parse PDF");
        throw (0, AppError_1.badRequest)("Could not read this PDF. Please upload a different file.");
    }
    if (!resumeText.trim()) {
        throw (0, AppError_1.badRequest)("No readable text found in this PDF. Please upload a text-based PDF, not a scanned image.");
    }
    const filePath = `${user.id}/resume.pdf`;
    const { error } = await supabase_1.supabase.storage
        .from("resumes")
        .upload(filePath, req.file.buffer, {
        contentType: "application/pdf",
        upsert: true,
    });
    if (error) {
        logger_1.logger.error({ err: error }, "Supabase storage upload failed");
        throw new AppError_1.AppError(500, "Failed to upload to storage");
    }
    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/resumes/${filePath}`;
    const updatedUser = await (0, user_service_1.updateResumeUrl)(user.id, publicUrl, resumeText);
    res.status(200).json({
        message: "Resume uploaded successfully",
        resumeUrl: updatedUser.resumeUrl,
        resumeText: updatedUser.resumeText,
    });
};
exports.uploadResumeController = uploadResumeController;
const updateProfileController = async (req, res) => {
    const user = req.user;
    const { name, targetRole, experienceLevel } = req.body;
    const updatedUser = await (0, user_service_1.updateUserProfile)(user.id, {
        name,
        targetRole,
        experienceLevel
    });
    res.status(200).json({ user: updatedUser });
};
exports.updateProfileController = updateProfileController;
