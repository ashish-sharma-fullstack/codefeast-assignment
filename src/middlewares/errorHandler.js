'use strict';

/**
 * 404 – Resource not found
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * Global error handler
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.status || err.statusCode || 500;

  const payload = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  if (process.env.NODE_ENV === 'development') {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = { notFound, errorHandler };
