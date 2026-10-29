import { Router } from "express";
import * as rating from "../controllers/rating.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { myRatingsQuery } from "../validators/rating.validator";

const router = Router();

router.get("/me", authenticate, authorize("USER"), validate({ query: myRatingsQuery }), rating.myRatings);

export default router;