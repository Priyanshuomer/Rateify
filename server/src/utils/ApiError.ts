export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = "ERROR",
    public details?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = "Bad request", code = "BAD_REQUEST", details?: unknown) {
    return new ApiError(400, message, code, details);
  }
  static unauthorized(message = "Authentication required", code = "UNAUTHORIZED") {
    return new ApiError(401, message, code);
  }
  static forbidden(message = "You do not have permission to perform this action", code = "FORBIDDEN") {
    return new ApiError(403, message, code);
  }
  static notFound(message = "Resource not found", code = "NOT_FOUND") {
    return new ApiError(404, message, code);
  }
  static conflict(message = "Conflict", code = "CONFLICT") {
    return new ApiError(409, message, code);
  }
  static tooManyRequests(message = "Too many requests, please try again later", code = "RATE_LIMITED") {
    return new ApiError(429, message, code);
  }
  static serviceUnavailable(message = "Service unavailable", code = "SERVICE_UNAVAILABLE") {
    return new ApiError(503, message, code);
  }
}