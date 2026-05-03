'use strict';

const request = require('supertest');
const app    = require('../src/app');
const prisma = require('../src/utils/prisma');

// ─── Seed helper ──────────────────────────────────────────────────────────────

const BASE = {
  name:       'Edge Test',
  email:      'edge@example.com',
  department: 'QA',
  salary:     60000,
};

const seed = (overrides = {}) =>
  prisma.employee.create({ data: { ...BASE, ...overrides } });

// ─── Shared lifecycle ─────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.employee.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─── POST edge cases ──────────────────────────────────────────────────────────
describe('POST /api/v1/employees — edge cases', () => {

  // ── Duplicate email ─────────────────────────────────────────────────────────
  describe('duplicate email', () => {
    it('should return 409 when the email already exists', async () => {
      await seed();                              // first record with edge@example.com

      const res = await request(app)
        .post('/api/v1/employees')
        .send({ ...BASE, name: 'Other Person' }) // same email, different name
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/email/i);
    });
  });

  // ── Payload tolerance ───────────────────────────────────────────────────────
  describe('payload tolerance', () => {
    it('should ignore unknown extra fields and still return 201', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ ...BASE, unknownField: 'should be ignored', role: 'admin' })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(201);
      expect(res.body.data).not.toHaveProperty('unknownField');
      expect(res.body.data).not.toHaveProperty('role');
    });

    it('should accept a float salary', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ ...BASE, salary: 75000.50 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(201);
      expect(res.body.data.salary).toBe(75000.50);
    });

    it('should persist the salary exactly as provided', async () => {
      const salary = 123456.78;
      const post = await request(app)
        .post('/api/v1/employees')
        .send({ ...BASE, salary })
        .set('Accept', 'application/json');

      const get = await request(app)
        .get(`/api/v1/employees/${post.body.data.id}`)
        .set('Accept', 'application/json');

      expect(get.body.data.salary).toBe(salary);
    });
  });

  // ── String edge cases ───────────────────────────────────────────────────────
  describe('string field edge cases', () => {
    it('should return 400 when name is only whitespace', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ ...BASE, name: '   ' })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/name/i);
    });

    it('should return 400 when salary is a string', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ ...BASE, salary: 'fifty thousand' })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/salary/i);
    });
  });
});

// ─── GET /employees — ordering ────────────────────────────────────────────────
describe('GET /api/v1/employees — ordering', () => {

  it('should return employees ordered by createdAt descending (newest first)', async () => {
    // Create sequentially so createdAt timestamps differ
    const first  = await seed({ email: 'first@example.com',  name: 'First'  });
    const second = await seed({ email: 'second@example.com', name: 'Second' });
    const third  = await seed({ email: 'third@example.com',  name: 'Third'  });

    const res = await request(app)
      .get('/api/v1/employees')
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(200);
    const ids = res.body.data.map((e) => e.id);

    // Newest (third) should appear first
    expect(ids[0]).toBe(third.id);
    expect(ids[1]).toBe(second.id);
    expect(ids[2]).toBe(first.id);
  });
});

// ─── PUT edge cases ───────────────────────────────────────────────────────────
describe('PUT /api/v1/employees/:id — edge cases', () => {

  describe('duplicate email', () => {
    it('should return 409 when updating to an email already used by another employee', async () => {
      const first  = await seed({ email: 'first@example.com'  });
      const second = await seed({ email: 'second@example.com' });

      const res = await request(app)
        .put(`/api/v1/employees/${second.id}`)
        .send({ email: first.email })   // try to steal first's email
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/email/i);
    });

    it('should allow updating an employee with its own current email (no-op on email)', async () => {
      const employee = await seed();

      const res = await request(app)
        .put(`/api/v1/employees/${employee.id}`)
        .send({ email: employee.email, salary: 70000 })
        .set('Accept', 'application/json');

      // Same email + new salary → should succeed
      expect(res.statusCode).toBe(200);
      expect(res.body.data.salary).toBe(70000);
    });
  });
});

// ─── Metrics edge cases ───────────────────────────────────────────────────────
describe('GET /api/v1/metrics — single-employee edge cases', () => {

  describe('salary metrics with exactly one employee', () => {
    it('min, max and average gross salary should all equal the single employee salary', async () => {
      await seed({ salary: 80000 });

      const res = await request(app)
        .get('/api/v1/metrics/salary?country=IN')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        totalEmployees:     1,
        minGrossSalary:     80000,
        maxGrossSalary:     80000,
        averageGrossSalary: 80000,
        totalGrossSalary:   80000,
        totalNetSalary:     56000,   // 80000 * 0.70 (30% IN tax)
        averageNetSalary:   56000,
      });
    });
  });

  describe('job metrics with exactly one employee', () => {
    it('min, max and average salary should all equal the single employee salary', async () => {
      await seed({ department: 'Engineering', salary: 90000 });

      const res = await request(app)
        .get('/api/v1/metrics/job?title=Engineering')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        totalEmployees: 1,
        averageSalary:  90000,
        minSalary:      90000,
        maxSalary:      90000,
      });
      expect(res.body.data.employees).toHaveLength(1);
    });
  });
});
