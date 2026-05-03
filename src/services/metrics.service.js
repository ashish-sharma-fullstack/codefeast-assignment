'use strict';

const { validateCountry } = require('../utils/validate');
const AppError            = require('../utils/AppError');
const { getTaxRate }      = require('./salary.service');
const metricsRepository   = require('../repositories/metrics.repository');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const round2 = (n) => Math.round(n * 100) / 100;

// ─── Salary metrics ───────────────────────────────────────────────────────────

/**
 * Aggregates gross and net salary statistics across all employees
 * applying the specified country's flat tax rate.
 *
 * @param {string} country - ISO 3166-1 alpha-2 country code
 * @returns {object} salary metrics breakdown
 */
const getSalaryMetrics = async (country) => {
  validateCountry(country);

  const normalised = country.toUpperCase();
  const taxRate    = getTaxRate(normalised);
  const agg        = await metricsRepository.getSalaryAggregates();

  const count      = agg._count._all   ?? 0;
  const totalGross = agg._sum.salary    ?? 0;
  const avgGross   = agg._avg.salary    ?? 0;
  const minGross   = agg._min.salary    ?? 0;
  const maxGross   = agg._max.salary    ?? 0;

  return {
    country:            normalised,
    taxRate,
    totalEmployees:     count,
    totalGrossSalary:   totalGross,
    totalNetSalary:     round2(totalGross * (1 - taxRate)),
    averageGrossSalary: count > 0 ? round2(avgGross) : 0,
    averageNetSalary:   count > 0 ? round2(avgGross  * (1 - taxRate)) : 0,
    minGrossSalary:     minGross,
    maxGrossSalary:     maxGross,
  };
};

// ─── Job metrics ──────────────────────────────────────────────────────────────

/**
 * Returns salary stats for employees whose department contains `title`.
 *
 * @param {string} title - partial department name (case-insensitive)
 * @returns {object} job metrics breakdown
 */
const getJobMetrics = async (title) => {
  if (!title || !title.trim()) {
    throw new AppError('title query parameter is required', 400);
  }

  const employees = await metricsRepository.getEmployeesByDepartment(title);

  if (employees.length === 0) {
    return {
      title:          title.trim(),
      totalEmployees: 0,
      averageSalary:  0,
      minSalary:      0,
      maxSalary:      0,
      employees:      [],
    };
  }

  const salaries    = employees.map((e) => e.salary);
  const total       = salaries.reduce((sum, s) => sum + s, 0);
  const avgSalary   = round2(total / employees.length);
  const minSalary   = Math.min(...salaries);
  const maxSalary   = Math.max(...salaries);

  return {
    title:          title.trim(),
    totalEmployees: employees.length,
    averageSalary:  avgSalary,
    minSalary,
    maxSalary,
    employees:      employees.map(({ id, name, department, salary }) =>
                      ({ id, name, department, salary })),
  };
};

module.exports = { getSalaryMetrics, getJobMetrics };
