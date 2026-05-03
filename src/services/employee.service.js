'use strict';

const { validateCreateEmployee } = require('../utils/validate');
const employeeRepository       = require('../repositories/employee.repository');

/**
 * Creates a new employee after validating the input.
 *
 * @param {{ name: string, email: string, salary: number, department?: string }} data
 * @returns {Promise<Employee>}
 * @throws {AppError} on validation failure
 */
const create = async (data) => {
  validateCreateEmployee(data);
  return employeeRepository.create(data);
};

module.exports = { create };
