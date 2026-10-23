import { Request, Response } from "express";
import {
  createApplication,
  deleteApplication,
  getAllApplications,
  getApplicationById,
  updateApplication,
} from "./applications.service";
import { badRequest } from "../../utils/AppError";

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

const getLocalUserId = (req: AuthenticatedRequest): string => {
  return req.user.id;
};

export const createApplicationController = async (
  req: Request,
  res: Response,
) => {
  const userId = getLocalUserId(req as AuthenticatedRequest);

  const {
    companyName,
    companyDomain,
    jobTitle,
    jobDescription,
    source,
    notes,
    dateApplied,
  } = req.body;

  if (!companyName || !jobTitle || !source) {
    throw badRequest("companyName, jobTitle, and source are required");
  }

  const application = await createApplication(userId, {
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

export const getAllApplicationsController = async (
  req: Request,
  res: Response,
) => {
  const userId = getLocalUserId(req as AuthenticatedRequest);
  const applications = await getAllApplications(userId);
  res.status(200).json({ applications });
};

export const getApplicationByIdController = async (
  req: Request,
  res: Response,
) => {
  const userId = getLocalUserId(req as AuthenticatedRequest);
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const application = await getApplicationById(userId, id);
  res.status(200).json({ application });
};

export const updateApplicationController = async (
  req: Request,
  res: Response,
) => {
  const userId = getLocalUserId(req as AuthenticatedRequest);
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const {
    companyName,
    companyDomain,
    jobTitle,
    jobDescription,
    source,
    status,
    notes,
    dateApplied,
  } = req.body;

  const application = await updateApplication(userId, id, {
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

export const deleteApplicationController = async (
  req: Request,
  res: Response,
) => {
  const userId = getLocalUserId(req as AuthenticatedRequest);
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await deleteApplication(userId, id);
  res.status(200).json(result);
};
