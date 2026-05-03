'use strict';

/**
 * Wraps an async Express route handler so that any rejected promise is
 * automatically forwarded to next(err) — eliminating the try/catch boilerplate
 * that would otherwise be repeated in every controller method.
 *
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 *
 * @param {Function} fn - async (req, res, next) => void
 * @returns {Function}  - Express-compatible route handler
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
