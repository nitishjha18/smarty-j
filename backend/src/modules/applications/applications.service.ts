import {
  ApplicationSource,
  ApplicationStatus,
  Prisma,
} from "@prisma/client";
import prisma from "../../config/db";

type CreateApplicationInput = {
  companyName: string;
  companyDomain?: string;
  jobTitle: string;
  jobDescription?: string;
  source: ApplicationSource;
  notes?: string;
  dateApplied?: Date;
};

type UpdateApplicationInput = {
  companyName?: string;
  companyDomain?: string;
  jobTitle?: string;
  jobDescription?: string;
  source?: ApplicationSource;
  status?: ApplicationStatus;
  notes?: string;
  dateApplied?: Date;
};

export const createApplication = async (
  userId: string,
  data: CreateApplicationInput,
) => {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
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
        status: ApplicationStatus.APPLIED,
      },
    });

    await tx.statusHistory.create({
      data: {
        applicationId: application.id,
        status: ApplicationStatus.APPLIED,
        createdAt: now,
      },
    });

    return application;
  });
};

export const getAllApplications = async (userId: string) => {
  return prisma.application.findMany({
    where: { userId },
    orderBy: { dateApplied: "desc" },
    include: {
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
};

export const getApplicationById = async (
  userId: string,
  applicationId: string,
) => {
  const application = await prisma.application.findFirst({
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
    throw new Error("Application not found");
  }

  return application;
};

export const updateApplication = async (
  userId: string,
  applicationId: string,
  data: UpdateApplicationInput,
) => {
  const existing = await prisma.application.findFirst({
    where: {
      id: applicationId,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Application not found");
  }

  const shouldCreateStatusHistory =
    data.status !== undefined && data.status !== existing.status;

  return prisma.$transaction(async (tx) => {
    const updateData: Prisma.ApplicationUpdateManyMutationInput = {};

    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.companyDomain !== undefined)
      updateData.companyDomain = data.companyDomain;
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
    if (data.jobDescription !== undefined)
      updateData.jobDescription = data.jobDescription;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.dateApplied !== undefined) updateData.dateApplied = data.dateApplied;

    const updateResult = await tx.application.updateMany({
      where: {
        id: applicationId,
        userId,
      },
      data: updateData,
    });

    if (updateResult.count === 0) {
      throw new Error("Application not found");
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
      throw new Error("Application not found");
    }

    return updatedApplication;
  });
};

export const deleteApplication = async (userId: string, applicationId: string) => {
  const existing = await prisma.application.findFirst({
    where: {
      id: applicationId,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Application not found");
  }

  await prisma.$transaction(async (tx) => {
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
      throw new Error("Application not found");
    }
  });

  return { message: "Application deleted successfully" };
};
