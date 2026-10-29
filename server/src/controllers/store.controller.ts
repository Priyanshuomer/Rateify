import * as storeService from "../services/store.service";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUser } from "../utils/requestContext";
import { sendSuccess } from "../utils/response";
import type { ListStoresQuery } from "../validators/store.validator";

// ── Any authenticated user (normal user / owner / admin) ──
export const listPublicStores = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { items, meta } = await storeService.listStores(req.query as unknown as ListStoresQuery, {
    scope: "public",
    viewerId: user.id,
  });
  sendSuccess(res, items, "Stores fetched", 200, meta);
});

export const getPublicStore = asyncHandler(async (req, res) => {
  sendSuccess(res, await storeService.getStoreById(req.params.id, { scope: "public", viewerId: requireUser(req).id }), "Store fetched");
});

// ── Admin ──
export const createStore = asyncHandler(async (req, res) => {
  sendSuccess(res, await storeService.createStore(req.body, requireUser(req).id, req.ip), "Store created", 201);
});

export const listAdminStores = asyncHandler(async (req, res) => {
  const { items, meta } = await storeService.listStores(req.query as unknown as ListStoresQuery, { scope: "admin" });
  sendSuccess(res, items, "Stores fetched", 200, meta);
});

export const getAdminStore = asyncHandler(async (req, res) => {
  sendSuccess(res, await storeService.getStoreById(req.params.id, { scope: "admin" }), "Store fetched");
});

export const updateStore = asyncHandler(async (req, res) => {
  sendSuccess(res, await storeService.updateStore(req.params.id, req.body, requireUser(req).id, req.ip), "Store updated");
});

export const saveStoreAddress = asyncHandler(async (req, res) => {
  sendSuccess(res, await storeService.saveStoreAddress(req.params.id, req.body, requireUser(req).id, req.ip), "Store address saved");
});

export const deleteStore = asyncHandler(async (req, res) => {
  await storeService.deleteStore(req.params.id, requireUser(req).id, req.ip);
  sendSuccess(res, null, "Store deleted");
});

export const uploadStoreLogo = asyncHandler(async (req, res) => {
  sendSuccess(res, await storeService.updateStoreLogo(req.params.id, req.file, requireUser(req).id), "Store logo updated");
});