'use strict';

/**
 * Currency-safe rounding to 2 decimal places.
 * Prevents floating-point artefacts in tax/salary calculations.
 *
 * @param {number} n
 * @returns {number}
 */
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Coerces a nullable Prisma aggregate value to 0.
 * Prisma returns null for _avg / _sum / _min / _max when the table is empty.
 *
 * @param {number|null|undefined} v
 * @returns {number}
 */
const nullToZero = (v) => v ?? 0;

module.exports = { round2, nullToZero };
