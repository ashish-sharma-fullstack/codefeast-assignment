'use strict';

const { validateCreateEmployee, validateUpdateEmployee, validateId, validateCountry } = require('../utils/validate');
const AppError           = require('../utils/AppError');
const employeeRepository = require('../repositories/employee.repository');
const { calculateSalary } = require('./salary.service');

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

const update = async (rawId, data) => {
  validateId(rawId);                                     // throws AppError(400) on bad id
  validateUpdateEmployee(data);                          // throws AppError(400) on invalid fields
  const id = Number(rawId);
  const existing = await employeeRepository.findById(id);
  if (!existing) throw new AppError('Employee not found', 404);
  return employeeRepository.update(id, data);
};

const remove = async (rawId) => {
  validateId(rawId);
  const id = Number(rawId);
  const existing = await employeeRepository.findById(id);
  if (!existing) throw new AppError('Employee not found', 404);
  await employeeRepository.remove(id);
};

const getSalary = async (rawId, country) => {
  validateId(rawId);
  validateCountry(country);
  const id = Number(rawId);
  const employee = await employeeRepository.findById(id);
  if (!employee) throw new AppError('Employee not found', 404);
  return calculateSalary(employee, country);
};

module.exports = { create, findAll, findById, update, remove, getSalary };
