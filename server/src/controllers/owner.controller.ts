import * as ownerService from "../services/owner.service";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUser } from "../utils/requestContext";
import { sendSuccess } from "../utils/response";
import type { OwnerRatingsQuery } from "../validators/rating.validator";

export const dashboard = asyncHandler(async (req, res) => {
  sendSuccess(res, await ownerService.getDashboard(requireUser(req).id), "Owner dashboard fetched");
});

export const myStores = asyncHandler(async (req, res) => {
  sendSuccess(res, await ownerService.getOwnedStores(requireUser(req).id), "Stores fetched");
});

export const storeRatings = asyncHandler(async (req, res) => {
  const { items, meta } = await ownerService.listStoreRatings(requireUser(req).id, req.query as unknown as OwnerRatingsQuery);
  sendSuccess(res, items, "Ratings fetched", 200, meta);
});