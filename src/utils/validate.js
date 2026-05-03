'use strict';

const AppError = require('./AppError');

/**
 * Asserts a condition; throws AppError(400) if false.
 *
 * @param {boolean} condition
 * @param {string}  message
 */
const assert = (condition, message) => {
  if (!condition) throw new AppError(message, 400);
};

// ─── Employee rules ──────────────────────────────────────────────────────────

/**
 * Validates the payload for creating an employee.
 *
 * @param {{ name, email, salary }} payload
 * @throws {AppError} on the first failing rule
 */
const validateCreateEmployee = ({ name, email, salary }) => {
  assert(!!name,                                        'name is required');
  assert(!!email,                                       'email is required');
  assert(salary !== undefined && salary !== null,       'salary is required');
  assert(typeof salary === 'number' && salary > 0,      'salary must be a positive number');
};

/**
 * Validates a route :id parameter.
 * Accepts only integers > 0.
 *
 * @param {unknown} raw - The raw string value from req.params.id
 * @throws {AppError(400)} if not a positive integer
 */
const validateId = (raw) => {
  const id = Number(raw);
  assert(Number.isInteger(id) && id > 0, 'id must be a positive integer');
};

module.exports = { validateCreateEmployee, validateId };
