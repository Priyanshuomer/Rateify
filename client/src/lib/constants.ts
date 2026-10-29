import type { Role } from "@/types/api";

export const ROLE_HOME: Record<Role, "/admin/dashboard" | "/owner/dashboard" | "/stores"> = {
  ADMIN: "/admin/dashboard",
  OWNER: "/owner/dashboard",
  USER: "/stores",
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PAGE_SIZES = [10, 20, 50, 100];

export const FRIENDLY_ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: "That email and password don't match.",
  ACCOUNT_LOCKED: "Too many failed attempts. Your account is locked for 15 minutes.",
  ACCOUNT_SUSPENDED: "Your account is suspended. Contact an administrator.",
  ACCOUNT_INACTIVE: "Your account is inactive. Contact an administrator.",
  ACCOUNT_NOT_FOUND: "No account exists for that email. Please sign up first.",
  EMAIL_NOT_VERIFIED: "Please verify your email address first.",
  VERIFICATION_LINK_INVALID: "This verification link is invalid or has expired. Please sign up again.",
  ALREADY_VERIFIED: "This email is already verified. Please log in.",
  RATE_LIMITED: "You're going a bit fast. Please wait a moment and try again.",
  AUTH_RATE_LIMITED: "Too many attempts. Please wait a minute and try again.",
  EMAIL_EXISTS: "An account with this email already exists.",
  STORE_EMAIL_EXISTS: "A store with this email already exists.",
  ADMIN_SIGNUP_DISABLED: "Administrator sign-up is turned off. Ask an existing administrator to create your account.",
  INVALID_ADMIN_CODE: "That administrator access code isn't correct.",
  ROLE_FORBIDDEN: "You don't have permission to do that.",
  RATING_EXISTS: "You've already rated this store.",
  RATING_NOT_FOUND: "You haven't rated this store yet.",
  STORE_NOT_FOUND: "That store doesn't exist anymore.",
  OWNER_NOT_FOUND: "That owner doesn't exist anymore.",
  OWNER_INACTIVE: "That owner's account isn't active.",
  SELF_MODIFICATION: "You can't modify your own account here.",
  OWNER_HAS_STORES: "This owner still has stores. Reassign or remove them first.",
  NOT_AN_OWNER: "The selected user isn't an owner.",
  DUPLICATE_RESOURCE: "That value is already in use.",
  ADDRESS_NOT_FOUND: "That address doesn't exist anymore.",
  ADDRESS_LIMIT: "You can save up to 10 addresses. Delete one to add another.",
  ADDRESS_TOO_LONG: "The whole address is too long. Please shorten it (max 400 characters).",
  ADDRESS_INCOMPLETE: "Street, city, state and PIN code are required.",
  INVALID_IMAGE: "That image couldn't be processed.",
  INVALID_FILE_TYPE: "Only JPEG, PNG or WebP images are allowed.",
  LIMIT_FILE_SIZE: "Image must be 5 MB or smaller.",
  CURRENT_PASSWORD_REQUIRED: "Enter your current password.",
  RESET_TOKEN_INVALID: "This reset link has expired. Request a new one.",
  INVALID_NAME_LENGTH: "Name must be between 20 and 60 characters.",
  REFRESH_TOKEN_REUSED: "Your session was ended for security reasons. Please log in again.",
  REFRESH_TOKEN_EXPIRED: "Your session expired. Please log in again.",
  ROUTE_NOT_FOUND: "That page or endpoint doesn't exist.",
  NETWORK_ERROR: "Can't reach the server. Check your connection and try again.",
};