'use strict';

const prisma = require('../utils/prisma');

// ─── Salary metrics ───────────────────────────────────────────────────────────

/**
 * Single-query aggregate over ALL employees.
 * Prisma computes _count, _sum, _avg, _min, _max at the DB level.
 */
const getSalaryAggregates = () =>
  prisma.employee.aggregate({
    _count: { _all: true },
    _sum:   { salary: true },
    _avg:   { salary: true },
    _min:   { salary: true },
    _max:   { salary: true },
  });

// ─── Job metrics ──────────────────────────────────────────────────────────────

/**
 * DB-level aggregate filtered by department.
 * SQLite's LIKE (used by Prisma `contains`) is case-insensitive for ASCII.
 *
 * @param {string} title - partial department name
 */
const getJobAggregates = (title) =>
  prisma.employee.aggregate({
    where:  { department: { contains: title } },
    _count: { _all: true },
    _sum:   { salary: true },
    _avg:   { salary: true },
    _min:   { salary: true },
    _max:   { salary: true },
  });

/**
 * Returns matching employees with only the fields needed by the API.
 * DB-level `contains` replaces the previous full-table-scan + JS filter.
 *
 * @param {string} title - partial department name
 */
const getEmployeesByDepartment = (title) =>
  prisma.employee.findMany({
    where:   { department: { contains: title } },
    select:  { id: true, name: true, department: true, salary: true },
    orderBy: { name: 'asc' },
  });

module.exports = { getSalaryAggregates, getJobAggregates, getEmployeesByDepartment };
