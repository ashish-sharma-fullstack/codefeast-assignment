'use strict';

const { validateCountry, validateTitle } = require('../utils/validate');
const { round2, nullToZero }             = require('../utils/math');
const { getTaxRate }                     = require('./salary.service');
const metricsRepository                  = require('../repositories/metrics.repository');

// ─── Salary metrics ───────────────────────────────────────────────────────────

/**
 * Aggregates gross and net salary statistics across all employees,
 * applying the specified country's flat tax rate.
 *
 * @param {string} country - ISO 3166-1 alpha-2 country code (case-insensitive)
 * @returns {object} salary metrics breakdown
 */
const getSalaryMetrics = async (country) => {
  validateCountry(country);

  const normalised = country.toUpperCase();
  const taxRate    = getTaxRate(normalised);
  const agg        = await metricsRepository.getSalaryAggregates();

  const count      = nullToZero(agg._count._all);
  const totalGross = nullToZero(agg._sum.salary);
  const avgGross   = count > 0 ? nullToZero(agg._avg.salary) : 0;  // _avg is null when count=0
  const minGross   = nullToZero(agg._min.salary);
  const maxGross   = nullToZero(agg._max.salary);

  return {
    country:            normalised,
    taxRate,
    totalEmployees:     count,
    totalGrossSalary:   totalGross,
    totalNetSalary:     round2(totalGross * (1 - taxRate)),
    averageGrossSalary: round2(avgGross),
    averageNetSalary:   round2(avgGross  * (1 - taxRate)),
    minGrossSalary:     minGross,
    maxGrossSalary:     maxGross,
  };
};

// ─── Job metrics ──────────────────────────────────────────────────────────────

/**
 * Returns salary stats for employees whose department contains `title`.
 * Uses DB-level aggregation and filtering — no full table scans, no JS math.
 *
 * @param {string} title - partial department name (case-insensitive)
 * @returns {object} job metrics breakdown
 */
const getJobMetrics = async (title) => {
  validateTitle(title);

  const trimmed = title.trim();

  // Fire both queries in parallel — they are independent
  const [agg, employees] = await Promise.all([
    metricsRepository.getJobAggregates(trimmed),
    metricsRepository.getEmployeesByDepartment(trimmed),
  ]);

  const count = nullToZero(agg._count._all);

  return {
    title:          trimmed,
    totalEmployees: count,
    averageSalary:  count > 0 ? round2(nullToZero(agg._avg.salary)) : 0,
    minSalary:      nullToZero(agg._min.salary),
    maxSalary:      nullToZero(agg._max.salary),
    employees,
  };
};

module.exports = { getSalaryMetrics, getJobMetrics };
