"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteApplicationController = exports.updateApplicationController = exports.getApplicationByIdController = exports.getAllApplicationsController = exports.createApplicationController = void 0;
const applications_service_1 = require("./applications.service");
const AppError_1 = require("../../utils/AppError");
const getLocalUserId = (req) => {
    return req.user.id;
};
const createApplicationController = async (req, res) => {
    const userId = getLocalUserId(req);
    const { companyName, companyDomain, jobTitle, jobDescription, source, notes, dateApplied, } = req.body;
    if (!companyName || !jobTitle || !source) {
        throw (0, AppError_1.badRequest)("companyName, jobTitle, and source are required");
    }
    const application = await (0, applications_service_1.createApplication)(userId, {
        companyName,
        companyDomain: companyDomain || undefined,
        jobTitle,
        jobDescription,
        source,
        notes,
        dateApplied: dateApplied ? new Date(dateApplied) : undefined,
    });
    res.status(201).json({ application });
};
exports.createApplicationController = createApplicationController;
const getAllApplicationsController = async (req, res) => {
    const userId = getLocalUserId(req);
    const applications = await (0, applications_service_1.getAllApplications)(userId);
    res.status(200).json({ applications });
};
exports.getAllApplicationsController = getAllApplicationsController;
const getApplicationByIdController = async (req, res) => {
    const userId = getLocalUserId(req);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const application = await (0, applications_service_1.getApplicationById)(userId, id);
    res.status(200).json({ application });
};
exports.getApplicationByIdController = getApplicationByIdController;
const updateApplicationController = async (req, res) => {
    const userId = getLocalUserId(req);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { companyName, companyDomain, jobTitle, jobDescription, source, status, notes, dateApplied, } = req.body;
    const application = await (0, applications_service_1.updateApplication)(userId, id, {
        companyName,
        companyDomain: companyDomain || undefined,
        jobTitle,
        jobDescription,
        source,
        status,
        notes,
        dateApplied: dateApplied ? new Date(dateApplied) : undefined,
    });
    res.status(200).json({ application });
};
exports.updateApplicationController = updateApplicationController;
const deleteApplicationController = async (req, res) => {
    const userId = getLocalUserId(req);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await (0, applications_service_1.deleteApplication)(userId, id);
    res.status(200).json(result);
};
exports.deleteApplicationController = deleteApplicationController;
