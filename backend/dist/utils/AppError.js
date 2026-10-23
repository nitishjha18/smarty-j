"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceUnavailable = exports.conflict = exports.notFound = exports.unauthorized = exports.badRequest = exports.AppError = void 0;
class AppError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AppError";
    }
}
exports.AppError = AppError;
const badRequest = (message) => new AppError(400, message);
exports.badRequest = badRequest;
const unauthorized = (message) => new AppError(401, message);
exports.unauthorized = unauthorized;
const notFound = (message) => new AppError(404, message);
exports.notFound = notFound;
const conflict = (message) => new AppError(409, message);
exports.conflict = conflict;
const serviceUnavailable = (message) => new AppError(503, message);
exports.serviceUnavailable = serviceUnavailable;
