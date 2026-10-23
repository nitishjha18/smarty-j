import { Resend } from "resend"
import { logger } from "../config/logger"

const resend = new Resend(process.env.RESEND_API_KEY!)

export const sendReminderEmail = async (
  toEmail: string,
  userName: string,
  companyName: string,
  jobTitle: string,
  notes: string | null
) => {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: toEmail,
    subject: `Reminder — ${jobTitle} at ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4F46E5; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">ApplynTrack Reminder</h1>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e5e5;">
          <p style="color: #333;">Hi <strong>${userName}</strong>,</p>
          <p style="color: #333;">You have a reminder today for your job application:</p>
          <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #4F46E5; margin: 16px 0;">
            <p style="margin: 4px 0; color: #555;"><strong>Role:</strong> ${jobTitle}</p>
            <p style="margin: 4px 0; color: #555;"><strong>Company:</strong> ${companyName}</p>
            ${notes ? `<p style="margin: 4px 0; color: #555;"><strong>Note:</strong> ${notes}</p>` : ""}
          </div>
          <p style="color: #333;">Good luck! 🚀</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;">
          <p style="color: #999; font-size: 12px;">— ApplynTrack Team</p>
        </div>
      </div>
    `
  })

  if (error) {
    logger.error({ err: error }, "Email send error")
    throw new Error("Failed to send email")
  }

  return data
}
