"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserProfile = exports.updateResumeUrl = exports.getUserByClerkId = exports.syncUser = void 0;
const db_1 = __importDefault(require("../../config/db"));
const syncUser = async (clerkId, name, email, profilePicture) => {
    const existingUser = await db_1.default.user.findUnique({
        where: { clerkId },
    });
    if (existingUser)
        return existingUser;
    const newUser = await db_1.default.user.create({
        data: {
            clerkId,
            name,
            email,
            profilePicture,
        },
    });
    return newUser;
};
exports.syncUser = syncUser;
const getUserByClerkId = async (clerkId) => {
    return await db_1.default.user.findUnique({
        where: { clerkId },
    });
};
exports.getUserByClerkId = getUserByClerkId;
const updateResumeUrl = async (userId, resumeUrl, resumeText) => {
    // Delete all saved resume analyses for this user's applications
    // so they get fresh analysis against the new resume
    await db_1.default.resumeAnalysis.deleteMany({
        where: {
            application: {
                userId
            }
        }
    });
    return db_1.default.user.update({
        where: { id: userId },
        data: { resumeUrl, resumeText },
    });
};
exports.updateResumeUrl = updateResumeUrl;
const updateUserProfile = async (userId, data) => {
    return db_1.default.user.update({
        where: { id: userId },
        data
    });
};
exports.updateUserProfile = updateUserProfile;
