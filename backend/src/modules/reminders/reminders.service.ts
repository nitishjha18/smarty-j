import prisma from "../../config/db"
import { notFound } from "../../utils/AppError"

export const createReminder = async (
  userId: string,
  applicationId: string,
  reminderDate: Date,
  notes?: string
) => {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId }
  })

  if (!application) {
    throw notFound("Application not found.")
  }

  const reminder = await prisma.reminder.create({
    data: {
      userId,
      applicationId,
      reminderDate,
      notes
    }
  })

  return reminder
}

export const updateReminder = async (
  userId: string,
  reminderId: string,
  reminderDate: Date,
  notes?: string
) => {
  const existing = await prisma.reminder.findFirst({
    where: { id: reminderId, userId }
  })

  if (!existing) {
    throw notFound("Reminder not found.")
  }

  return prisma.reminder.update({
    where: { id: reminderId },
    data: { reminderDate, notes }
  })
}

export const deleteReminder = async (userId: string, reminderId: string) => {
  const existing = await prisma.reminder.findFirst({
    where: { id: reminderId, userId }
  })

  if (!existing) {
    throw notFound("Reminder not found.")
  }

  await prisma.reminder.delete({
    where: { id: reminderId }
  })

  return { message: "Reminder deleted successfully" }
}
