import * as ratingService from "../services/rating.service";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUser } from "../utils/requestContext";
import { sendSuccess } from "../utils/response";
import type { MyRatingsQuery } from "../validators/rating.validator";

export const submitRating = asyncHandler(async (req, res) => {
  const { value, comment } = req.body;
  const rating = await ratingService.submitRating(requireUser(req).id, req.params.storeId, value, comment, req.ip);
  sendSuccess(res, rating, "Rating submitted", 201);
});

export const modifyRating = asyncHandler(async (req, res) => {
  const { value, comment } = req.body;
  const rating = await ratingService.modifyRating(requireUser(req).id, req.params.storeId, value, comment, req.ip);
  sendSuccess(res, rating, "Rating updated");
});

export const myRatings = asyncHandler(async (req, res) => {
  const { items, meta } = await ratingService.listMyRatings(requireUser(req).id, req.query as unknown as MyRatingsQuery);
  sendSuccess(res, items, "Your ratings fetched", 200, meta);
});