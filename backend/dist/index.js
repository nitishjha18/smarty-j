"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const pino_http_1 = __importDefault(require("pino-http"));
const crypto_1 = require("crypto");
const auth_1 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./config/logger");
const user_routes_1 = __importDefault(require("./modules/user/user.routes"));
const applications_routes_1 = __importDefault(require("./modules/applications/applications.routes"));
const ai_routes_1 = __importDefault(require("./modules/ai/ai.routes"));
const reminders_routes_1 = __importDefault(require("./modules/reminders/reminders.routes"));
const reminderJob_1 = require("./jobs/reminderJob");
const dashboard_routes_1 = __importDefault(require("./modules/dashboard/dashboard.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, pino_http_1.default)({
    logger: logger_1.logger,
    genReqId: (req, res) => {
        const existing = req.headers["x-request-id"];
        const id = typeof existing === "string" && existing ? existing : (0, crypto_1.randomUUID)();
        res.setHeader("X-Request-Id", id);
        return id;
    },
    customProps: (req) => ({ userId: req.user?.id }),
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            'req.headers["set-cookie"]',
        ],
        remove: true,
    },
    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method,
                url: req.url,
                remoteAddress: req.remoteAddress,
            };
        },
    },
}));
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(auth_1.clerkAuth);
app.use("/api/user", user_routes_1.default);
app.use("/api/applications", applications_routes_1.default);
app.use("/api/ai", ai_routes_1.default);
app.use("/api/reminders", reminders_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.get("/health", (req, res) => {
    res.status(200).json({ message: "Job tracker's server is live" });
});
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    logger_1.logger.info({ port: PORT }, "Server running");
});
(0, reminderJob_1.startReminderJob)();
process.on("unhandledRejection", (reason) => {
    logger_1.logger.error({ reason }, "unhandledRejection");
});
process.on("uncaughtException", (err) => {
    logger_1.logger.fatal({ err }, "uncaughtException");
    process.exit(1);
});
exports.default = app;
