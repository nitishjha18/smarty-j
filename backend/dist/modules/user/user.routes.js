"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const user_controller_1 = require("./user.controller");
const user_controller_2 = require("./user.controller");
const user_controller_3 = require("./user.controller");
const router = (0, express_1.Router)();
router.post("/sync", auth_1.clerkAuth, user_controller_1.syncUserController); // ← only clerkAuth, no requireUser
router.get("/profile", auth_1.requireUser, user_controller_1.getProfileController);
router.post("/resume", auth_1.requireUser, user_controller_2.uploadMiddleware, user_controller_2.uploadResumeController);
router.put("/profile", auth_1.requireUser, user_controller_3.updateProfileController);
exports.default = router;
