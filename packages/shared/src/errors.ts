export enum ErrorCode {
  // Auth
  UNAUTHORIZED = "UNAUTHORIZED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",

  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",

  // Resources
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  CONFLICT = "CONFLICT",

  // Rate limiting
  RATE_LIMITED = "RATE_LIMITED",

  // Plan limits
  PLAN_LIMIT_REACHED = "PLAN_LIMIT_REACHED",
  UPGRADE_REQUIRED = "UPGRADE_REQUIRED",

  // External services
  CLAUDE_ERROR = "CLAUDE_ERROR",
  STRIPE_ERROR = "STRIPE_ERROR",

  // Server
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }

  // Factory methods
  static unauthorized(message = "Unauthorized") {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  static notFound(resource = "Resource") {
    return new AppError(ErrorCode.NOT_FOUND, `${resource} not found`, 404);
  }

  static validation(message: string, details?: unknown) {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }

  static conflict(message: string) {
    return new AppError(ErrorCode.CONFLICT, message, 409);
  }

  static rateLimited() {
    return new AppError(ErrorCode.RATE_LIMITED, "Too many requests. Please try again later.", 429);
  }

  static planLimit(message = "Plan limit reached") {
    return new AppError(ErrorCode.PLAN_LIMIT_REACHED, message, 403);
  }

  static internal(message = "Internal server error") {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, 500);
  }
}
