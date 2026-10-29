import { Router } from "express";
import * as rating from "../controllers/rating.controller";
import * as store from "../controllers/store.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { idParam } from "../validators/common";
import { ratingBody, storeIdParam } from "../validators/rating.validator";
import { listStoresQuery } from "../validators/store.validator";

const router = Router();

router.use(authenticate);

// Browse / search stores (name, address) with sorting; includes the caller's own rating
router.get("/", validate({ query: listStoresQuery }), store.listPublicStores);
router.get("/:id", validate({ params: idParam }), store.getPublicStore);

// Submit / modify a rating (normal users only)
router.post("/:storeId/ratings", authorize("USER"), validate({ params: storeIdParam, body: ratingBody }), rating.submitRating);
router.put("/:storeId/ratings", authorize("USER"), validate({ params: storeIdParam, body: ratingBody }), rating.modifyRating);

export default router;