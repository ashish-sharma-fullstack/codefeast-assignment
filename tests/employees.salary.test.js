'use strict';

const request = require('supertest');
const app    = require('../src/app');
const prisma = require('../src/utils/prisma');

// ─── Seed helper ──────────────────────────────────────────────────────────────

const seed = (overrides = {}) =>
  prisma.employee.create({
    data: {
      name:     'Tax Test Employee',
      email:    'tax.test@example.com',
      jobTitle: 'Finance Analyst',
      country:  'IN',
      salary:   100000,               // round number makes tax assertions trivial
      ...overrides,
    },
  });

// ─── Shared lifecycle ─────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.employee.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─── GET /api/v1/employees/:id/salary ─────────────────────────────────────────
//
// Tax rules the implementation must apply:
//   India (IN)  → 10 % flat tax
//   US    (US)  → 12 % flat tax
//   Other       →  0 % (no deduction, net = gross)
//
describe('GET /api/v1/employees/:id/salary', () => {

  // ── Response shape ──────────────────────────────────────────────────────────
  describe('response shape', () => {
    it('should return the expected envelope fields', async () => {
      const employee = await seed();

      const res = await request(app)
        .get(`/api/v1/employees/${employee.id}/salary?country=IN`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;
      expect(data).toHaveProperty('employeeId');
      expect(data).toHaveProperty('grossSalary');
      expect(data).toHaveProperty('country');
      expect(data).toHaveProperty('taxRate');
      expect(data).toHaveProperty('taxAmount');
      expect(data).toHaveProperty('netSalary');
    });
  });

  // ── India ───────────────────────────────────────────────────────────────────
  describe('India (country=IN)', () => {
    it('should apply 10% tax and return correct net salary', async () => {
      const employee = await seed({ salary: 100000 });

      const res = await request(app)
        .get(`/api/v1/employees/${employee.id}/salary?country=IN`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        employeeId:  employee.id,
        grossSalary: 100000,
        country:     'IN',
        taxRate:     0.10,
        taxAmount:   10000,
        netSalary:   90000,
      });
    });

    it('should work with lower-case "in" country code', async () => {
      const employee = await seed();

      const res = await request(app)
        .get(`/api/v1/employees/${employee.id}/salary?country=in`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.taxRate).toBe(0.10);
    });
  });

  // ── United States ───────────────────────────────────────────────────────────
  describe('United States (country=US)', () => {
    it('should apply 12% tax and return correct net salary', async () => {
      const employee = await seed({ salary: 100000 });

      const res = await request(app)
        .get(`/api/v1/employees/${employee.id}/salary?country=US`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        employeeId:  employee.id,
        grossSalary: 100000,
        country:     'US',
        taxRate:     0.12,
        taxAmount:   12000,
        netSalary:   88000,
      });
    });
  });

  // ── Other countries ─────────────────────────────────────────────────────────
  describe('other countries (default 0% tax)', () => {
    it('should apply 0% tax for GB (net = gross)', async () => {
      const employee = await seed({ salary: 100000 });

      const res = await request(app)
        .get(`/api/v1/employees/${employee.id}/salary?country=GB`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        country:   'GB',
        taxRate:   0.00,
        taxAmount: 0,
        netSalary: 100000,
      });
    });

    it('should apply 0% tax for DE (net = gross)', async () => {
      const employee = await seed({ salary: 200000 });

      const res = await request(app)
        .get(`/api/v1/employees/${employee.id}/salary?country=DE`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        country:   'DE',
        taxRate:   0.00,
        taxAmount: 0,
        netSalary: 200000,
      });
    });
  });

  // ── Missing country ─────────────────────────────────────────────────────────
  describe('missing country query param', () => {
    it('should return 400 when country is not provided', async () => {
      const employee = await seed();

      const res = await request(app)
        .get(`/api/v1/employees/${employee.id}/salary`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/country/i);
    });
  });

  // ── Employee not found ──────────────────────────────────────────────────────
  describe('employee not found', () => {
    it('should return 404 when the employee id does not exist', async () => {
      const res = await request(app)
        .get('/api/v1/employees/999999/salary?country=IN')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
    });
  });

  // ── Invalid id ───────────────────────────────────────────────────────────────
  describe('invalid id', () => {
    it('should return 400 when id is not a number', async () => {
      const res = await request(app)
        .get('/api/v1/employees/abc/salary?country=IN')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/id/i);
    });
  });
});
