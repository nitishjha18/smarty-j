import cron from "node-cron"
import prisma from "../config/db"
import { logger } from "../config/logger"
import { sendReminderEmail } from "../utils/email"

export const startReminderJob = () => {
  cron.schedule("0 9 * * *", async () => {
    logger.info("Running daily reminder job")

    try {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      const tomorrow = new Date(today)
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

      const reminders = await prisma.reminder.findMany({
        where: {
          reminderDate: {
            gte: today,
            lt: tomorrow
          },
          isSent: false
        },
        include: {
          user: true,
          application: true
        }
      })

      logger.info({ count: reminders.length }, "Reminders to send")

      for (const reminder of reminders) {
        try {
          await sendReminderEmail(
            reminder.user.email,
            reminder.user.name,
            reminder.application.companyName,
            reminder.application.jobTitle,
            reminder.notes ?? null
          )

          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { isSent: true }
          })

          logger.info({ reminderId: reminder.id, to: reminder.user.email }, "Reminder sent")
        } catch (err) {
          logger.error({ err, reminderId: reminder.id }, "Failed to send reminder")
        }
      }
    } catch (err) {
      logger.error({ err }, "Reminder job failed")
    }
  })

  logger.info("Reminder cron job scheduled — runs daily at 9am")
}
