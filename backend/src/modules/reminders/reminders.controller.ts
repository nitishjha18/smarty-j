import { Request, Response } from "express"
import { createReminder, updateReminder, deleteReminder } from "./reminders.service"
import { badRequest } from "../../utils/AppError"

export const createReminderController = async (req: Request, res: Response) => {
  const user = (req as any).user
  const { applicationId, reminderDate, notes } = req.body

  if (!applicationId || !reminderDate) {
    throw badRequest("applicationId and reminderDate are required")
  }

  const reminder = await createReminder(
    user.id,
    applicationId,
    new Date(reminderDate),
    notes
  )

  res.status(201).json({ reminder })
}

export const updateReminderController = async (req: Request, res: Response) => {
  const user = (req as any).user
  const reminderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  const { reminderDate, notes } = req.body

  if (!reminderDate) {
    throw badRequest("reminderDate is required")
  }

  const reminder = await updateReminder(
    user.id,
    reminderId,
    new Date(reminderDate),
    notes
  )

  res.status(200).json({ reminder })
}

export const deleteReminderController = async (req: Request, res: Response) => {
  const user = (req as any).user
  const reminderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

  const result = await deleteReminder(user.id, reminderId)
  res.status(200).json(result)
}
