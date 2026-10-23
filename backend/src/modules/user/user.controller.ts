import { Request, Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import multer from "multer";
import { supabase } from "../../config/supabase";
import { logger } from "../../config/logger";
import { AppError, badRequest, unauthorized } from "../../utils/AppError";
import { syncUser, getUserByClerkId, updateResumeUrl, updateUserProfile } from "./user.service"
const PDFParser = require("pdf2json");

export const syncUserController = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    throw unauthorized("Unauthorized");
  }

  const clerkUser = await clerkClient.users.getUser(userId);
  const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    throw badRequest("Clerk user has no email address");
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    primaryEmail;

  const user = await syncUser(
    userId,
    name,
    primaryEmail,
    clerkUser.imageUrl,
  );

  res.status(200).json({ user });
};

export const getProfileController = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    throw unauthorized("Unauthorized");
  }

  const user = await getUserByClerkId(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.status(200).json({ user });
};

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES },
});
export const uploadMiddleware = upload.single("resume");

const extractPdfText = (buffer: Buffer): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        let text = ""
        pdfData.Pages.forEach((page: any) => {
          page.Texts.forEach((textItem: any) => {
            textItem.R.forEach((r: any) => {
              try { text += decodeURIComponent(r.T) + " " } catch { text += r.T + " " }
            })
          })
          text += "\n"
        })
        resolve(text.trim())
      } catch (err) {
        reject(err)
      }
    })

    pdfParser.on("pdfParser_dataError", (error: any) => {
      reject(error)
    })

    pdfParser.parseBuffer(buffer)
  })

export const uploadResumeController = async (req: Request, res: Response) => {
  if (!req.file) {
    throw badRequest("No file uploaded");
  }

  if (req.file.mimetype !== "application/pdf") {
    throw badRequest("Only PDF files are allowed");
  }

  const user = (req as any).user;

  let resumeText: string;
  try {
    resumeText = await extractPdfText(req.file.buffer);
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err : { value: err } }, "pdf2json failed to parse PDF");
    throw badRequest("Could not read this PDF. Please upload a different file.");
  }

  if (!resumeText.trim()) {
    throw badRequest(
      "No readable text found in this PDF. Please upload a text-based PDF, not a scanned image."
    );
  }

  const filePath = `${user.id}/resume.pdf`;

  const { error } = await supabase.storage
    .from("resumes")
    .upload(filePath, req.file.buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    logger.error({ err: error }, "Supabase storage upload failed");
    throw new AppError(500, "Failed to upload to storage");
  }

  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/resumes/${filePath}`;

  const updatedUser = await updateResumeUrl(user.id, publicUrl, resumeText);

  res.status(200).json({
    message: "Resume uploaded successfully",
    resumeUrl: updatedUser.resumeUrl,
    resumeText: updatedUser.resumeText,
  });
};

export const updateProfileController = async (req: Request, res: Response) => {
  const user = (req as any).user
  const { name, targetRole, experienceLevel } = req.body

  const updatedUser = await updateUserProfile(user.id, {
    name,
    targetRole,
    experienceLevel
  })

  res.status(200).json({ user: updatedUser })
}
