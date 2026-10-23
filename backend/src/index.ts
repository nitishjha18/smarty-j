import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { clerkAuth } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { logger } from "./config/logger";
import userRoutes from "./modules/user/user.routes";
import applicationsRouter from "./modules/applications/applications.routes";
import aiRouter from "./modules/ai/ai.routes"
import remindersRouter from "./modules/reminders/reminders.routes"
import { startReminderJob } from "./jobs/reminderJob"
import dashboardRouter from "./modules/dashboard/dashboard.routes"

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = req.headers["x-request-id"];
      const id = typeof existing === "string" && existing ? existing : randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    customProps: (req) => ({ userId: (req as any).user?.id }),
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
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(clerkAuth);
app.use("/api/user", userRoutes);
app.use("/api/applications", applicationsRouter);
app.use("/api/ai", aiRouter)
app.use("/api/reminders", remindersRouter)
app.use("/api/dashboard", dashboardRouter)

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Job tracker's server is live" });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info({ port: PORT }, "Server running");
});

startReminderJob()

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandledRejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  process.exit(1);
});

export default app;
