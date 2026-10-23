"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteApplication = exports.updateApplication = exports.getApplicationById = exports.getAllApplications = exports.createApplication = void 0;
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../../config/db"));
const AppError_1 = require("../../utils/AppError");
const createApplication = async (userId, data) => {
    const now = new Date();
    return db_1.default.$transaction(async (tx) => {
        const application = await tx.application.create({
            data: {
                userId,
                companyName: data.companyName,
                companyDomain: data.companyDomain,
                jobTitle: data.jobTitle,
                jobDescription: data.jobDescription ?? "",
                source: data.source,
                notes: data.notes,
                dateApplied: data.dateApplied ?? now,
                status: client_1.ApplicationStatus.APPLIED,
            },
        });
        await tx.statusHistory.create({
            data: {
                applicationId: application.id,
                status: client_1.ApplicationStatus.APPLIED,
                createdAt: now,
            },
        });
        return application;
    });
};
exports.createApplication = createApplication;
const getAllApplications = async (userId) => {
    return db_1.default.application.findMany({
        where: { userId },
        orderBy: { dateApplied: "desc" },
        include: {
            statusHistory: {
                orderBy: { createdAt: "desc" },
            },
        },
    });
};
exports.getAllApplications = getAllApplications;
const getApplicationById = async (userId, applicationId) => {
    const application = await db_1.default.application.findFirst({
        where: {
            id: applicationId,
            userId,
        },
        include: {
            statusHistory: {
                orderBy: { createdAt: "desc" },
            },
        },
    });
    if (!application) {
        throw (0, AppError_1.notFound)("Application not found");
    }
    return application;
};
exports.getApplicationById = getApplicationById;
const updateApplication = async (userId, applicationId, data) => {
    const existing = await db_1.default.application.findFirst({
        where: {
            id: applicationId,
            userId,
        },
    });
    if (!existing) {
        throw (0, AppError_1.notFound)("Application not found");
    }
    const shouldCreateStatusHistory = data.status !== undefined && data.status !== existing.status;
    return db_1.default.$transaction(async (tx) => {
        const updateData = {};
        if (data.companyName !== undefined)
            updateData.companyName = data.companyName;
        if (data.companyDomain !== undefined)
            updateData.companyDomain = data.companyDomain;
        if (data.jobTitle !== undefined)
            updateData.jobTitle = data.jobTitle;
        if (data.jobDescription !== undefined)
            updateData.jobDescription = data.jobDescription;
        if (data.source !== undefined)
            updateData.source = data.source;
        if (data.status !== undefined)
            updateData.status = data.status;
        if (data.notes !== undefined)
            updateData.notes = data.notes;
        if (data.dateApplied !== undefined)
            updateData.dateApplied = data.dateApplied;
        const updateResult = await tx.application.updateMany({
            where: {
                id: applicationId,
                userId,
            },
            data: updateData,
        });
        if (updateResult.count === 0) {
            throw (0, AppError_1.notFound)("Application not found");
        }
        if (shouldCreateStatusHistory && data.status) {
            await tx.statusHistory.create({
                data: {
                    applicationId,
                    status: data.status,
                    createdAt: new Date(),
                },
            });
        }
        const updatedApplication = await tx.application.findFirst({
            where: {
                id: applicationId,
                userId,
            },
            include: {
                statusHistory: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!updatedApplication) {
            throw (0, AppError_1.notFound)("Application not found");
        }
        return updatedApplication;
    });
};
exports.updateApplication = updateApplication;
const deleteApplication = async (userId, applicationId) => {
    const existing = await db_1.default.application.findFirst({
        where: {
            id: applicationId,
            userId,
        },
    });
    if (!existing) {
        throw (0, AppError_1.notFound)("Application not found");
    }
    await db_1.default.$transaction(async (tx) => {
        await tx.statusHistory.deleteMany({
            where: {
                applicationId,
                application: {
                    userId,
                },
            },
        });
        const deleteResult = await tx.application.deleteMany({
            where: {
                id: applicationId,
                userId,
            },
        });
        if (deleteResult.count === 0) {
            throw (0, AppError_1.notFound)("Application not found");
        }
    });
    return { message: "Application deleted successfully" };
};
exports.deleteApplication = deleteApplication;
