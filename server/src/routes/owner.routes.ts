import { Router } from "express";
import * as owner from "../controllers/owner.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { ownerRatingsQuery } from "../validators/rating.validator";

const router = Router();

router.use(authenticate, authorize("OWNER"));

router.get("/dashboard", owner.dashboard);
router.get("/stores", owner.myStores);
router.get("/ratings", validate({ query: ownerRatingsQuery }), owner.storeRatings);

export default router;