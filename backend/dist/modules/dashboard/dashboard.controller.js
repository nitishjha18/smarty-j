"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStatsController = void 0;
const dashboard_service_1 = require("./dashboard.service");
const getDashboardStatsController = async (req, res) => {
    const user = req.user;
    const stats = await (0, dashboard_service_1.getDashboardStats)(user.id);
    res.status(200).json({ stats });
};
exports.getDashboardStatsController = getDashboardStatsController;
