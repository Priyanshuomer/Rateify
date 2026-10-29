import * as dashboardService from "../services/dashboard.service";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";

export const adminDashboard = asyncHandler(async (_req, res) => {
  sendSuccess(res, await dashboardService.getAdminDashboard(), "Dashboard fetched");
});