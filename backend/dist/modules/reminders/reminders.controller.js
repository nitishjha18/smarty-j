"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReminderController = exports.updateReminderController = exports.createReminderController = void 0;
const reminders_service_1 = require("./reminders.service");
const AppError_1 = require("../../utils/AppError");
const createReminderController = async (req, res) => {
    const user = req.user;
    const { applicationId, reminderDate, notes } = req.body;
    if (!applicationId || !reminderDate) {
        throw (0, AppError_1.badRequest)("applicationId and reminderDate are required");
    }
    const reminder = await (0, reminders_service_1.createReminder)(user.id, applicationId, new Date(reminderDate), notes);
    res.status(201).json({ reminder });
};
exports.createReminderController = createReminderController;
const updateReminderController = async (req, res) => {
    const user = req.user;
    const reminderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reminderDate, notes } = req.body;
    if (!reminderDate) {
        throw (0, AppError_1.badRequest)("reminderDate is required");
    }
    const reminder = await (0, reminders_service_1.updateReminder)(user.id, reminderId, new Date(reminderDate), notes);
    res.status(200).json({ reminder });
};
exports.updateReminderController = updateReminderController;
const deleteReminderController = async (req, res) => {
    const user = req.user;
    const reminderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await (0, reminders_service_1.deleteReminder)(user.id, reminderId);
    res.status(200).json(result);
};
exports.deleteReminderController = deleteReminderController;
