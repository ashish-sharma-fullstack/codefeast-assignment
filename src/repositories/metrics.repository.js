'use strict';

const prisma = require('../utils/prisma');

// ─── Salary metrics ───────────────────────────────────────────────────────────

/**
 * Single-query aggregate over employees in the given country.
 * Prisma computes _count, _sum, _avg, _min, _max at the DB level.
 *
 * @param {string} country - normalised (uppercase) ISO country code
 */
const getSalaryAggregates = (country) =>
  prisma.employee.aggregate({
    where:  { country },
    _count: { _all: true },
    _sum:   { salary: true },
    _avg:   { salary: true },
    _min:   { salary: true },
    _max:   { salary: true },
  });

// ─── Job metrics ──────────────────────────────────────────────────────────────

/**
 * DB-level aggregate filtered by jobTitle.
 * SQLite's LIKE (used by Prisma `contains`) is case-insensitive for ASCII.
 *
 * @param {string} title - partial job title
 */
const getJobAggregates = (title) =>
  prisma.employee.aggregate({
    where:  { jobTitle: { contains: title } },
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
 * @param {string} title - partial job title
 */
const getEmployeesByJobTitle = (title) =>
  prisma.employee.findMany({
    where:   { jobTitle: { contains: title } },
    select:  { id: true, name: true, jobTitle: true, salary: true },
    orderBy: { name: 'asc' },
  });

module.exports = { getSalaryAggregates, getJobAggregates, getEmployeesByJobTitle };
