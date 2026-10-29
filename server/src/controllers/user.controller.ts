import * as userService from "../services/user.service";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUser } from "../utils/requestContext";
import { sendSuccess } from "../utils/response";
import type { ListUsersQuery } from "../validators/user.validator";

export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, requireUser(req).id, req.ip);
  sendSuccess(res, user, "User created", 201);
});

export const listUsers = asyncHandler(async (req, res) => {
  const { items, meta } = await userService.listUsers(req.query as unknown as ListUsersQuery);
  sendSuccess(res, items, "Users fetched", 200, meta);
});

export const getUser = asyncHandler(async (req, res) => {
  sendSuccess(res, await userService.getUserById(req.params.id), "User fetched");
});

export const updateUser = asyncHandler(async (req, res) => {
  sendSuccess(res, await userService.updateUser(req.params.id, req.body, requireUser(req).id, req.ip), "User updated");
});

export const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id, requireUser(req).id, req.ip);
  sendSuccess(res, null, "User deleted");
});

// ── A user's addresses (admin) ──
export const addAddress = asyncHandler(async (req, res) => {
  const user = await userService.addUserAddress(req.params.id, req.body, requireUser(req).id);
  sendSuccess(res, user, "Address added", 201);
});

export const updateAddress = asyncHandler(async (req, res) => {
  const user = await userService.updateUserAddress(req.params.id, req.params.addressId, req.body, requireUser(req).id);
  sendSuccess(res, user, "Address updated");
});

export const setPrimaryAddress = asyncHandler(async (req, res) => {
  const user = await userService.setUserPrimaryAddress(req.params.id, req.params.addressId, requireUser(req).id);
  sendSuccess(res, user, "Primary address updated");
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const user = await userService.deleteUserAddress(req.params.id, req.params.addressId, requireUser(req).id);
  sendSuccess(res, user, "Address deleted");
});