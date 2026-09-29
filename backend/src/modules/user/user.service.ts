import prisma from "../../config/db";

export const syncUser = async (
  clerkId: string,
  name: string,
  email: string,
  profilePicture?: string,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (existingUser) return existingUser;

  const newUser = await prisma.user.create({
    data: {
      clerkId,
      name,
      email,
      profilePicture,
    },
  });

  return newUser;
};

export const getUserByClerkId = async (clerkId: string) => {
  return await prisma.user.findUnique({
    where: { clerkId },
  });
};

export const updateResumeUrl = async (
  userId: string,
  resumeUrl: string,
  resumeText: string,
) => {
  // Delete all saved resume analyses for this user's applications
  // so they get fresh analysis against the new resume
  await prisma.resumeAnalysis.deleteMany({
    where: {
      application: {
        userId
      }
    }
  })

  return prisma.user.update({
    where: { id: userId },
    data: { resumeUrl, resumeText },
  });
};

export const updateUserProfile = async (
  userId: string,
  data: {
    name?: string;
    targetRole?: string;
    experienceLevel?: string;
  }
) => {
  return prisma.user.update({
    where: { id: userId },
    data
  })
}