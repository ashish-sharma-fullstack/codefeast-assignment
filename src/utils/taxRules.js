'use strict';

/**
 * Flat-rate tax table keyed by ISO 3166-1 alpha-2 country code (uppercase).
 * Add or override rates here without touching any other file.
 */
const TAX_RATES = {
  IN: 0.30,   // India
  US: 0.25,   // United States
};

/** Rate applied to any country not in TAX_RATES */
const DEFAULT_TAX_RATE = 0.10;

/**
 * Returns the tax rate for a given country code.
 *
 * @param {string} country - ISO 3166-1 alpha-2 code (case-insensitive)
 * @returns {number} tax rate as a decimal (e.g. 0.30)
 */
const getTaxRate = (country) =>
  TAX_RATES[country.toUpperCase()] ?? DEFAULT_TAX_RATE;

/**
 * Calculates salary breakdown for an employee in a given country.
 *
 * @param {object} employee   - Prisma Employee record
 * @param {string} country    - ISO 3166-1 alpha-2 code (case-insensitive)
 * @returns {{ employeeId, grossSalary, country, taxRate, taxAmount, netSalary }}
 */
const calculateSalary = (employee, country) => {
  const normalised  = country.toUpperCase();
  const taxRate     = getTaxRate(normalised);
  const grossSalary = employee.salary;
  const taxAmount   = Math.round(grossSalary * taxRate * 100) / 100;
  const netSalary   = Math.round((grossSalary - taxAmount) * 100) / 100;

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
