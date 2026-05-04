'use strict';

const request = require('supertest');
const app    = require('../src/app');
const prisma = require('../src/utils/prisma');

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const seedMany = (employees) =>
  Promise.all(employees.map((data) => prisma.employee.create({ data })));

// Employees seeded with country so salary metrics can be filtered by country.
// Job metrics filter on jobTitle.
const EMPLOYEES = [
  { name: 'Alice Dev',    email: 'alice@example.com',   jobTitle: 'Software Engineer', country: 'IN', salary: 120000 },
  { name: 'Bob Dev',      email: 'bob@example.com',     jobTitle: 'Software Engineer', country: 'IN', salary: 80000  },
  { name: 'Carol HR',     email: 'carol@example.com',   jobTitle: 'HR Manager',        country: 'US', salary: 60000  },
  { name: 'Dave Finance', email: 'dave@example.com',    jobTitle: 'Finance Analyst',   country: 'US', salary: 90000  },
  { name: 'Eve Ops',      email: 'eve@example.com',     jobTitle: 'Operations Lead',   country: 'GB', salary: 50000  },
];

// ─── Shared lifecycle ─────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.employee.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─── GET /api/v1/metrics/salary ───────────────────────────────────────────────
//
// Returns aggregate salary stats for employees whose country matches the
// query param, with net-salary figures computed via the given country's tax rate.
//
describe('GET /api/v1/metrics/salary', () => {

  // ── Response shape ──────────────────────────────────────────────────────────
  describe('response shape', () => {
    it('should return the expected fields', async () => {
      await seedMany(EMPLOYEES);

      const res = await request(app)
        .get('/api/v1/metrics/salary?country=IN')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;
      expect(data).toHaveProperty('country');
      expect(data).toHaveProperty('taxRate');
      expect(data).toHaveProperty('totalEmployees');
      expect(data).toHaveProperty('totalGrossSalary');
      expect(data).toHaveProperty('totalNetSalary');
      expect(data).toHaveProperty('averageGrossSalary');
      expect(data).toHaveProperty('averageNetSalary');
      expect(data).toHaveProperty('minGrossSalary');
      expect(data).toHaveProperty('maxGrossSalary');
    });
  });

  // ── India (IN, 10% tax) ─────────────────────────────────────────────────────
  describe('country=IN (10% tax)', () => {
    it('should compute correct aggregate figures for India', async () => {
      // Only seed two IN employees for deterministic math
      await seedMany([
        { name: 'A', email: 'a@x.com', jobTitle: 'Dev', country: 'IN', salary: 100000 },
        { name: 'B', email: 'b@x.com', jobTitle: 'Dev', country: 'IN', salary: 50000  },
        // This US employee must NOT appear in IN results
        { name: 'C', email: 'c@x.com', jobTitle: 'Dev', country: 'US', salary: 999999 },
      ]);

      // totalGross = 150000 | taxRate = 0.10 | totalNet = 135000
      // avgGross   = 75000  | avgNet  = 67500
      // min = 50000 | max = 100000

      const res = await request(app)
        .get('/api/v1/metrics/salary?country=IN')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        country:            'IN',
        taxRate:            0.10,
        totalEmployees:     2,
        totalGrossSalary:   150000,
        totalNetSalary:     135000,
        averageGrossSalary: 75000,
        averageNetSalary:   67500,
        minGrossSalary:     50000,
        maxGrossSalary:     100000,
      });
    });
  });

  // ── US (12% tax) ────────────────────────────────────────────────────────────
  describe('country=US (12% tax)', () => {
    it('should compute correct aggregate figures for US', async () => {
      await seedMany([
        { name: 'A', email: 'a@x.com', jobTitle: 'Dev', country: 'US', salary: 100000 },
        { name: 'B', email: 'b@x.com', jobTitle: 'Dev', country: 'US', salary: 100000 },
        // IN employee must NOT appear in US results
        { name: 'C', email: 'c@x.com', jobTitle: 'Dev', country: 'IN', salary: 999999 },
      ]);

      // taxRate = 0.12 | netPerEmployee = 88000 | totalNet = 176000

      const res = await request(app)
        .get('/api/v1/metrics/salary?country=US')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        country:          'US',
        taxRate:          0.12,
        totalEmployees:   2,
        totalGrossSalary: 200000,
        totalNetSalary:   176000,
      });
    });
  });

  // ── No employees for that country ────────────────────────────────────────────
  describe('when no employees exist for the given country', () => {
    it('should return zeros for all aggregate fields', async () => {
      // Seed employees for a different country
      await seedMany([
        { name: 'A', email: 'a@x.com', jobTitle: 'Dev', country: 'US', salary: 100000 },
      ]);

      const res = await request(app)
        .get('/api/v1/metrics/salary?country=IN')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        totalEmployees:     0,
        totalGrossSalary:   0,
        totalNetSalary:     0,
        averageGrossSalary: 0,
        averageNetSalary:   0,
        minGrossSalary:     0,
        maxGrossSalary:     0,
      });
    });
  });

  // ── Missing / invalid params ────────────────────────────────────────────────
  describe('validation', () => {
    it('should return 400 when country is missing', async () => {
      const res = await request(app)
        .get('/api/v1/metrics/salary')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/country/i);
    });

    it('should return 400 when country is an empty string', async () => {
      const res = await request(app)
        .get('/api/v1/metrics/salary?country=')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/country/i);
    });
  });
});

// ─── GET /api/v1/metrics/job ──────────────────────────────────────────────────
//
// Returns employee count + salary stats for all employees whose
// `jobTitle` field contains the given title (case-insensitive partial match).
//
describe('GET /api/v1/metrics/job', () => {

  // ── Response shape ──────────────────────────────────────────────────────────
  describe('response shape', () => {
    it('should return the expected fields', async () => {
      await seedMany(EMPLOYEES);

      const res = await request(app)
        .get('/api/v1/metrics/job?title=Software Engineer')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('totalEmployees');
      expect(data).toHaveProperty('averageSalary');
      expect(data).toHaveProperty('minSalary');
      expect(data).toHaveProperty('maxSalary');
      expect(data).toHaveProperty('employees');
      expect(Array.isArray(data.employees)).toBe(true);
    });
  });

  // ── Matching employees ──────────────────────────────────────────────────────
  describe('when matching employees exist', () => {
    it('should return only employees whose jobTitle contains the title', async () => {
      await seedMany(EMPLOYEES);

      const res = await request(app)
        .get('/api/v1/metrics/job?title=Software Engineer')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      // Alice + Bob are Software Engineers
      expect(res.body.data.totalEmployees).toBe(2);
      expect(res.body.data.employees.every(
        (e) => e.jobTitle.toLowerCase().includes('software engineer')
      )).toBe(true);
    });

    it('should compute correct salary aggregates for the matching group', async () => {
      await seedMany(EMPLOYEES); // Alice=120k, Bob=80k → avg=100k, min=80k, max=120k

      const res = await request(app)
        .get('/api/v1/metrics/job?title=Software Engineer')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        totalEmployees: 2,
        averageSalary:  100000,
        minSalary:      80000,
        maxSalary:      120000,
      });
    });

    it('should match case-insensitively (title=software engineer)', async () => {
      await seedMany(EMPLOYEES);

      const res = await request(app)
        .get('/api/v1/metrics/job?title=software engineer')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.totalEmployees).toBe(2);
    });

    it('should support partial title matches (title=Software)', async () => {
      await seedMany(EMPLOYEES);

      const res = await request(app)
        .get('/api/v1/metrics/job?title=Software')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      // "Software Engineer" contains "Software"
      expect(res.body.data.totalEmployees).toBe(2);
    });
  });

  // ── No matching employees ───────────────────────────────────────────────────
  describe('when no employees match', () => {
    it('should return zero totals and an empty employees array', async () => {
      await seedMany(EMPLOYEES);

      const res = await request(app)
        .get('/api/v1/metrics/job?title=Marketing')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        totalEmployees: 0,
        averageSalary:  0,
        minSalary:      0,
        maxSalary:      0,
      });
      expect(res.body.data.employees).toHaveLength(0);
    });
  });

  // ── Missing / invalid params ────────────────────────────────────────────────
  describe('validation', () => {
    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .get('/api/v1/metrics/job')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/title/i);
    });

    it('should return 400 when title is an empty string', async () => {
      const res = await request(app)
        .get('/api/v1/metrics/job?title=')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/title/i);
    });
  });
});
