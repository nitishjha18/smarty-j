import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import { AppError } from "../utils/AppError";

const isJsonParseError = (err: unknown): err is SyntaxError & { type?: string; status?: number } =>
  err instanceof SyntaxError && (err as any).type === "entity.parse.failed";

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const log = (req as any).log ?? console;
  const userId = (req as any).user?.id;
  const base = { method: req.method, path: req.originalUrl, userId };

  let status = 500;
  let message = "Internal server error";

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
  } else if (isJsonParseError(err)) {
    status = 400;
    message = "Invalid JSON in request body";
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    status = 400;
    message = "Invalid request data";
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      status = 404;
      message = "Resource not found";
    } else if (err.code === "P2002") {
      status = 409;
      message = "Resource already exists";
    } else if (err.code === "P2003") {
      status = 400;
      message = "Invalid request data";
    }
  } else if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      status = 413;
      message = "File is too large. Maximum size is 5 MB.";
    } else {
      status = 400;
      message = "Invalid file upload";
    }
  }

  if (status >= 500) {
    log.error({ ...base, err }, "request failed");
  } else {
    log.warn({ ...base, status, message }, "request error");
  }

  res.status(status).json({ error: message });
};
