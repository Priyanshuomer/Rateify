import multer from "multer";
import { ApiError } from "../utils/ApiError";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!ALLOWED.has(file.mimetype)) {
    return cb(ApiError.badRequest("Only JPEG, PNG or WebP images are allowed", "INVALID_FILE_TYPE"));
  }
  cb(null, true);
};

const single = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 }, fileFilter });
const signup = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 2 }, fileFilter });

/** Expects the multipart field name "image" */
export const uploadImage = single.single("image");

/** Signup form: optional "ownerImage" and "storeLogo" */
export const uploadSignupImages = signup.fields([
  { name: "ownerImage", maxCount: 1 },
  { name: "storeLogo", maxCount: 1 },
]);