'use strict';

const { validateCountry, validateTitle } = require('../utils/validate');
const { getTaxRate }                     = require('./salary.service');
const metricsRepository                  = require('../repositories/metrics.repository');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Rounds to 2 decimal places — prevents floating-point artefacts */
const round2 = (n) => Math.round(n * 100) / 100;

/** Safely reads a nullable Prisma aggregate value; returns 0 when null */
const safe = (v) => v ?? 0;

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

  const count      = safe(agg._count._all);
  const totalGross = safe(agg._sum.salary);
  const avgGross   = count > 0 ? safe(agg._avg.salary) : 0;  // _avg is null when count=0
  const minGross   = safe(agg._min.salary);
  const maxGross   = safe(agg._max.salary);

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

  const count = safe(agg._count._all);

  return {
    title:          trimmed,
    totalEmployees: count,
    averageSalary:  count > 0 ? round2(safe(agg._avg.salary)) : 0,
    minSalary:      safe(agg._min.salary),
    maxSalary:      safe(agg._max.salary),
    employees,
  };
};

module.exports = { getSalaryMetrics, getJobMetrics };
