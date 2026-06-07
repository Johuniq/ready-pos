import { toast } from "sonner";

/**
 * Centralized error handler for API errors
 * Maps error types to user-friendly messages and actions
 */

export class AppError extends Error {
  constructor(message, type = "generic", originalError = null) {
    super(message);
    this.type = type;
    this.originalError = originalError;
    this.timestamp = new Date();
  }
}

/**
 * Error types
 */
export const ErrorType = {
  NETWORK: "network",
  SERVER: "server",
  VALIDATION: "validation",
  PERMISSION: "permission",
  NOT_FOUND: "not_found",
  LICENSE: "license",
  TIMEOUT: "timeout",
  GENERIC: "generic",
};

/**
 * Parse API error and return structured error object
 */
export function parseApiError(error) {
  // Network error (no response)
  if (!error.status && error.message?.includes("fetch")) {
    return new AppError(
      "Unable to connect to the server. Please check your internet connection.",
      ErrorType.NETWORK,
      error,
    );
  }

  // HTTP status-based errors
  switch (error.status) {
    case 400:
      return new AppError(
        error.message || "Invalid request. Please check your input.",
        ErrorType.VALIDATION,
        error,
      );

    case 401:
      return new AppError(
        "Your session has expired. Please refresh the page.",
        ErrorType.PERMISSION,
        error,
      );

    case 402:
      return new AppError(
        error.message || "This feature requires a license upgrade.",
        ErrorType.LICENSE,
        error,
      );

    case 403:
      return new AppError(
        "You don't have permission to perform this action.",
        ErrorType.PERMISSION,
        error,
      );

    case 404:
      return new AppError(
        "The requested resource was not found.",
        ErrorType.NOT_FOUND,
        error,
      );

    case 408:
      return new AppError(
        "Request timeout. Please try again.",
        ErrorType.TIMEOUT,
        error,
      );

    case 429:
      return new AppError(
        "Too many requests. Please wait a moment and try again.",
        ErrorType.VALIDATION,
        error,
      );

    case 500:
    case 502:
    case 503:
    case 504:
      return new AppError(
        "Server error. Please try again later.",
        ErrorType.SERVER,
        error,
      );

    default:
      return new AppError(
        error.message || "An unexpected error occurred.",
        ErrorType.GENERIC,
        error,
      );
  }
}

/**
 * Handle error with toast notification
 */
export function handleError(error, options = {}) {
  const { showToast = true, customMessage, onError, logError = true } = options;

  const appError = error instanceof AppError ? error : parseApiError(error);

  // Log error to console (or external service)
  if (logError) {
    
  }

  // Show toast notification
  if (showToast) {
    const message = customMessage || appError.message;

    switch (appError.type) {
      case ErrorType.NETWORK:
      case ErrorType.SERVER:
      case ErrorType.PERMISSION:
        toast.error(message);
        break;
      case ErrorType.VALIDATION:
        toast.warning(message);
        break;
      case ErrorType.LICENSE:
        // License errors are handled by LicenseProvider
        break;
      default:
        toast.error(message);
    }
  }

  // Call custom error handler
  onError?.(appError);

  return appError;
}

/**
 * Retry wrapper for async functions
 */
export async function withRetry(fn, options = {}) {
  const { maxRetries = 3, delay = 1000, onRetry } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        onRetry?.(attempt, error);
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Safe async wrapper that catches and handles errors
 */
export async function safeAsync(fn, options = {}) {
  try {
    return await fn();
  } catch (error) {
    return handleError(error, options);
  }
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error) {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error?.message) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

/**
 * Check if error is of specific type
 */
export function isErrorType(error, type) {
  return error instanceof AppError && error.type === type;
}
