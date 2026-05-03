'use strict';

const prisma = require('../utils/prisma');

/**
 * Returns Prisma's built-in aggregate over all employees.
 * Prisma calculates _count, _sum, _avg, _min, _max server-side in one query.
 */
const getSalaryAggregates = () =>
  prisma.employee.aggregate({
    _count: { _all: true },
    _sum:   { salary: true },
    _avg:   { salary: true },
    _min:   { salary: true },
    _max:   { salary: true },
  });

/**
 * Returns all employees whose department contains the given title.
 * SQLite's LIKE is case-insensitive for ASCII letters, but to be safe
 * and driver-agnostic we filter the full result set in JS.
 */
const getEmployeesByDepartment = async (title) => {
  const lower = title.toLowerCase();
  const all   = await prisma.employee.findMany();
  return all.filter((e) => e.department.toLowerCase().includes(lower));
};

module.exports = { getSalaryAggregates, getEmployeesByDepartment };
