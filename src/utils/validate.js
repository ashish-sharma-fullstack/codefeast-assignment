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
 * Validates the payload for updating an employee.
 * Only fields that are present in the payload are checked —
 * omitted fields are left unchanged in the DB.
 *
 * @param {Partial<{ name, email, salary }>} data
 * @throws {AppError} on the first failing rule
 */
const validateUpdateEmployee = (data) => {
  if ('name'   in data) assert(!!data.name,                                   'name cannot be empty');
  if ('email'  in data) assert(!!data.email,                                  'email cannot be empty');
  if ('salary' in data) assert(typeof data.salary === 'number' && data.salary > 0,
                                                                              'salary must be a positive number');
};

/**
 * Validates a route :id parameter.
 * Accepts only positive integers.
 *
 * @param {unknown} raw - The raw string value from req.params.id
 * @throws {AppError(400)} if not a positive integer
 */
const validateId = (raw) => {
  const id = Number(raw);
  assert(Number.isInteger(id) && id > 0, 'id must be a positive integer');
};

/**
 * Validates the ?country query parameter.
 *
 * @param {unknown} country - raw value from req.query.country
 * @throws {AppError(400)} when absent or blank
 */
const validateCountry = (country) => {
  assert(!!country && typeof country === 'string' && country.trim().length > 0,
    'country query parameter is required');
};

module.exports = { validateCreateEmployee, validateUpdateEmployee, validateId, validateCountry };
