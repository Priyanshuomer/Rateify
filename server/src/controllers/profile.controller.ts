import * as profileService from "../services/profile.service";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUser } from "../utils/requestContext";
import { sendSuccess } from "../utils/response";

export const getProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.getProfile(requireUser(req).id), "Profile fetched");
});

export const updateProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.updateProfile(requireUser(req).id, req.body), "Profile updated");
});

export const createAddress = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.createAddress(requireUser(req).id, req.body), "Address added", 201);
});

export const updateAddress = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.updateAddress(requireUser(req).id, req.params.id, req.body), "Address updated");
});

export const setPrimaryAddress = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.setPrimaryAddress(requireUser(req).id, req.params.id), "Primary address updated");
});

export const deleteAddress = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.deleteAddress(requireUser(req).id, req.params.id), "Address deleted");
});

export const uploadPicture = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.updateProfilePicture(requireUser(req).id, req.file), "Profile picture updated");
});

export const deletePicture = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.removeProfilePicture(requireUser(req).id), "Profile picture removed");
});