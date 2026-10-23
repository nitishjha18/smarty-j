"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResumeAnalysisController = exports.analyzeResumeController = void 0;
const ai_service_1 = require("./ai.service");
const AppError_1 = require("../../utils/AppError");
const analyzeResumeController = async (req, res) => {
    const user = req.user;
    const { applicationId } = req.body;
    if (!applicationId) {
        throw (0, AppError_1.badRequest)("applicationId is required");
    }
    const result = await (0, ai_service_1.analyzeResume)(user.id, applicationId);
    res.status(200).json({ analysis: result });
};
exports.analyzeResumeController = analyzeResumeController;
const getResumeAnalysisController = async (req, res) => {
    const user = req.user;
    const appId = req.params.appId;
    const result = await (0, ai_service_1.getResumeAnalysis)(user.id, appId);
    res.status(200).json({ analysis: result });
};
exports.getResumeAnalysisController = getResumeAnalysisController;
