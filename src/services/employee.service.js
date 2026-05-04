'use strict';

const { validateCreateEmployee, validateUpdateEmployee, validateId, validateCountry } = require('../utils/validate');
const AppError           = require('../utils/AppError');
const employeeRepository = require('../repositories/employee.repository');
const { calculateSalary } = require('./salary.service');

// ─── Private helper ───────────────────────────────────────────────────────────

/**
 * Validates the id, fetches the record, and throws AppError(404) if absent.
 * Shared by findById, update, remove, and getSalary — eliminates 4× repetition.
 *
 * @param {string|number} rawId - raw string from req.params.id
 * @returns {Promise<object>} Prisma Employee record
 * @throws {AppError(400)} invalid id
 * @throws {AppError(404)} not found
 */
const _findOrThrow = async (rawId) => {
  validateId(rawId);
  const employee = await employeeRepository.findById(Number(rawId));
  if (!employee) throw new AppError('Employee not found', 404);
  return employee;
};

// ─── Public API ───────────────────────────────────────────────────────────────

const create = async (data) => {
  validateCreateEmployee(data);
  // Destructure only schema fields — Prisma rejects unknown columns
  const { name, email, jobTitle, country, salary } = data;
  return employeeRepository.create({ name, email, jobTitle, country, salary });
};

const findAll = () => employeeRepository.findAll();

const findById = (rawId) => _findOrThrow(rawId);

const update = async (rawId, data) => {
  validateUpdateEmployee(data);                       // validate first (cheap, no DB)
  const employee = await _findOrThrow(rawId);
  return employeeRepository.update(employee.id, data);
};

const remove = async (rawId) => {
  const employee = await _findOrThrow(rawId);
  await employeeRepository.remove(employee.id);
};

const getSalary = async (rawId, country) => {
  validateCountry(country);
  const employee = await _findOrThrow(rawId);
  return calculateSalary(employee, country);
};

module.exports = { create, findAll, findById, update, remove, getSalary };
