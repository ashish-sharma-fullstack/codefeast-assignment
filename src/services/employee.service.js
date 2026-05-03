'use strict';

const { validateCreateEmployee, validateId } = require('../utils/validate');
const AppError           = require('../utils/AppError');
const employeeRepository = require('../repositories/employee.repository');

const create = async (data) => {
  validateCreateEmployee(data);
  return employeeRepository.create(data);
};

const findAll = () => employeeRepository.findAll();

const findById = async (rawId) => {
  validateId(rawId);                                     // throws AppError(400) on bad id
  const employee = await employeeRepository.findById(Number(rawId));
  if (!employee) throw new AppError('Employee not found', 404);
  return employee;
};

module.exports = { create, findAll, findById };
