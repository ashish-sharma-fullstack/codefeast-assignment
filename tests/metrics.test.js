'use strict';

const request = require('supertest');
const app    = require('../src/app');
const prisma = require('../src/utils/prisma');

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const seedMany = (employees) =>
  Promise.all(employees.map((data) => prisma.employee.create({ data })));

const EMPLOYEES = [
  { name: 'Alice Dev',    email: 'alice@example.com',   department: 'Engineering',     salary: 120000 },
  { name: 'Bob Dev',      email: 'bob@example.com',     department: 'Engineering',     salary: 80000  },
  { name: 'Carol HR',     email: 'carol@example.com',   department: 'HR',              salary: 60000  },
  { name: 'Dave Finance', email: 'dave@example.com',    department: 'Finance',         salary: 90000  },
  { name: 'Eve Ops',      email: 'eve@example.com',     department: 'Operations',      salary: 50000  },
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
// Returns aggregate salary stats for ALL employees,
// with net-salary figures computed via the given country's tax rate.
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

  // ── India (IN, 30% tax) ─────────────────────────────────────────────────────
  describe('country=IN (30% tax)', () => {
    it('should compute correct aggregate figures for India', async () => {
      // Only seed two employees for deterministic math
      await seedMany([
        { name: 'A', email: 'a@x.com', department: 'Eng', salary: 100000 },
        { name: 'B', email: 'b@x.com', department: 'Eng', salary: 50000  },
      ]);

      // totalGross = 150000 | taxRate = 0.30 | totalNet = 105000
      // avgGross   = 75000  | avgNet  = 52500
      // min = 50000 | max = 100000

      const res = await request(app)
        .get('/api/v1/metrics/salary?country=IN')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        country:           'IN',
        taxRate:           0.30,
        totalEmployees:    2,
        totalGrossSalary:  150000,
        totalNetSalary:    105000,
        averageGrossSalary: 75000,
        averageNetSalary:  52500,
        minGrossSalary:    50000,
        maxGrossSalary:    100000,
      });
    });
  });

  // ── US (25% tax) ────────────────────────────────────────────────────────────
  describe('country=US (25% tax)', () => {
    it('should compute correct aggregate figures for US', async () => {
      await seedMany([
        { name: 'A', email: 'a@x.com', department: 'Eng', salary: 100000 },
        { name: 'B', email: 'b@x.com', department: 'Eng', salary: 100000 },
      ]);

      // taxRate = 0.25 | netPerEmployee = 75000 | totalNet = 150000

      const res = await request(app)
        .get('/api/v1/metrics/salary?country=US')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        country:          'US',
        taxRate:          0.25,
        totalEmployees:   2,
        totalGrossSalary: 200000,
        totalNetSalary:   150000,
      });
    });
  });

  // ── No employees ────────────────────────────────────────────────────────────
  describe('when no employees exist', () => {
    it('should return zeros for all aggregate fields', async () => {
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
// `department` field contains the given title (case-insensitive partial match).
//
describe('GET /api/v1/metrics/job', () => {

  // ── Response shape ──────────────────────────────────────────────────────────
  describe('response shape', () => {
    it('should return the expected fields', async () => {
      await seedMany(EMPLOYEES);

      const res = await request(app)
        .get('/api/v1/metrics/job?title=Engineering')
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
    it('should return only employees whose department contains the title', async () => {
      await seedMany(EMPLOYEES);

      const res = await request(app)
        .get('/api/v1/metrics/job?title=Engineering')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      // Alice + Bob are in Engineering
      expect(res.body.data.totalEmployees).toBe(2);
      expect(res.body.data.employees.every(
        (e) => e.department.toLowerCase().includes('engineering')
      )).toBe(true);
    });

    it('should compute correct salary aggregates for the matching group', async () => {
      await seedMany(EMPLOYEES); // Alice=120k, Bob=80k → avg=100k, min=80k, max=120k

      const res = await request(app)
        .get('/api/v1/metrics/job?title=Engineering')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        totalEmployees: 2,
        averageSalary:  100000,
        minSalary:      80000,
        maxSalary:      120000,
      });
    });

    it('should match case-insensitively (title=engineering)', async () => {
      await seedMany(EMPLOYEES);

      const res = await request(app)
        .get('/api/v1/metrics/job?title=engineering')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.totalEmployees).toBe(2);
    });

    it('should support partial title matches (title=Eng)', async () => {
      await seedMany(EMPLOYEES);

      const res = await request(app)
        .get('/api/v1/metrics/job?title=Eng')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      // "Engineering" contains "Eng"
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
