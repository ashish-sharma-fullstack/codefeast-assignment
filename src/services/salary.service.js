'use strict';

const { round2 } = require('../utils/math');

/**
 * Salary service — owns all tax/compensation business rules.
 *
 * Keeping the rate table here (not in utils/) means adding a country
 * or changing a rate is a change to business logic, tracked accordingly.
 */

// ─── Tax table ────────────────────────────────────────────────────────────────

/**
 * Flat-rate tax table keyed by ISO 3166-1 alpha-2 country code (uppercase).
 * Add or override rates here without touching any other file.
 */
const TAX_RATES = {
  IN: 0.10,   // India
  US: 0.12,   // United States
};

/** Applied to any country not explicitly listed in TAX_RATES */
const DEFAULT_TAX_RATE = 0.00;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the flat tax rate for a given country code.
 *
 * @param {string} country - ISO 3166-1 alpha-2 code (case-insensitive)
 * @returns {number} tax rate as a decimal (e.g. 0.30)
 */
const getTaxRate = (country) =>
  TAX_RATES[country.toUpperCase()] ?? DEFAULT_TAX_RATE;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculates the full salary breakdown for an employee in a given country.
 *
 * @param {object} employee - Prisma Employee record { id, salary, ... }
 * @param {string} country  - ISO 3166-1 alpha-2 code (case-insensitive)
 * @returns {{ employeeId, grossSalary, country, taxRate, taxAmount, netSalary }}
 */
const calculateSalary = (employee, country) => {
  const normalised  = country.toUpperCase();
  const taxRate     = getTaxRate(normalised);
  const grossSalary = employee.salary;
  const taxAmount   = round2(grossSalary * taxRate);
  const netSalary   = round2(grossSalary - taxAmount);

  return {
    employeeId:  employee.id,
    grossSalary,
    country:     normalised,
    taxRate,
    taxAmount,
    netSalary,
  };
};

module.exports = { getTaxRate, calculateSalary };
