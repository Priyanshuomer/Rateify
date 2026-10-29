import { Router } from "express";
import { adminDashboard } from "../controllers/dashboard.controller";
import * as store from "../controllers/store.controller";
import * as user from "../controllers/user.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { uploadImage } from "../middlewares/upload";
import { validate } from "../middlewares/validate";
import { idParam } from "../validators/common";
import { createAddressBody, updateAddressBody } from "../validators/profile.validator";
import { createStoreBody, listStoresQuery, storeAddressBody, updateStoreBody } from "../validators/store.validator";
import { createUserBody, listUsersQuery, updateUserBody, userAddressParams } from "../validators/user.validator";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/dashboard", adminDashboard);

// Users (filters: name, email, address, role, status; sort: name, email, role, createdAt)
router.post("/users", validate({ body: createUserBody }), user.createUser);
router.get("/users", validate({ query: listUsersQuery }), user.listUsers);
router.get("/users/:id", validate({ params: idParam }), user.getUser);
router.patch("/users/:id", validate({ params: idParam, body: updateUserBody }), user.updateUser);
router.delete("/users/:id", validate({ params: idParam }), user.deleteUser);

// A user's addresses (flat no., street, landmark, area, city, state, PIN, country)
router.post("/users/:id/addresses", validate({ params: idParam, body: createAddressBody }), user.addAddress);
router.patch("/users/:id/addresses/:addressId/primary", validate({ params: userAddressParams }), user.setPrimaryAddress);
router.patch("/users/:id/addresses/:addressId", validate({ params: userAddressParams, body: updateAddressBody }), user.updateAddress);
router.delete("/users/:id/addresses/:addressId", validate({ params: userAddressParams }), user.deleteAddress);

// Stores (filters: name, email, address; sort: name, email, rating, createdAt)
router.post("/stores", validate({ body: createStoreBody }), store.createStore);
router.get("/stores", validate({ query: listStoresQuery }), store.listAdminStores);
router.get("/stores/:id", validate({ params: idParam }), store.getAdminStore);
router.patch("/stores/:id", validate({ params: idParam, body: updateStoreBody }), store.updateStore);
router.put("/stores/:id/address", validate({ params: idParam, body: storeAddressBody }), store.saveStoreAddress);
router.delete("/stores/:id", validate({ params: idParam }), store.deleteStore);
router.post("/stores/:id/logo", validate({ params: idParam }), uploadImage, store.uploadStoreLogo);

export default router;