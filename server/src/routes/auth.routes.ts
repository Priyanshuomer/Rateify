import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import { finishGoogle, startGoogle } from "../controllers/google.controller";
import { authenticate } from "../middlewares/authenticate";
import { authLimiter } from "../middlewares/rateLimiter";
import { uploadSignupImages } from "../middlewares/upload";
import { validate } from "../middlewares/validate";
import {
  changePasswordBody,
  emailOnlyBody,
  loginBody,
  refreshBody,
  resetPasswordBody,
  signupBody,
  verifyEmailQuery,
} from "../validators/auth.validator";

const router = Router();

// Registration with email verification (multipart: role, name, email, password, + storeName/ownerImage/storeLogo for owners, adminCode for admins)
router.post("/signup", authLimiter, uploadSignupImages, validate({ body: signupBody }), auth.signup);
router.get("/verify-email", validate({ query: verifyEmailQuery }), auth.verifyEmail);
router.post("/resend-verification", authLimiter, validate({ body: emailOnlyBody }), auth.resendVerification);

// Session
router.post("/login", authLimiter, validate({ body: loginBody }), auth.login);
router.post("/refresh", authLimiter, validate({ body: refreshBody }), auth.refresh);
router.post("/logout", auth.logout);
router.post("/logout-all", authenticate, auth.logoutAll);
router.get("/me", authenticate, auth.me);

// Passwords
router.post("/change-password", authenticate, validate({ body: changePasswordBody }), auth.changePassword);
router.post("/forgot-password", authLimiter, validate({ body: emailOnlyBody }), auth.forgotPassword);
router.post("/reset-password", authLimiter, validate({ body: resetPasswordBody }), auth.resetPassword);

// Google OAuth (signup creates normal users only)
router.get("/google/login", startGoogle("google-login"));
router.get("/google/login/callback", finishGoogle("google-login"));
router.get("/google/signup", startGoogle("google-signup"));
router.get("/google/signup/callback", finishGoogle("google-signup"));

export default router;