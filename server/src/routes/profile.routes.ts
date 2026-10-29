import { Router } from "express";
import * as profile from "../controllers/profile.controller";
import { authenticate } from "../middlewares/authenticate";
import { uploadImage } from "../middlewares/upload";
import { validate } from "../middlewares/validate";
import { idParam } from "../validators/common";
import { createAddressBody, updateAddressBody, updateProfileBody } from "../validators/profile.validator";

const router = Router();

router.use(authenticate);

router.get("/", profile.getProfile); // user + primary address + ALL addresses + profileCompletion
router.patch("/", validate({ body: updateProfileBody }), profile.updateProfile);

// Addresses (each saved field-by-field and as a combined fullAddress)
router.post("/addresses", validate({ body: createAddressBody }), profile.createAddress);
router.patch("/addresses/:id", validate({ params: idParam, body: updateAddressBody }), profile.updateAddress);
router.patch("/addresses/:id/primary", validate({ params: idParam }), profile.setPrimaryAddress);
router.delete("/addresses/:id", validate({ params: idParam }), profile.deleteAddress);

router.post("/picture", uploadImage, profile.uploadPicture);
router.delete("/picture", profile.deletePicture);

export default router;