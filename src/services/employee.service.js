'use strict';

const employeeRepository = require('../repositories/employee.repository');

/**
 * Throws a 400 error with the given message.
 */
const fail400 = (message) => {
  const err = new Error(message);
  err.status = 400;
  throw err;
};

const create = async ({ name, email, salary, department }) => {
  if (!name)                              fail400('name is required');
  if (!email)                             fail400('email is required');
  if (salary === undefined || salary === null) fail400('salary is required');
  if (typeof salary !== 'number' || salary <= 0) fail400('salary must be a positive number');

  return employeeRepository.create({ name, email, salary, department });
};

module.exports = { create };
