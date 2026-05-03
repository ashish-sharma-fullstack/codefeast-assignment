'use strict';

/**
 * Operational error with an HTTP status code.
 *
 * Use this for all expected, user-facing errors (4xx).
 * Anything that is NOT an AppError is treated as an unexpected
 * programmer error (5xx) by the global error handler.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable description
   * @param {number} [statusCode=400] - HTTP status code
   */
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;

    // Preserve the correct stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

module.exports = AppError;
