"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const client_1 = require("@prisma/client");
const multer_1 = require("multer");
const AppError_1 = require("../utils/AppError");
const isJsonParseError = (err) => err instanceof SyntaxError && err.type === "entity.parse.failed";
const notFoundHandler = (_req, res) => {
    res.status(404).json({ error: "Route not found" });
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (err, req, res, _next) => {
    const log = req.log ?? console;
    const userId = req.user?.id;
    const base = { method: req.method, path: req.originalUrl, userId };
    let status = 500;
    let message = "Internal server error";
    if (err instanceof AppError_1.AppError) {
        status = err.statusCode;
        message = err.message;
    }
    else if (isJsonParseError(err)) {
        status = 400;
        message = "Invalid JSON in request body";
    }
    else if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        status = 400;
        message = "Invalid request data";
    }
    else if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025") {
            status = 404;
            message = "Resource not found";
        }
        else if (err.code === "P2002") {
            status = 409;
            message = "Resource already exists";
        }
        else if (err.code === "P2003") {
            status = 400;
            message = "Invalid request data";
        }
    }
    else if (err instanceof multer_1.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            status = 413;
            message = "File is too large. Maximum size is 5 MB.";
        }
        else {
            status = 400;
            message = "Invalid file upload";
        }
    }
    if (status >= 500) {
        log.error({ ...base, err }, "request failed");
    }
    else {
        log.warn({ ...base, status, message }, "request error");
    }
    res.status(status).json({ error: message });
};
exports.errorHandler = errorHandler;
