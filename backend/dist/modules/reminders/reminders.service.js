"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReminder = exports.updateReminder = exports.createReminder = void 0;
const db_1 = __importDefault(require("../../config/db"));
const AppError_1 = require("../../utils/AppError");
const createReminder = async (userId, applicationId, reminderDate, notes) => {
    const application = await db_1.default.application.findFirst({
        where: { id: applicationId, userId }
    });
    if (!application) {
        throw (0, AppError_1.notFound)("Application not found.");
    }
    const reminder = await db_1.default.reminder.create({
        data: {
            userId,
            applicationId,
            reminderDate,
            notes
        }
    });
    return reminder;
};
exports.createReminder = createReminder;
const updateReminder = async (userId, reminderId, reminderDate, notes) => {
    const existing = await db_1.default.reminder.findFirst({
        where: { id: reminderId, userId }
    });
    if (!existing) {
        throw (0, AppError_1.notFound)("Reminder not found.");
    }
    return db_1.default.reminder.update({
        where: { id: reminderId },
        data: { reminderDate, notes }
    });
};
exports.updateReminder = updateReminder;
const deleteReminder = async (userId, reminderId) => {
    const existing = await db_1.default.reminder.findFirst({
        where: { id: reminderId, userId }
    });
    if (!existing) {
        throw (0, AppError_1.notFound)("Reminder not found.");
    }
    await db_1.default.reminder.delete({
        where: { id: reminderId }
    });
    return { message: "Reminder deleted successfully" };
};
exports.deleteReminder = deleteReminder;
