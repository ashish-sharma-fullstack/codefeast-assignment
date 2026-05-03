'use strict';

const AppError = require('../utils/AppError');

// ─── 404 ─────────────────────────────────────────────────────────────────────

/**
 * Catches requests to unmounted routes and forwards a 404 AppError.
 */
const notFound = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// ─── Global error handler ────────────────────────────────────────────────────

/**
 * Distinguishes operational errors (AppError) from unexpected programmer errors.
 *
 * Operational  → expose message + HTTP status to the client.
 * Unexpected   → log the full error, return a generic 500.
 *
 * The four-argument signature is required by Express to recognise this as an
 * error-handling middleware.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  // ── Prisma: unique constraint violation (P2002) → 409 Conflict ──────────────
  if (err.code === 'P2002') {
    // Prisma 7 + better-sqlite3 adapter: field is in driverAdapterError
    const adapterFields = err.meta?.driverAdapterError?.cause?.constraint?.fields;
    // PostgreSQL / other adapters: field is in meta.target
    const targetFields  = err.meta?.target;

    const field =
      (Array.isArray(adapterFields) && adapterFields[0]) ||
      (Array.isArray(targetFields)  && targetFields[0])  ||
      (typeof targetFields === 'string'
        ? targetFields.split('_').slice(1, -1).join('_') || targetFields
        : null) ||
      'field';

    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // ── AppError (operational) vs unexpected programmer error ────────────────────
  const isOperational = err instanceof AppError;
  const statusCode    = isOperational ? err.statusCode : 500;
  const message       = isOperational ? err.message    : 'Internal Server Error';

  if (!isOperational) {
    console.error('[Unhandled Error]', err);
  }

  const payload = { success: false, message };

  if (process.env.NODE_ENV === 'development') {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = { notFound, errorHandler };
