"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReminderJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = __importDefault(require("../config/db"));
const logger_1 = require("../config/logger");
const email_1 = require("../utils/email");
const startReminderJob = () => {
    node_cron_1.default.schedule("0 9 * * *", async () => {
        logger_1.logger.info("Running daily reminder job");
        try {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            const reminders = await db_1.default.reminder.findMany({
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
            });
            logger_1.logger.info({ count: reminders.length }, "Reminders to send");
            for (const reminder of reminders) {
                try {
                    await (0, email_1.sendReminderEmail)(reminder.user.email, reminder.user.name, reminder.application.companyName, reminder.application.jobTitle, reminder.notes ?? null);
                    await db_1.default.reminder.update({
                        where: { id: reminder.id },
                        data: { isSent: true }
                    });
                    logger_1.logger.info({ reminderId: reminder.id, to: reminder.user.email }, "Reminder sent");
                }
                catch (err) {
                    logger_1.logger.error({ err, reminderId: reminder.id }, "Failed to send reminder");
                }
            }
        }
        catch (err) {
            logger_1.logger.error({ err }, "Reminder job failed");
        }
    });
    logger_1.logger.info("Reminder cron job scheduled — runs daily at 9am");
};
exports.startReminderJob = startReminderJob;
